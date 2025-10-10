package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"memoix-server/internal/apperrors"
	"memoix-server/internal/models"
	"memoix-server/internal/service"
	"strings"
	"time"

	"github.com/lib/pq"
)

func (s *PostgresStore) createPersonTable() error {

	query := `
		create table if not exists persons (
			id SERIAL PRIMARY KEY,
    	name TEXT NOT NULL,
			user_id integer,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
			avatar TEXT,
			phone_number VARCHAR(20) default '',
			birthday DATE,
			created_at TIMESTAMPTZ,
			UNIQUE (name, user_id)
		);
	`

	_, err := s.db.Exec(query)

	return err
}

type PersonRepo struct {
	db *sql.DB
}

func NewPersonRepo(db *sql.DB) *PersonRepo {
	return &PersonRepo{
		db: db,
	}
}

func (s *PostgresStore) PersonRepo() service.IPersonRepository {
	return s.personRepo
}

func (r *PersonRepo) Create(ctx context.Context, name string, userID uint64) (*models.PersonEntity, error) {
	NewPerson := &models.PersonEntity{
		Name:      strings.ToLower(name),
		UserID:    userID,
		Avatar:    "",
		CreatedAt: time.Now().UTC(),
	}

	query := `
	INSERT INTO persons (name, user_id, avatar, created_at)
	VALUES ($1, $2, $3, $4) RETURNING id`

	lastInsertId := 0
	insertErr := r.db.QueryRowContext(
		ctx,
		query,
		NewPerson.Name,
		NewPerson.UserID,
		NewPerson.Avatar,
		NewPerson.CreatedAt,
	).Scan(&lastInsertId)
	if insertErr != nil {

		var pqErr *pq.Error
		PGDuplicateKeyErrorCode := pq.ErrorCode("23505")

		if errors.As(insertErr, &pqErr) {
			switch pqErr.Code {
			case PGDuplicateKeyErrorCode:
				return nil, fmt.Errorf("error in personRepo.create: %w: %v", apperrors.ErrDuplicatePhone, insertErr)
			}

		}

		return nil, fmt.Errorf("error in personRepo.create: %w", insertErr)

	}

	NewPerson.ID = uint64(lastInsertId)

	return NewPerson, nil
}

func (r *PersonRepo) Query(ctx context.Context, text string, userID uint64, limit, offset *int) ([]*models.PersonEntity, error) {

	query := `
		SELECT
				p.id,
				p.name,
				p.user_id,
				p.avatar,
				p.phone_number,
				p.birthday,
				p.created_at,
				COALESCE(mention_counts.count, 0) AS mention_count,
				COALESCE(expense_counts.count, 0) AS expense_count,
				COALESCE(mention_counts.count, 0) + COALESCE(expense_counts.count, 0) AS total_count
		FROM
				persons p
		LEFT JOIN (
				SELECT person_id, COUNT(*) AS count
				FROM notes_persons
				GROUP BY person_id
		) AS mention_counts ON p.id = mention_counts.person_id
		LEFT JOIN (
				SELECT person_id, COUNT(*) AS count
				FROM expense_persons
				GROUP BY person_id
		) AS expense_counts ON p.id = expense_counts.person_id
		WHERE
				p.name ILIKE $1 AND p.user_id = $2
		ORDER BY
				total_count DESC
	`

	// add pagination if both limit and offset are provided
	args := []any{"%" + strings.ToLower(text) + "%", userID}

	if limit != nil && offset != nil {
		query += " LIMIT $3 OFFSET $4"
		args = append(args, *limit, *offset)
	}

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("error in personRepo.Query: %w", err)
	}
	defer rows.Close()

	persons := []*models.PersonEntity{}
	for rows.Next() {
		u := new(models.PersonEntity)
		var mentionCount, expenseCount, totalCount int64

		if err := rows.Scan(
			&u.ID,
			&u.Name,
			&u.UserID,
			&u.Avatar,
			&u.PhoneNumber,
			&u.Birthday,
			&u.CreatedAt,
			&mentionCount,
			&expenseCount,
			&totalCount,
		); err != nil {
			return nil, fmt.Errorf("error in personRepo.Query scan: %w", err)
		}
		persons = append(persons, u)
	}

	return persons, nil
}

