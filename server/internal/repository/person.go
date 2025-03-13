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

func (r *PersonRepo) Query(ctx context.Context, text string, userID uint64) ([]*models.PersonEntity, error) {
	query := `
		SELECT 
			p.id, 
			p.name,
			p.user_id,
			p.avatar,
			p.created_at,
			COUNT(m.id) AS mention_count
		FROM persons p
		LEFT JOIN mentions m ON p.id = m.person_id
		WHERE p.name ILIKE $1 AND p.user_id = $2
		GROUP BY p.id, p.name
		ORDER BY mention_count DESC;
	`

	str := "%" + strings.ToLower(text) + "%"
	rows, err := r.db.QueryContext(ctx, query, str, userID)
	if err != nil {
		return nil, fmt.Errorf("error in personRepo.Query: %w", err)
	}
	defer rows.Close()

	persons := []*models.PersonEntity{}
	for rows.Next() {
		u := new(models.PersonEntity)
		var count int64
		if err := rows.Scan(
			&u.ID,
			&u.Name,
			&u.UserID,
			&u.Avatar,
			&u.CreatedAt,
			&count,
		); err != nil {
			return nil, fmt.Errorf("error in personRepo.Query: %w", err)
		}
		persons = append(persons, u)
	}
	return persons, nil

}

func (r *PersonRepo) FindById(ctx context.Context, id, userID uint64) (*models.PersonEntity, error) {
	query := `SELECT * FROM persons WHERE id = $1 AND user_id = $2`
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
		SET content = REPLACE(content, '@' || $1, '@' || $2) 
		WHERE content LIKE '%' || '@' || $1 || '%'
		AND user_id = $3
	`
	_, err = tx.ExecContext(ctx, updateNotesQuery, oldName, newName, userID)
	if err != nil {
		tx.Rollback()
		return false, fmt.Errorf("failed to update notes content: %w", err)
	}

	// Commit transaction if everything succeeded
	err = tx.Commit()
	if err != nil {
		return false, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return true, nil
}

func ScanIntoPersons(rows *sql.Rows) (*models.PersonEntity, error) {
	u := new(models.PersonEntity)
	if err := rows.Scan(
		&u.ID,
		&u.Name,
		&u.UserID,
		&u.Avatar,
		&u.CreatedAt,
	); err != nil {
		return nil, err
	}
	return u, nil
}
