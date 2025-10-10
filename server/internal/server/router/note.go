package router

import "github.com/labstack/echo/v4"

func (r *Router) ApplyNoeRoutes(e *echo.Echo) {
	g := e.Group("/note")
	g.POST("/", r.h.HandleCreateNote)
	g.GET("/", r.h.HandleGetNotes)
	g.DELETE("/:id", r.h.HandleDeleteNote)

	t := e.Group("/tag")
	t.GET("/top-tags", r.h.HandleGetTopTags)
	t.GET("/", r.h.HandleQueryTags)

	m := e.Group("/mention")
	m.GET("/top-mentions", r.h.HandleGetTopMentions)

	p := e.Group("/place")
	p.GET("/", r.h.HandleQueryPlaces)

	s := e.Group("/stats")
	s.GET("/", r.h.HandleGetQueryStatistics)
}
