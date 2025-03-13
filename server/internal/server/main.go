package server

import (
	"memoix-server/internal/handler"
	"memoix-server/internal/server/router"

	"github.com/labstack/echo/v4"
)

type APIServer struct {
	listenAddr   string
	handlerAgent *handler.Handler
}

func NewAPIServer(listenAddr string, handlerAgent *handler.Handler) *APIServer {

	return &APIServer{
		listenAddr:   listenAddr,
		handlerAgent: handlerAgent,
	}
}

func (s *APIServer) Run() {
	e := echo.New()
	r := router.NewRouter(e, s.handlerAgent)

	r.ApplyMiddlewares(e)
	r.ApplyRoutes(e)

	e.Logger.Fatal(e.Start(s.listenAddr))
}
