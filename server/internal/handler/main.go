package handler

import (
	"memoix-server/internal/apperrors"
	"memoix-server/internal/models"
	"memoix-server/internal/utils"
	"net/http"
	"strings"

	"github.com/labstack/echo/v4"
)

type IService interface {
	AuthService() IAuthService
	PersonService() IPersonService
	NoteService() INoteService
}

type Handler struct {
	Service IService
}

func NewHandler(service IService) *Handler {
	return &Handler{
		Service: service,
	}
}

func WriteReponse(c echo.Context, s int, m string) error {
	return c.JSON(s, models.ResponseDTO{Msg: m, StatusCode: s})
}

func (h *Handler) HandleHelloWorld(c echo.Context) error {
	return c.String(http.StatusOK, "Hello World, from Memoix")
}

func GetToken(c echo.Context) (string, error) {
	req := c.Request()
	authSlice := req.Header["Authorization"]

	if len(authSlice) == 0 {
		return "", apperrors.ErrMissingToken
	}

	s := strings.Split(authSlice[0], " ")

	if len(s) != 2 || s[0] != "ut" {
		return "", apperrors.ErrBadTokenFormat
	}

	return s[1], nil
}

func GetRequester(c echo.Context, h *Handler) (*models.UserEntity, error) {
	tokenString, err := GetToken(c)
	if err != nil {
		return nil, apperrors.ErrUnauthorized
	}
	id, err := utils.ParseToken(tokenString)
	if err != nil {
		return nil, apperrors.ErrUnauthorized
	}
	ctx := c.Request().Context()

	requester, err := h.Service.AuthService().GetUserByID(ctx, id)
	if err != nil {
		return nil, apperrors.ErrUnauthorized
	}

	return requester, nil
}
