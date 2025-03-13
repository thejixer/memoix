package apperrors

import "errors"

var (
	ErrNotFound          = errors.New("not found")
	ErrCodeMismatch      = errors.New("code doesn't match")
	ErrUnexpected        = errors.New("unexpected error")
	ErrMissingToken      = errors.New("missing token")
	ErrBadTokenFormat    = errors.New("bad token format")
	ErrUnauthorized      = errors.New("unauthorized")
	ErrForbidden         = errors.New("forbidden")
	ErrMissingMetaData   = errors.New("missing metadata")
	ErrInternal          = errors.New("internal server error")
	ErrInputRequirements = errors.New("input doesn't meet the requirements")
	ErrDuplicatePhone    = errors.New("duplicate phone number")
)
