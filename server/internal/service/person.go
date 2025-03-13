package service

import (
	"context"
	"fmt"
	"io"
	"math/rand"
	"memoix-server/internal/apperrors"
	"memoix-server/internal/models"
	"mime/multipart"
	"os"
	"path/filepath"
	"time"
)

type IPersonRepository interface {
	Create(ctx context.Context, name string, userID uint64) (*models.PersonEntity, error)
	Query(ctx context.Context, text string, userID uint64) ([]*models.PersonEntity, error)
	FindById(ctx context.Context, id, userID uint64) (*models.PersonEntity, error)
	SetAvatar(ctx context.Context, avatar string, personID, userID uint64) (bool, error)
	UpdateName(ctx context.Context, oldName, newName string, userID uint64) (bool, error)
}

type PersonService struct {
	dbStore    IdbStore
	redisStore IRedisStore
}

func NewPersonService(dbStore IdbStore, redisStore IRedisStore) *PersonService {
	return &PersonService{
		dbStore:    dbStore,
		redisStore: redisStore,
	}
}

func (s *PersonService) CreatePerson(ctx context.Context, name string, userID uint64) (*models.PersonEntity, error) {

	person, err := s.dbStore.PersonRepo().Create(ctx, name, userID)
	if err != nil {
		return nil, fmt.Errorf("error in PersonService.CreatePerson: %w", err)
	}
	return person, nil
}

func (s *PersonService) Query(ctx context.Context, text string, userID uint64) ([]*models.PersonEntity, error) {
	persons, err := s.dbStore.PersonRepo().Query(ctx, text, userID)
	if err != nil {
		return nil, fmt.Errorf("error in PersonService.Query: %w", err)
	}
	return persons, nil
}

func (s *PersonService) FindById(ctx context.Context, id, userID uint64) (*models.PersonEntity, error) {
	person, err := s.dbStore.PersonRepo().FindById(ctx, id, userID)
	if err != nil {
		return nil, fmt.Errorf("error in PersonService.FindById: %w", err)
	}
	return person, err
}

func (s *PersonService) generateFileName(personID uint64, ext string) string {
	// Generate a timestamp
	timestamp := time.Now().Unix()

	// Generate a random 6-digit number
	randomNum := rand.Intn(900000) + 100000 // Ensures a 6-digit number

	// Format the new file name
	newFileName := fmt.Sprintf("%d_%d_%d%s", timestamp, randomNum, personID, ext)

	return newFileName
}

func (s *PersonService) UploadAvatar(ctx context.Context, file *multipart.FileHeader, person *models.PersonEntity, userID uint64) (bool, error) {

	uploadDir := fmt.Sprintf("public/%v", userID)
	src, err := file.Open()
	if err != nil {
		return false, fmt.Errorf("error in PersonService.UploadAvatar: %w", err)
	}
	defer src.Close()

	if err := os.MkdirAll(uploadDir, os.ModePerm); err != nil {
		return false, fmt.Errorf("error in PersonService.UploadAvatar: Failed to create upload directory: %w", err)
	}

	ext := filepath.Ext(file.Filename)

	newFileName := s.generateFileName(person.ID, ext)

	path := filepath.Join(uploadDir, newFileName)

	dst, err := os.Create(path)
	if err != nil {
		return false, fmt.Errorf("error in PersonService.UploadAvatar: Failed to create file: %w", err)
	}
	defer dst.Close()

	if _, err = io.Copy(dst, src); err != nil {
		return false, fmt.Errorf("error in PersonService.UploadAvatar: Failed to save file: %w", err)
	}

	avatar := fmt.Sprintf("%v/%v", userID, newFileName)
	ok, err := s.dbStore.PersonRepo().SetAvatar(ctx, avatar, person.ID, userID)
	if err != nil || !ok {
		return false, fmt.Errorf("error in PersonService.UploadAvatar: %w", err)
	}

	return true, nil
}

func (s *PersonService) UpdateName(ctx context.Context, oldName, newName string, userID uint64) (bool, error) {
	ok, err := s.dbStore.PersonRepo().UpdateName(ctx, oldName, newName, userID)
	if err != nil {
		return false, fmt.Errorf("error in PersonService.UpdateName: %w", err)
	}
	if !ok {
		return false, fmt.Errorf("error in PersonService.UpdateName: %w", apperrors.ErrUnexpected)
	}

	return true, nil
}
