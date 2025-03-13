package models

import "time"

type UserEntity struct {
	ID          uint64
	Name        string
	PhoneNumber string
	CreatedAt   time.Time
}

// ######### DTOS #########
type RequestOTPDto struct {
	PhoneNumber string `json:"phone_number" validate:"required"`
}

type VerifyOTPDto struct {
	PhoneNumber string `json:"phone_number" validate:"required"`
	OTP         string `json:"otp" validate:"required"`
}

type TokenDto struct {
	Token string `json:"token"`
}
