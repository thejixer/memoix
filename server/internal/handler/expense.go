package handler

import (
	"context"
	"fmt"
	"memoix-server/internal/apperrors"
	"memoix-server/internal/models"
	"memoix-server/internal/utils"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
)

type IExpenseService interface {
	Create(ctx context.Context, expense *models.ExpenseEntity) (*models.ExpenseEntity, error)
	AggregateExpensesByDate(ctx context.Context, userID uint64, startDate, endDate time.Time) ([]*models.DailyExpenseDto, error)
	AggregateExpensesByTag(ctx context.Context, userID uint64, since, until *time.Time) ([]*models.ExpenseByTagDto, error)
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
	// this function has a bug, it is not handling UTC date conversions properly,
	// an expense which is in 12:18AM Tehran Time is not part of its correspondent date
	// and it is coming for tomorrow, to be tested later. 
	// actually, the repository function needs to be edited. 
	sinceStr := c.QueryParam("since")
	untilStr := c.QueryParam("until")
	since, until := utils.ParseDateRange(sinceStr, untilStr)
	fmt.Println("since : ", since)
	fmt.Println("until : ", until)
	if since == nil || until == nil {
		return WriteReponse(c, http.StatusBadRequest, apperrors.ErrInputRequirements.Error())
	}

	requester, err := GetRequester(c, h)
	if err != nil {
		return WriteReponse(c, http.StatusUnauthorized, apperrors.ErrUnauthorized.Error())
	}
	ctx := c.Request().Context()
	dailyExpenses, err := h.Service.ExpenseService().AggregateExpensesByDate(ctx, requester.ID, *since, *until)
	if err != nil {
		return WriteReponse(c, http.StatusBadRequest, apperrors.ErrUnexpected.Error())
	}
	return c.JSON(http.StatusOK, dailyExpenses)
}

func (h *Handler) HandleGetExpenseByTags(c echo.Context) error {
	sinceStr := c.QueryParam("since")
	untilStr := c.QueryParam("until")
	since, until := utils.ParseDateRange(sinceStr, untilStr)
	requester, err := GetRequester(c, h)
	if err != nil {
		return WriteReponse(c, http.StatusUnauthorized, apperrors.ErrUnauthorized.Error())
	}
	ctx := c.Request().Context()
	expenseByTags, err := h.Service.ExpenseService().AggregateExpensesByTag(ctx, requester.ID, since, until)
	if err != nil {
		return WriteReponse(c, http.StatusBadRequest, apperrors.ErrUnexpected.Error())
	}
	return c.JSON(http.StatusOK, expenseByTags)
}
