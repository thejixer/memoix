package utils

import "strconv"

func ParsePagination(limitStr, pageStr string) (limitPtr, offsetPtr *int) {
	if limitStr == "" {
		return nil, nil
	}

	// parse limit
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		return nil, nil
	}
	limitPtr = &limit

	// parse page, default to 1 if missing
	page := 1
	if pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	offset := (page - 1) * limit
	offsetPtr = &offset
	return
}
