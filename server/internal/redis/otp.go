package redis

import (
	"fmt"
	"time"
)

func (rc *RedisStore) SetOTP(phoneNumber, otp string) error {
	key := fmt.Sprintf("m-otp-%v", phoneNumber)
	err := rc.rdb.Set(rc.ctx, key, otp, time.Minute*3).Err()

	if err != nil {
		return err
	}

	return nil
}

func (rc *RedisStore) GetOTP(phoneNumber string) (string, error) {
	key := fmt.Sprintf("m-otp-%v", phoneNumber)
	val, err := rc.rdb.Get(rc.ctx, key).Result()
	if err != nil {
		return "", err
	}

	return val, nil
}

func (rc *RedisStore) DelOTP(phoneNumber string) error {
	key := fmt.Sprintf("m-otp-%v", phoneNumber)
	_, err := rc.rdb.Del(rc.ctx, key).Result()
	if err != nil {
		return err
	}
	return nil
}
