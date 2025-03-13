package main

import (
	"log"
	"memoix-server/internal/handler"
	"memoix-server/internal/redis"
	"memoix-server/internal/repository"
	"memoix-server/internal/server"
	"memoix-server/internal/service"
	"os"

	"github.com/joho/godotenv"
)

func init() {
	godotenv.Load()
}

func main() {
	listenAddr := os.Getenv("LISTEN_ADDR")
	dbStore, err := repository.NewPostgresStore()

	if err != nil {
		log.Fatal("could not connect to the database: ", err)
	}

	if err := dbStore.Init(); err != nil {
		log.Fatal("could not connect to the database: ", err)
	}

	redisStore, err := redis.NewRedisStore()
	if err != nil {
		log.Fatal("could not connect to the redis: ", err)
	}

	s := service.NewService(dbStore, redisStore)

	handler := handler.NewHandler(s)

	apiServer := server.NewAPIServer(listenAddr, handler)
	apiServer.Run()
}
