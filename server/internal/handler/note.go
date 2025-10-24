package handler

import (
	"context"
	"errors"
	"fmt"
	"memoix-server/internal/adapters"
	"memoix-server/internal/apperrors"
	"memoix-server/internal/models"
	"memoix-server/internal/utils"
	"net/http"
	"strconv"
	"time"

	"github.com/labstack/echo/v4"
)

type INoteService interface {
	Create(ctx context.Context, note string, date time.Time, userID uint64) (*models.NoteEntity, error)
	GetTopTags(ctx context.Context, query string, since, until *time.Time, userID uint64) ([]*models.TagUsageDto, error)
	GetTopMentions(ctx context.Context, query string, since, until *time.Time, userID uint64) ([]*models.MentionUsageDto, error)
	QueryTags(ctx context.Context, userId uint64, query string, limit, offset *int) ([]*models.TagDto, error)
	QueryPlaces(ctx context.Context, userId uint64, query string, limit, offset *int) ([]*models.PlaceDto, error)
	GetNotes(ctx context.Context, query string, since, until *time.Time, userID uint64) ([]*models.EntryEntity, error)
	DeleteNote(ctx context.Context, noteID, userID uint64) error
	GetQueryStats(ctx context.Context, query string, since, until *time.Time, userID uint64) (*models.QueryStats, error)
}

func (h *Handler) HandleCreateNote(c echo.Context) error {
	body := models.CreateNoteDto{}

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
	note, err := h.Service.NoteService().Create(ctx, body.Content, body.Date, requester.ID)
	if err != nil {
		return WriteReponse(c, http.StatusBadRequest, apperrors.ErrInputRequirements.Error())
	}
	return c.JSON(http.StatusOK, note)
}

func (h *Handler) HandleGetTopTags(c echo.Context) error {
	query := c.QueryParam("query")
	sinceStr := c.QueryParam("since")
	untilStr := c.QueryParam("until")
	since, until := utils.ParseDateRange(sinceStr, untilStr)
	requester, err := GetRequester(c, h)
	if err != nil {
		return WriteReponse(c, http.StatusUnauthorized, apperrors.ErrUnauthorized.Error())
	}
	ctx := c.Request().Context()
	tags, err := h.Service.NoteService().GetTopTags(ctx, query, since, until, requester.ID)
	if err != nil {
		return WriteReponse(c, http.StatusInternalServerError, apperrors.ErrUnexpected.Error())
	}
	return c.JSON(http.StatusOK, tags)
}

func (h *Handler) HandleQueryTags(c echo.Context) error {
	t := c.QueryParam("text")
	requester, err := GetRequester(c, h)
	if err != nil {
		return WriteReponse(c, http.StatusUnauthorized, apperrors.ErrUnauthorized.Error())
	}
	ctx := c.Request().Context()
	limitStr := c.QueryParam("limit")
	pageStr := c.QueryParam("page")

	limit, offset := utils.ParsePagination(limitStr, pageStr)

	tags, err := h.Service.NoteService().QueryTags(ctx, requester.ID, t, limit, offset)
	if err != nil {
		return WriteReponse(c, http.StatusBadRequest, apperrors.ErrInputRequirements.Error())
	}
	return c.JSON(http.StatusOK, tags)
}
func (h *Handler) HandleQueryPlaces(c echo.Context) error {
	query := c.QueryParam("query")

	requester, err := GetRequester(c, h)
	if err != nil {
		return WriteReponse(c, http.StatusUnauthorized, apperrors.ErrUnauthorized.Error())
	}
	ctx := c.Request().Context()
	limitStr := c.QueryParam("limit")
	pageStr := c.QueryParam("page")

	limit, offset := utils.ParsePagination(limitStr, pageStr)
	places, err := h.Service.NoteService().QueryPlaces(ctx, requester.ID, query, limit, offset)
	if err != nil {
		return WriteReponse(c, http.StatusBadRequest, apperrors.ErrInputRequirements.Error())
	}
	return c.JSON(http.StatusOK, places)
}

func (h *Handler) HandleGetTopMentions(c echo.Context) error {
	query := c.QueryParam("query")
	sinceStr := c.QueryParam("since")
	untilStr := c.QueryParam("until")
	since, until := utils.ParseDateRange(sinceStr, untilStr)
	requester, err := GetRequester(c, h)
	if err != nil {
		return WriteReponse(c, http.StatusUnauthorized, apperrors.ErrUnauthorized.Error())
	}
	ctx := c.Request().Context()
	mentions, err := h.Service.NoteService().GetTopMentions(ctx, query, since, until, requester.ID)
	if err != nil {
		return WriteReponse(c, http.StatusInternalServerError, apperrors.ErrUnexpected.Error())
	}
	return c.JSON(http.StatusOK, mentions)
}
func (h *Handler) HandleGetNotes(c echo.Context) error {
	query := c.QueryParam("query")
	sinceStr := c.QueryParam("since")
	untilStr := c.QueryParam("until")
	since, until := utils.ParseDateRange(sinceStr, untilStr)
	requester, err := GetRequester(c, h)
	if err != nil {
		return WriteReponse(c, http.StatusUnauthorized, apperrors.ErrUnauthorized.Error())
	}
	ctx := c.Request().Context()
	fmt.Println("attempting to fetch notes since : ", since)
	notes, err := h.Service.NoteService().GetNotes(ctx, query, since, until, requester.ID)
	if err != nil {
		return WriteReponse(c, http.StatusInternalServerError, apperrors.ErrUnexpected.Error())
	}
	return c.JSON(http.StatusOK, adapters.MapEntryEntitiesToDto(notes))
}

func (h *Handler) HandleDeleteNote(c echo.Context) error {
	requester, err := GetRequester(c, h)
	if err != nil {
		return WriteReponse(c, http.StatusUnauthorized, apperrors.ErrUnauthorized.Error())
	}

	id := c.Param("id")
	noteId, err := strconv.Atoi(id)
	if err != nil {
		return WriteReponse(c, http.StatusNotFound, apperrors.ErrNotFound.Error())
	}
	ctx := c.Request().Context()

	if err := h.Service.NoteService().DeleteNote(ctx, uint64(noteId), requester.ID); err != nil {
		if errors.Is(err, apperrors.ErrForbidden) {
			return WriteReponse(c, http.StatusForbidden, apperrors.ErrForbidden.Error())
		}
		if errors.Is(err, apperrors.ErrNotFound) {
			return WriteReponse(c, http.StatusNotFound, apperrors.ErrNotFound.Error())
		}

		return WriteReponse(c, http.StatusInternalServerError, apperrors.ErrUnexpected.Error())
	}

	return c.JSON(http.StatusOK, "ok")
}

func (h *Handler) HandleGetQueryStatistics(c echo.Context) error {
	query := c.QueryParam("query")
	sinceStr := c.QueryParam("since")
	untilStr := c.QueryParam("until")
	since, until := utils.ParseDateRange(sinceStr, untilStr)
	requester, err := GetRequester(c, h)
	if err != nil {
		return WriteReponse(c, http.StatusUnauthorized, apperrors.ErrUnauthorized.Error())
	}
	ctx := c.Request().Context()

	stats, err := h.Service.NoteService().GetQueryStats(ctx, query, since, until, requester.ID)
	if err != nil {
		return WriteReponse(c, http.StatusInternalServerError, apperrors.ErrUnexpected.Error())
	}
	return c.JSON(http.StatusOK, stats)
}
