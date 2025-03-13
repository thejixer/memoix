package router

import (
	"memoix-server/internal/handler"

	"github.com/labstack/echo/v4"
)

type Router struct {
	e *echo.Echo
	h *handler.Handler
}

func NewRouter(e *echo.Echo, h *handler.Handler) *Router {
	return &Router{
		e: e,
		h: h,
	}
}

func (r *Router) ApplyRoutes(e *echo.Echo) {
	e.GET("/", r.h.HandleHelloWorld)

	r.ApplyAuthRoutes(e)
	r.ApplyPersonRoutes(e)
	r.ApplyNoeRoutes(e)
}
