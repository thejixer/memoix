package router

import "github.com/labstack/echo/v4"

func (r *Router) ApplyNoeRoutes(e *echo.Echo) {
	g := e.Group("/note")
	g.POST("/", r.h.HandleCreateNote)
	g.GET("/", r.h.HandleGetNotes)
	g.DELETE("/:id", r.h.HandleDeleteNote)

	t := e.Group("/tag")
	t.GET("/top-tags", r.h.HandleGetTopTags)

	m := e.Group("/mention")
	m.GET("/top-mentions", r.h.HandleGetTopMentions)
}
