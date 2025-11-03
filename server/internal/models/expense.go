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

type DailyExpenseDto struct {
	Date  time.Time `json:"date"`
	Total float64   `json:"total"`
}

type ExpenseByTagDto struct {
	Tag   string  `json:"tag"`
	Total float64 `json:"total"`
}
