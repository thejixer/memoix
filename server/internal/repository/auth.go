package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"memoix-server/internal/apperrors"
	"memoix-server/internal/models"
	"memoix-server/internal/service"
	"time"

	"github.com/lib/pq"
)

func (s *PostgresStore) createUserTable() error {

	query := `
		create table if not exists users (
			id SERIAL PRIMARY KEY,
			name VARCHAR(100),
			phone_number VARCHAR(20) UNIQUE,
			created_at TIMESTAMPTZ
		);
	`

	_, err := s.db.Exec(query)

	return err
}

type AuthRepo struct {
	db *sql.DB
}

func NewAuthRepo(db *sql.DB) *AuthRepo {
	return &AuthRepo{
		db: db,
	}
}

func (s *PostgresStore) AuthRepo() service.IAuthRepository {
	return s.authRepo
}

func (r *AuthRepo) CreateUser(ctx context.Context, phoneNumber string) (*models.UserEntity, error) {

	NewUser := &models.UserEntity{
		Name:        "",
		PhoneNumber: phoneNumber,
		CreatedAt:   time.Now().UTC(),
	}

	query := `
	INSERT INTO users (name, phone_number, created_at)
	VALUES ($1, $2, $3) RETURNING id`

	lastInsertId := 0
	insertErr := r.db.QueryRowContext(
		ctx,
		query,
		NewUser.Name,
		NewUser.PhoneNumber,
		NewUser.CreatedAt,
	).Scan(&lastInsertId)

	if insertErr != nil {
		var pqErr *pq.Error
		PGDuplicateKeyErrorCode := pq.ErrorCode("23505")

		if errors.As(insertErr, &pqErr) {
			switch pqErr.Code {
			case PGDuplicateKeyErrorCode:
				return nil, fmt.Errorf("error in authRepo.createUser: %w: %v", apperrors.ErrDuplicatePhone, insertErr)
			}

		}

		return nil, fmt.Errorf("error in authRepo.createUser: %w", insertErr)

	}

	NewUser.ID = uint64(lastInsertId)

	return NewUser, nil
}

func (r *AuthRepo) GetUserByPhoneNumber(ctx context.Context, phoneNumber string) (*models.UserEntity, error) {

	rows, err := r.db.QueryContext(ctx, "SELECT * FROM users WHERE phone_number = $1", phoneNumber)

	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		return ScanIntoUserEntity(rows)
	}

	return nil, apperrors.ErrNotFound
}
func (r *AuthRepo) GetUserByID(ctx context.Context, id uint64) (*models.UserEntity, error) {
	rows, err := r.db.QueryContext(ctx, "SELECT * FROM users WHERE id = $1", id)

	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		return ScanIntoUserEntity(rows)
	}

	return nil, apperrors.ErrNotFound
}

func ScanIntoUserEntity(rows *sql.Rows) (*models.UserEntity, error) {
	u := new(models.UserEntity)
	if err := rows.Scan(
		&u.ID,
		&u.Name,
		&u.PhoneNumber,
		&u.CreatedAt,
	); err != nil {
		return nil, err
	}
	return u, nil
}
