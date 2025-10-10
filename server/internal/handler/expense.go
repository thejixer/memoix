package handler

import (
	"context"
	"memoix-server/internal/apperrors"
	"memoix-server/internal/models"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
)

type IExpenseService interface {
	Create(ctx context.Context, expense *models.ExpenseEntity) (*models.ExpenseEntity, error)
	AggregateExpensesByDate(ctx context.Context, userID uint64, startDate, endDate time.Time) ([]*models.DailyExpenseDto, error)
}

func (h *Handler) HandleCreateExpense(c echo.Context) error {

	body := models.CreateExpenseDto{}
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
	d := &models.ExpenseEntity{
		UserID:  requester.ID,
		Amount:  body.Amount,
		Content: body.Content,
		Date:    body.Date,
	}

	expense, err := h.Service.ExpenseService().Create(ctx, d)

	if err != nil {
		return WriteReponse(c, http.StatusBadRequest, apperrors.ErrInputRequirements.Error())
	}
	return c.JSON(http.StatusOK, expense)
}

func (h *Handler) HandleGetDailyExpenses(c echo.Context) error {
	body := models.GetDailyExpenseDto{}

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
	dailyExpenses, err := h.Service.ExpenseService().AggregateExpensesByDate(ctx, requester.ID, body.MinDate, body.MaxDate)
	if err != nil {
		return WriteReponse(c, http.StatusBadRequest, apperrors.ErrUnexpected.Error())
	}
	return c.JSON(http.StatusOK, dailyExpenses)
}
