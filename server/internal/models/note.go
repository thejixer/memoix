package models

import "time"

type NoteEntity struct {
	ID      uint64
	UserID  uint64
	Content string
	Date    time.Time
}

// It's Either Note or Expense
type EntryEntity struct {
	ID      uint64
	UserID  uint64
	Content string
	Amount  *float64
	Date    time.Time
	Type    string
}

// ######### DTOS #########
type CreateNoteDto struct {
	Content string    `json:"content" validate:"required"`
	Date    time.Time `json:"date" validate:"required"`
}

type TagUsageDto struct {
	Name       string `json:"name"`
	UsageCount uint64 `json:"usage_count"`
}

type MentionUsageDto struct {
	ID         uint64 `json:"id"`
	Name       string `json:"name"`
	UsageCount uint64 `json:"usage_count"`
}

type EntryDto struct {
	ID      uint64    `json:"id"`
	Content string    `json:"content"`
	Amount  *float64  `json:"amount,omitempty"` // Nullable for notes
	Date    time.Time `json:"date"`
	Type    string    `json:"type"` // "note" or "expense"
}
