package utils

import (
	"math/rand"
	"os"
	"strconv"
	"time"
)

func generateRandomNumericString(length int) string {

	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	var randomString string

	for i := 0; i < length; i++ {
		randomDigit := rng.Intn(10)
		if i == 0 && randomDigit == 0 {
			randomDigit = 9
		}
		randomString += strconv.Itoa(randomDigit)
	}

	return randomString
}

func GenerateOTP() string {
	// for ease of development, the code will be a fixed code in the dev and test environment
	env := os.Getenv("ENVIRONMENT")
	if env == "DEV" || env == "TEST" {
		return "1111"
	}

	return generateRandomNumericString(4)
}
