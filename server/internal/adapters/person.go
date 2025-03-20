package adapters

import "memoix-server/internal/models"

func MapPersonEntityToDto(p *models.PersonEntity) *models.PersonDto {
	return &models.PersonDto{
		ID:          p.ID,
		Name:        p.Name,
		Avatar:      p.Avatar,
		PhoneNumber: p.PhoneNumber,
		Birthday:    p.Birthday,
		CreatedAt:   p.CreatedAt,
	}
}

func MapPersonEntitiesToDto(data []*models.PersonEntity) []*models.PersonDto {
	var result []*models.PersonDto
	for _, item := range data {
		p := MapPersonEntityToDto(item)
		result = append(result, p)
	}
	return result
}
