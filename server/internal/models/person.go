package models

import "time"

type PersonEntity struct {
	ID          uint64
	Name        string
	UserID      uint64
	Avatar      string
	PhoneNumber string
	Birthday    *time.Time
	CreatedAt   time.Time
}

// ######### DTOS #########
type CreatePersonDto struct {
	Name string `json:"name" validate:"required"`
}

type PersonDto struct {
	ID          uint64     `json:"id"`
	Name        string     `json:"name"`
	Avatar      string     `json:"avatar"`
	PhoneNumber string     `json:"phone_number"`
	Birthday    *time.Time `json:"birthday"`
	CreatedAt   time.Time  `json:"created_at"`
}

type UpdateNameDto struct {
	OldName string `json:"old_name" validate:"required"`
	NewName string `json:"new_name" validate:"required"`
}

type UpdatePhoneNumberDto struct {
	ID          uint64 `json:"id"`
	PhoneNumber string `json:"phone_number"`
}
