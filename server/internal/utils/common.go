package utils

import "regexp"

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

func ExtractEntities(content string) ([]string, []string, []string) {

	hashtagPattern := regexp.MustCompile(`#\w+`)
	mentionPattern := regexp.MustCompile(`@\w+`)
	placesPattern := regexp.MustCompile(`&\w+`)

	hashtags := hashtagPattern.FindAllString(content, -1)
	mentions := mentionPattern.FindAllString(content, -1)
	places := placesPattern.FindAllString(content, -1)

	return DeduplicateSlice(hashtags), DeduplicateSlice(mentions), DeduplicateSlice(places)
}
