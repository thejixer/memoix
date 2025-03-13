package service

import (
	"context"
	"errors"
	"fmt"
	"memoix-server/internal/apperrors"
	"memoix-server/internal/models"
	"memoix-server/internal/utils"
)

type IAuthRepository interface {
	CreateUser(ctx context.Context, phoneNumber string) (*models.UserEntity, error)
	GetUserByPhoneNumber(ctx context.Context, phoneNumber string) (*models.UserEntity, error)
	GetUserByID(ctx context.Context, id uint64) (*models.UserEntity, error)
}

type AuthService struct {
	dbStore    IdbStore
	redisStore IRedisStore
}

func NewAuthService(dbStore IdbStore, redisStore IRedisStore) *AuthService {
	return &AuthService{
		dbStore:    dbStore,
		redisStore: redisStore,
	}
}

func (s *AuthService) GenerateAndStoreOtp(phoneNumber string) (string, error) {
	otp := utils.GenerateOTP()
	err := s.redisStore.SetOTP(phoneNumber, otp)
	if err != nil {
		return "", fmt.Errorf("error in authService.GenerateAndStoreOtp: %w", err)
	}

	return otp, nil
}
func (s *AuthService) VerifyOTP(phoneNumber, otp string) (bool, error) {

	generatedOTP, err := s.redisStore.GetOTP(phoneNumber)
	if err != nil {
		return false, apperrors.ErrNotFound
	}

	if generatedOTP != otp {
		return false, apperrors.ErrCodeMismatch
	}

	go s.redisStore.DelOTP(phoneNumber)

	return true, nil
}
func (s *AuthService) CreateUser(ctx context.Context, phoneNumber string) (*models.UserEntity, error) {
	user, err := s.dbStore.AuthRepo().CreateUser(ctx, phoneNumber)
	if err != nil {
		return nil, err
	}
	return user, nil
}

func (s *AuthService) GetUserByPhoneNumber(ctx context.Context, phoneNumber string) (*models.UserEntity, error) {

	user, err := s.dbStore.AuthRepo().GetUserByPhoneNumber(ctx, phoneNumber)

	if err != nil {
		if errors.Is(err, apperrors.ErrNotFound) {
			// this behaviour is expected
			return nil, nil
		}
		return nil, apperrors.ErrUnexpected
	}

	return user, nil
}

func (s *AuthService) GetUserByID(ctx context.Context, id uint64) (*models.UserEntity, error) {
	user, err := s.dbStore.AuthRepo().GetUserByID(ctx, id)
	if err != nil {
		return nil, apperrors.ErrNotFound
	}
	return user, nil
}
