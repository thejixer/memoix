package repository

import (
	"context"
	"database/sql"
	"fmt"
	"memoix-server/internal/models"
	"memoix-server/internal/service"
	"time"
)

func (s *PostgresStore) createExpenseTables() error {

	query := `
		CREATE TABLE if not exists expenses (
			id SERIAL PRIMARY KEY,
			user_id integer NOT NULL,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
			amount DECIMAL(15,2) NOT NULL,
			content TEXT NOT NULL,
			date TIMESTAMP DEFAULT now()
		);

		CREATE TABLE if not exists expense_tags (
			expense_id integer REFERENCES expenses(id) ON DELETE CASCADE,
			tag_id integer REFERENCES tags(id) ON DELETE CASCADE,
			PRIMARY KEY (expense_id, tag_id)
		);

		CREATE TABLE if not exists expense_persons (
			expense_id integer REFERENCES expenses(id) ON DELETE CASCADE,
			person_id integer REFERENCES persons(id) ON DELETE CASCADE,
			PRIMARY KEY (expense_id, person_id)
		);

		CREATE TABLE if not exists expense_places (
			expense_id integer REFERENCES expenses(id) ON DELETE CASCADE,
			place_id integer REFERENCES places(id) ON DELETE CASCADE,
			PRIMARY KEY (expense_id, place_id)
		);
	`
	_, err := s.db.Exec(query)

	return err
}

type ExpenseRepo struct {
	db *sql.DB
}

func NewExpenseRepo(db *sql.DB) *ExpenseRepo {
	return &ExpenseRepo{
		db: db,
	}
}

func (s *PostgresStore) ExpenseRepo() service.IExpenseRepository {
	return s.expenseRepo
}

func (r *ExpenseRepo) Create(ctx context.Context, expense *models.ExpenseEntity, tags, mentions, places []string) (*models.ExpenseEntity, error) {

	tx, err := r.db.Begin()
	if err != nil {
		return nil, fmt.Errorf("error in ExpenseRepo.Create 1: %w", err)
	}
	err = tx.QueryRowContext(ctx, `INSERT INTO expenses (user_id, amount, content, date) VALUES ($1, $2, $3, $4) RETURNING id`, expense.UserID, expense.Amount, expense.Content, expense.Date).Scan(&expense.ID)
	if err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("error in ExpenseRepo.Create 2: %w", err)
	}

	// Insert hashtags
	for _, tag := range tags {
		var tagID int
		err = tx.QueryRowContext(ctx, `
				INSERT INTO tags (name, user_id) 
				VALUES ($1, $2) 
				ON CONFLICT (LOWER(name), user_id) DO UPDATE SET name = EXCLUDED.name
				RETURNING id;
			`, tag, expense.UserID).Scan(&tagID)
		if err != nil {
			tx.Rollback()
			return nil, fmt.Errorf("error in ExpenseRepo.Create 3: %w", err)
		}

		_, err = tx.Exec(`INSERT INTO expense_tags (expense_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, expense.ID, tagID)
		if err != nil {
			tx.Rollback()
			return nil, fmt.Errorf("error in ExpenseRepo.Create 4: %w", err)
		}
	}
	// Insert mentions
	for _, mention := range mentions {
		var personID int
		personName := mention[1:]
		err = tx.QueryRowContext(ctx, `SELECT id FROM persons WHERE name = $1 AND user_id = $2`, personName, expense.UserID).Scan(&personID)
		if err == sql.ErrNoRows {
			// Insert new person if they don't exist
			err = tx.QueryRowContext(ctx, `INSERT INTO persons (name, user_id, avatar, created_at) VALUES ($1, $2, $3, $4) RETURNING id`, personName, expense.UserID, "", time.Now().UTC()).Scan(&personID)
			if err != nil {
				tx.Rollback()
				return nil, fmt.Errorf("error in ExpenseRepo.Create  5: %w", err)
			}
		} else if err != nil {
			tx.Rollback()
			return nil, fmt.Errorf("error in ExpenseRepo.Create 6: %w", err)
		}

		_, err = tx.Exec(`INSERT INTO expense_persons (expense_id, person_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, expense.ID, personID)
		if err != nil {
			tx.Rollback()
			return nil, fmt.Errorf("error in ExpenseRepo.Create 7: %w", err)
		}
	}
	// Insert places
	for _, place := range places {
		var placeID int
		err = tx.QueryRowContext(ctx, `
				INSERT INTO places (name, user_id)
				VALUES ($1, $2) 
				ON CONFLICT (LOWER(name), user_id) DO UPDATE SET name = EXCLUDED.name
				RETURNING id;
			`, place, expense.UserID).Scan(&placeID)
		if err != nil {
			tx.Rollback()
			return nil, fmt.Errorf("error in ExpenseRepo.Create 8: %w", err)
		}

		_, err = tx.Exec(`INSERT INTO expense_places (expense_id, place_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, expense.ID, placeID)
		if err != nil {
			tx.Rollback()
			return nil, fmt.Errorf("error in ExpenseRepo.Create 9: %w", err)
		}

	}

	// Commit transaction
	err = tx.Commit()
	if err != nil {
		return nil, fmt.Errorf("error in noteRepo.Create 10: %w", err)
	}

	return expense, nil

}
