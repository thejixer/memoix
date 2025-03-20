package service

import (
	"context"
	"errors"
	"fmt"
	"memoix-server/internal/models"
	"memoix-server/internal/utils"
	"regexp"
)

type IExpenseRepository interface {
	Create(ctx context.Context, expense *models.ExpenseEntity, tags, mentions, places []string) (*models.ExpenseEntity, error)
}

type ExpenseService struct {
	dbStore IdbStore
}

func NewExpenseService(dbStore IdbStore) *ExpenseService {
	return &ExpenseService{
		dbStore: dbStore,
	}
}

func (s *ExpenseService) validateAmount(amount string) error {
	var amountRegex = regexp.MustCompile(`^\d{1,15}(\.\d{1,2})?$`)
	if !amountRegex.MatchString(amount) {
		return errors.New("invalid amount format")
	}
	return nil
}

func (s *ExpenseService) Create(ctx context.Context, expense *models.ExpenseEntity) (*models.ExpenseEntity, error) {

	if err := s.validateAmount(expense.Amount); err != nil {
		return nil, err
	}

	tags, mentions, places := utils.ExtractEntities(expense.Content)

	e, err := s.dbStore.ExpenseRepo().Create(ctx, expense, tags, mentions, places)
	if err != nil {
		return nil, fmt.Errorf("error in ExpenseService.Create: %w", err)
	}

	return e, nil
}
