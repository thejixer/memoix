package handler

import (
	"context"
	"errors"
	"memoix-server/internal/apperrors"
	"memoix-server/internal/models"
	"memoix-server/internal/utils"
	"net/http"

	"github.com/labstack/echo/v4"
)

type IAuthService interface {
	GenerateAndStoreOtp(phoneNumber string) (string, error)
	VerifyOTP(phoneNumber, otp string) (bool, error)
	GetUserByPhoneNumber(ctx context.Context, phoneNumber string) (*models.UserEntity, error)
	CreateUser(ctx context.Context, phoneNumber string) (*models.UserEntity, error)
	GetUserByID(ctx context.Context, id uint64) (*models.UserEntity, error)
}

func (h *Handler) HandleRequestOTP(c echo.Context) error {
	body := models.RequestOTPDto{}

	if err := c.Bind(&body); err != nil {
		return WriteReponse(c, http.StatusBadRequest, apperrors.ErrInputRequirements.Error())
	}

	if err := c.Validate(body); err != nil {
		return WriteReponse(c, http.StatusBadRequest, apperrors.ErrInputRequirements.Error())
	}

	normalizedPhone, err := utils.ValidatePhoneNumber(body.PhoneNumber)
	if err != nil {
		return WriteReponse(c, http.StatusBadRequest, apperrors.ErrInputRequirements.Error())
	}

	otp, err := h.Service.AuthService().GenerateAndStoreOtp(normalizedPhone)

	if err != nil {
		return WriteReponse(c, http.StatusInternalServerError, apperrors.ErrInternal.Error())
	}

	if err := utils.SendSMS(normalizedPhone, otp); err != nil {
		return WriteReponse(c, http.StatusInternalServerError, apperrors.ErrUnexpected.Error())
	}

	return c.JSON(http.StatusOK, "ok")

}

func (h *Handler) HandleVerifyOTP(c echo.Context) error {

	body := models.VerifyOTPDto{}

	if err := c.Bind(&body); err != nil {
		return WriteReponse(c, http.StatusBadRequest, apperrors.ErrInputRequirements.Error())
	}

	if err := c.Validate(body); err != nil {
		return WriteReponse(c, http.StatusBadRequest, apperrors.ErrInputRequirements.Error())
	}

	normalizedPhone, err := utils.ValidatePhoneNumber(body.PhoneNumber)
	if err != nil {
		return WriteReponse(c, http.StatusBadRequest, apperrors.ErrInputRequirements.Error())
	}

	ok, err := h.Service.AuthService().VerifyOTP(normalizedPhone, body.OTP)
	if err != nil || !ok {
		if errors.Is(err, apperrors.ErrNotFound) {
			return WriteReponse(c, http.StatusBadRequest, apperrors.ErrInputRequirements.Error())
		}
		if errors.Is(err, apperrors.ErrCodeMismatch) {
			return WriteReponse(c, http.StatusUnauthorized, apperrors.ErrUnauthorized.Error())
		}
		return WriteReponse(c, http.StatusInternalServerError, apperrors.ErrUnexpected.Error())

	}

	ctx := c.Request().Context()

	user, err := h.Service.AuthService().GetUserByPhoneNumber(ctx, normalizedPhone)
	if err != nil {
		return WriteReponse(c, http.StatusInternalServerError, apperrors.ErrUnexpected.Error())
	}

	var userId uint64
	if user == nil {

		// sign up logic
		user, err := h.Service.AuthService().CreateUser(ctx, normalizedPhone)

		if err != nil {
			return WriteReponse(c, http.StatusBadRequest, apperrors.ErrInputRequirements.Error())
		}
		userId = user.ID
	} else {
		// login logic
		userId = user.ID
	}

	tokenString, err := utils.SignToken(userId)
	if err != nil {
		return WriteReponse(c, http.StatusInternalServerError, apperrors.ErrUnexpected.Error())
	}

	return c.JSON(http.StatusOK, &models.TokenDto{Token: tokenString})

}

func (h *Handler) HandleMe(c echo.Context) error {

	requester, err := GetRequester(c, h)
	if err != nil {
		return WriteReponse(c, http.StatusUnauthorized, apperrors.ErrUnauthorized.Error())
	}

	return c.JSON(http.StatusOK, requester)
}
