package utils

func DeduplicateSlice[T comparable](input []T) []T {
	if input == nil {
		return []T{}
	}

	seen := make(map[T]struct{}, len(input))
	for _, value := range input {
		seen[value] = struct{}{}
	}

	result := make([]T, 0, len(seen))
	for key := range seen {
		result = append(result, key)
	}

	return result
}
