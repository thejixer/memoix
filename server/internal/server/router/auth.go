package router

import "github.com/labstack/echo/v4"

func (r *Router) ApplyAuthRoutes(e *echo.Echo) {
	auth := e.Group("/auth")
	auth.POST("/request-otp", r.h.HandleRequestOTP)
	auth.POST("/verify-otp", r.h.HandleVerifyOTP)
	auth.GET("/me", r.h.HandleMe)

	// auth.GET("/users", r.h.HandleQueryUsers)
	// auth.POST("/users", r.h.HandleCreateUser)
	// auth.GET("/users/:id", r.h.HandleGetSingleUser)
	// auth.PATCH("/users/:id/role", r.h.HandleChangeUserRole)
	// auth.PATCH("/users/profile", r.h.HandleEditProfile)
}
