package redis

import (
	"context"
	"os"

	"github.com/go-redis/redis/v8"
)

type RedisStore struct {
	ctx context.Context
	rdb *redis.Client
}

func NewRedisStore() (*RedisStore, error) {
	var ctx = context.Background()

	Addr := os.Getenv("REDIS_URI")

	rdb := redis.NewClient(&redis.Options{
		Addr: Addr,
	})

	_, err := rdb.Ping(ctx).Result()
	if err != nil {
		return nil, err
	}

	return &RedisStore{
		rdb: rdb,
		ctx: ctx,
	}, nil
}
