package models

import "time"

type PersonEntity struct {
	ID        uint64
	Name      string
	UserID    uint64
	Avatar    string
	CreatedAt time.Time
}

// ######### DTOS #########
type CreatePersonDto struct {
	Name string `json:"name" validate:"required"`
}

type PersonDto struct {
	ID        uint64    `json:"id"`
	Name      string    `json:"name"`
	Avatar    string    `json:"avatar"`
	CreatedAt time.Time `json:"created_at"`
}

type UpdateNameDto struct {
	OldName string `json:"old_name" validate:"required"`
	NewName string `json:"new_name" validate:"required"`
}
