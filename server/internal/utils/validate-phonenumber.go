package utils

import (
	"errors"
	"fmt"
	"regexp"
)

func ValidatePhoneNumber(value string) (string, error) {
	// Check length constraint
	if value == "" || len(value) > 13 {
		return "", errors.New("provided value is not a valid phone number")
	}

	// Define regex pattern for validating phone number
	re := regexp.MustCompile(`^(\+98|0|0098)?9\d{9}$`)

	// Check if the phone number matches the regex pattern
	if !re.MatchString(value) {
		return "", errors.New("provided value is not a valid phone number")
	}

	// Format the phone number to +98 format
	return fmt.Sprintf("+98%s", value[len(value)-10:]), nil
}
