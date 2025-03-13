package repository

import (
	"database/sql"
	"fmt"
	"memoix-server/internal/service"
	"os"

	_ "github.com/lib/pq"
)

type PostgresStore struct {
	db         *sql.DB
	authRepo   service.IAuthRepository
	personRepo service.IPersonRepository
	noteRepo   service.INoteRepository
}

func NewPostgresStore() (*PostgresStore, error) {
	dbName := os.Getenv("DB_NAME")
	dbUser := os.Getenv("DB_USER")
	dbPassword := os.Getenv("DB_PASSWORD")
	dbHost := os.Getenv("DB_HOST")
	conString := fmt.Sprintf("user=%v dbname=%v password=%v sslmode=disable host=%v", dbUser, dbName, dbPassword, dbHost)
	db, err := sql.Open("postgres", conString)

	fmt.Println("conString : ", conString)

	if err != nil {
		return nil, fmt.Errorf("error in db.NewPostgresStore 1: %w", err)
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("error in db.NewPostgresStore 2: %w", err)
	}

	authRepo := NewAuthRepo(db)
	personRepo := NewPersonRepo(db)
	noteRepo := NewNoteRepo(db)

	return &PostgresStore{
		db:         db,
		authRepo:   authRepo,
		personRepo: personRepo,
		noteRepo:   noteRepo,
	}, nil
}

func (s *PostgresStore) Init() error {

	if err := s.createUserTable(); err != nil {
		return fmt.Errorf("error in dbInit.createUserTable: %w", err)
	}

	if err := s.createPersonTable(); err != nil {
		return fmt.Errorf("error in dbInit.createPersonTable: %w", err)
	}

	if err := s.createNoteTables(); err != nil {
		return fmt.Errorf("error in dbInit.createNoteTables: %w", err)
	}

	return nil
}