func (r *PersonRepo) FindById(ctx context.Context, id, userID uint64) (*models.PersonEntity, error) {
	query := `SELECT id, name, user_id, avatar, phone_number, birthday, created_at FROM persons WHERE id = $1 AND user_id = $2`
	rows, err := r.db.QueryContext(ctx, query, id, userID)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		return ScanIntoPersons(rows)
	}

	return nil, errors.New("not found")

}

func (r *PersonRepo) SetAvatar(ctx context.Context, avatar string, personID, userID uint64) (bool, error) {
	query := `
		UPDATE persons
		SET avatar = $3
		WHERE id = $1 AND user_id = $2
	`

	_, err := r.db.ExecContext(ctx, query, personID, userID, avatar)

	if err != nil {
		return false, fmt.Errorf("error in personRepo.setAvatar: %w", err)
	}

	return true, nil
}

func (r *PersonRepo) UpdateName(ctx context.Context, oldName, newName string, userID uint64) (bool, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return false, fmt.Errorf("failed to start transaction: %w", err)
	}

	// Step 1: Update the person's name
	updatePersonQuery := `
		UPDATE persons 
		SET name = $1 
		WHERE name = $2 AND user_id = $3
	`
	res, err := tx.ExecContext(ctx, updatePersonQuery, newName, oldName, userID)
	if err != nil {
		tx.Rollback()
		return false, fmt.Errorf("failed to update person name: %w", err)
	}

	// Ensure at least one row was updated
	rowsAffected, err := res.RowsAffected()
	if err != nil {
		tx.Rollback()
		return false, fmt.Errorf("error getting affected rows: %w", err)
	}
	if rowsAffected != 1 {
		tx.Rollback()
		return false, fmt.Errorf("person with name '%s' not found for user %d", oldName, userID)
	}

	// Step 2: Update all notes that mention @oldName to @newName
	updateNotesQuery := `
    UPDATE notes 
    SET content = REGEXP_REPLACE(content, '(@' || $1 || ')(\m)', '@' || $2, 'g')
    WHERE content ~ ('@' || $1 || '\m')
    AND user_id = $3
`
	_, err = tx.ExecContext(ctx, updateNotesQuery, oldName, newName, userID)
	if err != nil {
		tx.Rollback()
		return false, fmt.Errorf("failed to update notes content: %w", err)
	}

	// Step 3: Update all expenses that mention @oldName to @newName
	updateExpensesQuery := `
    UPDATE expenses 
    SET content = REGEXP_REPLACE(content, '(@' || $1 || ')(\m)', '@' || $2, 'g')
    WHERE content ~ ('@' || $1 || '\m')
    AND user_id = $3
`
	_, err = tx.ExecContext(ctx, updateExpensesQuery, oldName, newName, userID)
	if err != nil {
		tx.Rollback()
		return false, fmt.Errorf("failed to update expenses content: %w", err)
	}

	// Commit transaction if everything succeeded
	err = tx.Commit()
	if err != nil {
		return false, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return true, nil
}

func (r *PersonRepo) UpdatePhoneNumber(ctx context.Context, id, userID uint64, phoneNumber string) (bool, error) {
	query := `
		UPDATE persons
		SET phone_number = $1
		WHERE id = $2 AND user_id = $3
	`

	result, err := r.db.ExecContext(ctx, query, phoneNumber, id, userID)
	if err != nil {
		return false, fmt.Errorf("failed to update phone number: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return false, fmt.Errorf("failed to get rows affected: %w", err)
	}

	return rowsAffected > 0, nil
}

func ScanIntoPersons(rows *sql.Rows) (*models.PersonEntity, error) {
	u := new(models.PersonEntity)
	if err := rows.Scan(
		&u.ID,
		&u.Name,
		&u.UserID,
		&u.Avatar,
		&u.PhoneNumber,
		&u.Birthday,
		&u.CreatedAt,
	); err != nil {
		return nil, err
	}
	return u, nil
}
