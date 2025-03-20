package router

import "github.com/labstack/echo/v4"

func (r *Router) ApplyPersonRoutes(e *echo.Echo) {
	g := e.Group("/person")
	g.POST("/", r.h.HandleCreatePerson)
	g.GET("/", r.h.HandleQueryPersons)
	g.GET("/:id", r.h.HandleGetPerson)
	g.POST("/:id/avatar", r.h.UploadAvatar)
	g.PATCH("/", r.h.HandleUpdateName)
	g.PATCH("/phone", r.h.HandleUpdatePersonPhoneNumber)
}
