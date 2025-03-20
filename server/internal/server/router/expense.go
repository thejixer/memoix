package router

import "github.com/labstack/echo/v4"

func (r *Router) ApplyExpenseRoutes(e *echo.Echo) {
	g := e.Group("/expense")
	g.POST("/", r.h.HandleCreateExpense)
}
