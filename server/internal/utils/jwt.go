package utils

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"io"
	"os"

	"github.com/golang-jwt/jwt/v5"
)

// EncryptID encrypts the ID using AES-GCM
func EncryptID(id uint64, secretKey string) (string, error) {

	key, err := base64.StdEncoding.DecodeString(secretKey) // Decode Base64 key
	if err != nil {
		return "", fmt.Errorf("error decoding secretKey: %w", err)
	}

	// Ensure key is 16, 24, or 32 bytes
	if len(key) != 16 && len(key) != 24 && len(key) != 32 {
		return "", fmt.Errorf("invalid key length: %d (must be 16, 24, or 32 bytes)", len(key))
	}

	block, err := aes.NewCipher([]byte(key))
	if err != nil {
		return "", fmt.Errorf("error in utils.EncryptID: %w", err)
	}

	nonce := make([]byte, 12) // 12 bytes for GCM
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", fmt.Errorf("error in utils.EncryptID: %w", err)
	}

	aesGCM, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("error in utils.EncryptID: %w", err)
	}

	encrypted := aesGCM.Seal(nil, nonce, []byte(fmt.Sprintf("%d", id)), nil)
	finalData := append(nonce, encrypted...) // Store nonce + encrypted data
	return base64.StdEncoding.EncodeToString(finalData), nil
}

func DecryptID(encryptedID, secretKey string) (uint64, error) {
	// Decode the Base64 key
	key, err := base64.StdEncoding.DecodeString(secretKey)
	if err != nil {
		return 0, fmt.Errorf("error decoding secretKey: %w", err)
	}

	// Ensure key length is correct
	if len(key) != 16 && len(key) != 24 && len(key) != 32 {
		return 0, fmt.Errorf("invalid key length: %d (must be 16, 24, or 32 bytes)", len(key))
	}

	// Decode the Base64-encoded encrypted data
	data, err := base64.StdEncoding.DecodeString(encryptedID)
	if err != nil {
		return 0, fmt.Errorf("error decoding encryptedID: %w", err)
	}

	// Extract nonce and ciphertext
	nonce, cipherText := data[:12], data[12:]

	// Create AES cipher block
	block, err := aes.NewCipher(key)
	if err != nil {
		return 0, fmt.Errorf("error creating cipher: %w", err)
	}

	// Create AES-GCM instance
	aesGCM, err := cipher.NewGCM(block)
	if err != nil {
		return 0, fmt.Errorf("error creating GCM: %w", err)
	}

	// Decrypt the data
	plainText, err := aesGCM.Open(nil, nonce, cipherText, nil)
	if err != nil {
		return 0, fmt.Errorf("error decrypting: %w", err)
	}

	// Convert decrypted text to uint64
	var id uint64
	fmt.Sscanf(string(plainText), "%d", &id)
	return id, nil
}

func SignToken(id uint64) (string, error) {

	secret := os.Getenv("JWT_SECRET")
	encryptionKey := os.Getenv("ENCRYPTION_KEY") // 32-byte AES key

	// Encrypt the ID
	encryptedID, err := EncryptID(id, encryptionKey)
	if err != nil {
		return "", fmt.Errorf("error in utils.SignToken: %w", err)
	}

	// Create JWT with encrypted ID
	claims := jwt.MapClaims{
		"jib": encryptedID,
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))

}

// ParseToken extracts and decrypts the ID from a JWT
func ParseToken(tokenString string) (uint64, error) {
	jwtSecret := os.Getenv("JWT_SECRET")
	encryptionKey := os.Getenv("ENCRYPTION_KEY") // 32-byte AES key

	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(jwtSecret), nil
	})

	if err != nil {
		return 0, fmt.Errorf("error in utils.ParseToken: %w", err)
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !token.Valid {
		return 0, fmt.Errorf("invalid token")
	}

	encryptedID, ok := claims["jib"].(string)
	if !ok {
		return 0, fmt.Errorf("invalid ID format")
	}

	// Decrypt the ID
	return DecryptID(encryptedID, encryptionKey)
}
