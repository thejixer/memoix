package handler

import (
	"context"
	"memoix-server/internal/adapters"
	"memoix-server/internal/apperrors"
	"memoix-server/internal/models"
	"memoix-server/internal/utils"
	"mime/multipart"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
)

type IPersonService interface {
	CreatePerson(ctx context.Context, name string, userID uint64) (*models.PersonEntity, error)
	Query(ctx context.Context, text string, userID uint64, limit, offset *int) ([]*models.PersonEntity, error)
	FindById(ctx context.Context, id, userID uint64) (*models.PersonEntity, error)
	UploadAvatar(ctx context.Context, file *multipart.FileHeader, person *models.PersonEntity, userID uint64) (bool, error)
	UpdateName(ctx context.Context, oldName, newName string, userID uint64) (bool, error)
	UpdatePhoneNumber(ctx context.Context, id, userID uint64, phoneNumber string) (bool, error)
}

func (h *Handler) HandleCreatePerson(c echo.Context) error {

	body := models.CreatePersonDto{}

	if err := c.Bind(&body); err != nil {
		return WriteReponse(c, http.StatusBadRequest, apperrors.ErrInputRequirements.Error())
	}

	if err := c.Validate(body); err != nil {
		return WriteReponse(c, http.StatusBadRequest, apperrors.ErrInputRequirements.Error())
	}

	requester, err := GetRequester(c, h)
	if err != nil {
		return WriteReponse(c, http.StatusUnauthorized, apperrors.ErrUnauthorized.Error())
	}

	ctx := c.Request().Context()

	person, err := h.Service.PersonService().CreatePerson(ctx, body.Name, requester.ID)
	if err != nil {
		return WriteReponse(c, http.StatusBadRequest, apperrors.ErrInputRequirements.Error())
	}

	return c.JSON(http.StatusOK, adapters.MapPersonEntityToDto(person))
}

func (h *Handler) HandleQueryPersons(c echo.Context) error {
	t := c.QueryParam("text")

	requester, err := GetRequester(c, h)
	if err != nil {
		return WriteReponse(c, http.StatusUnauthorized, apperrors.ErrUnauthorized.Error())
	}
	ctx := c.Request().Context()
	limitStr := c.QueryParam("limit")
	pageStr := c.QueryParam("page")

	limitPtr, offsetPtr := utils.ParsePagination(limitStr, pageStr)

	persons, err := h.Service.PersonService().Query(ctx, t, requester.ID, limitPtr, offsetPtr)
	if err != nil {
		return WriteReponse(c, http.StatusBadRequest, apperrors.ErrInputRequirements.Error())
	}

	return c.JSON(http.StatusOK, adapters.MapPersonEntitiesToDto(persons))
}

func (h *Handler) HandleGetPerson(c echo.Context) error {
	id := c.Param("id")
	personId, err := strconv.Atoi(id)
	if err != nil {
		return WriteReponse(c, http.StatusNotFound, "not found")
	}

	requester, err := GetRequester(c, h)
	if err != nil {
		return WriteReponse(c, http.StatusUnauthorized, apperrors.ErrUnauthorized.Error())
	}
	ctx := c.Request().Context()
	person, err := h.Service.PersonService().FindById(ctx, uint64(personId), requester.ID)
	if err != nil {
		return WriteReponse(c, http.StatusNotFound, "not found")
	}
	return c.JSON(http.StatusOK, adapters.MapPersonEntityToDto(person))
}

func (h *Handler) UploadAvatar(c echo.Context) error {

	id := c.Param("id")
	personId, err := strconv.Atoi(id)
	if err != nil {
		return WriteReponse(c, http.StatusNotFound, "not found")
	}
	requester, err := GetRequester(c, h)
	if err != nil {
		return WriteReponse(c, http.StatusUnauthorized, apperrors.ErrUnauthorized.Error())
	}
	ctx := c.Request().Context()
	person, err := h.Service.PersonService().FindById(ctx, uint64(personId), requester.ID)
	if err != nil {
		return WriteReponse(c, http.StatusNotFound, "not found")
	}

	if person.UserID != requester.ID {
		return WriteReponse(c, http.StatusUnauthorized, apperrors.ErrUnauthorized.Error())
	}

	// Get file from request
	file, err := c.FormFile("avatar")
	if err != nil {
		return WriteReponse(c, http.StatusBadRequest, "Invalid file")
	}

	ok, err := h.Service.PersonService().UploadAvatar(ctx, file, person, requester.ID)
	if err != nil || !ok {
		return WriteReponse(c, http.StatusInternalServerError, apperrors.ErrUnexpected.Error())
	}

	return c.JSON(http.StatusOK, "ok")
}

func (h *Handler) HandleUpdateName(c echo.Context) error {

	body := models.UpdateNameDto{}

	if err := c.Bind(&body); err != nil {
		return WriteReponse(c, http.StatusBadRequest, apperrors.ErrInputRequirements.Error())
	}

	if err := c.Validate(body); err != nil {
		return WriteReponse(c, http.StatusBadRequest, apperrors.ErrInputRequirements.Error())
	}

	requester, err := GetRequester(c, h)
	if err != nil {
		return WriteReponse(c, http.StatusUnauthorized, apperrors.ErrUnauthorized.Error())
	}

	ctx := c.Request().Context()
	ok, err := h.Service.PersonService().UpdateName(ctx, body.OldName, body.NewName, requester.ID)
	if err != nil || !ok {
		return WriteReponse(c, http.StatusBadRequest, apperrors.ErrInputRequirements.Error())
	}
	return WriteReponse(c, http.StatusOK, "ok")

}

func (h *Handler) HandleUpdatePersonPhoneNumber(c echo.Context) error {
	body := models.UpdatePhoneNumberDto{}

	if err := c.Bind(&body); err != nil {
		return WriteReponse(c, http.StatusBadRequest, apperrors.ErrInputRequirements.Error())
	}

	if err := c.Validate(body); err != nil {
		return WriteReponse(c, http.StatusBadRequest, apperrors.ErrInputRequirements.Error())
	}

	requester, err := GetRequester(c, h)
	if err != nil {
		return WriteReponse(c, http.StatusUnauthorized, apperrors.ErrUnauthorized.Error())
	}

	ctx := c.Request().Context()
	ok, err := h.Service.PersonService().UpdatePhoneNumber(ctx, body.ID, requester.ID, body.PhoneNumber)
	if err != nil || !ok {
		return WriteReponse(c, http.StatusBadRequest, apperrors.ErrInputRequirements.Error())
	}
	return WriteReponse(c, http.StatusOK, "ok")
}
