package models

import "time"

type NoteEntity struct {
	ID      uint64
	UserID  uint64
	Content string
	Date    time.Time
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
