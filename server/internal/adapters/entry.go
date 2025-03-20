package adapters

import "memoix-server/internal/models"

func MapEntryEntityToDto(e *models.EntryEntity) *models.EntryDto {
	return &models.EntryDto{
		ID:      e.ID,
		Content: e.Content,
		Amount:  e.Amount,
		Date:    e.Date,
		Type:    e.Type,
	}
}

func MapEntryEntitiesToDto(data []*models.EntryEntity) []*models.EntryDto {
	var result []*models.EntryDto
	for _, item := range data {
		p := MapEntryEntityToDto(item)
		result = append(result, p)
	}
	return result
}
