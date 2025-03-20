package handler

import (
	"context"
	"fmt"
	"memoix-server/internal/apperrors"
	"memoix-server/internal/models"
	"net/http"

	"github.com/labstack/echo/v4"
)

type IExpenseService interface {
	Create(ctx context.Context, expense *models.ExpenseEntity) (*models.ExpenseEntity, error)
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
		fmt.Println(err)
		return WriteReponse(c, http.StatusBadRequest, apperrors.ErrInputRequirements.Error())
	}
	return c.JSON(http.StatusOK, expense)
}
