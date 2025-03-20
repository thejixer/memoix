package models

import "time"

type ExpenseEntity struct {
	ID      uint64    `json:"id"`
	UserID  uint64    `json:"user_id"`
	Amount  string    `json:"amount"`
	Content string    `json:"content"`
	Date    time.Time `json:"date"`
}

// ######### DTOS #########
type CreateExpenseDto struct {
	Amount  string    `json:"amount" validate:"required"`
	Content string    `json:"content" validate:"required"`
	Date    time.Time `json:"date" validate:"required"`
}
