package utils

import "time"

func ParseDateRange(sinceStr, untilStr string) (*time.Time, *time.Time) {
	var since, until *time.Time

	if sinceStr != "" {
		t, err := time.Parse(time.RFC3339, sinceStr)
		if err == nil {
			since = &t
		}
	}

	if untilStr != "" {
		t, err := time.Parse(time.RFC3339, untilStr)
		if err == nil {
			until = &t
		}
	}

	if since != nil && until != nil && since.After(*until) {
		since, until = until, since
	}

	return since, until
}
