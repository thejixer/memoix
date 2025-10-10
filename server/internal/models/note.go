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

type TagDto struct {
	Name string `json:"name"`
}

type PlaceDto struct {
	Name string `json:"name"`
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

type QueryStats struct {
	// Core counts
	TotalCount int `json:"total_count"`

	// Temporal boundaries
	FirstDate time.Time `json:"first_date"`
	LastDate  time.Time `json:"last_date"`

	// Gap statistics (in days)
	AverageGap float64 `json:"average_gap"`
	MedianGap  float64 `json:"median_gap"`
	MinGap     float64 `json:"min_gap"`
	MaxGap     float64 `json:"max_gap"`
	StdDevGap  float64 `json:"std_dev_gap"`
}
