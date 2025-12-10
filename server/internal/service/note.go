package service

import (
	"context"
	"fmt"
	"memoix-server/internal/models"
	"memoix-server/internal/utils"
	"sort"
	"time"
)

type INoteRepository interface {
	Create(ctx context.Context, content string, date time.Time, tags, mentions, places []string, userID uint64) (*models.NoteEntity, error)
	GetTopTags(ctx context.Context, hashtags, mentions, places []string, since, until *time.Time, userID uint64, mode string) ([]*models.TagUsageDto, error)
	QueryTags(ctx context.Context, userId uint64, query string, limit, offset *int) ([]*models.TagDto, error)
	QueryPlaces(ctx context.Context, userId uint64, text string, limit, offset *int) ([]*models.PlaceDto, error)
	GetTopMentions(ctx context.Context, hashtags, mentions, places []string, since, until *time.Time, userID uint64, mode string) ([]*models.MentionUsageDto, error)
	GetNotesAndExpenses(ctx context.Context, hashtags, mentions, places []string, since, until *time.Time, userID uint64) ([]*models.EntryEntity, error)
	DeleteNote(ctx context.Context, noteID, userID uint64) error
	GetFilteredTimestamps(ctx context.Context, hashtags, mentions, places []string, userID uint64, startDate, endDate *time.Time) ([]time.Time, error)
}

type NoteService struct {
	dbStore    IdbStore
	redisStore IRedisStore
}

func NewNoteService(dbStore IdbStore, redisStore IRedisStore) *NoteService {
	return &NoteService{
		dbStore:    dbStore,
		redisStore: redisStore,
	}
}

func (s *NoteService) Create(ctx context.Context, content string, date time.Time, userID uint64) (*models.NoteEntity, error) {

	tags, mentions, places := utils.ExtractEntities(content)

	note, err := s.dbStore.NoteRepo().Create(ctx, content, date, tags, mentions, places, userID)
	if err != nil {
		return nil, fmt.Errorf("error in NoteService.Create: %w", err)
	}
	return note, nil
}

func (s *NoteService) GetTopTags(ctx context.Context, query string, since, until *time.Time, userID uint64, mode string) ([]*models.TagUsageDto, error) {
	hashtags, mentions, places := utils.ExtractEntities(query)
	tags, err := s.dbStore.NoteRepo().GetTopTags(ctx, hashtags, mentions, places, since, until, userID, mode)
	if err != nil {
		return nil, fmt.Errorf("error in NoteService.GetTopTags: %w", err)
	}
	return tags, nil
}

func (s *NoteService) QueryTags(ctx context.Context, userId uint64, query string, limit, offset *int) ([]*models.TagDto, error) {
	tags, err := s.dbStore.NoteRepo().QueryTags(ctx, userId, query, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("error in NoteService.QueryTags: %w", err)
	}
	return tags, nil
}
func (s *NoteService) QueryPlaces(ctx context.Context, userId uint64, text string, limit, offset *int) ([]*models.PlaceDto, error) {
	places, err := s.dbStore.NoteRepo().QueryPlaces(ctx, userId, text, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("error in NoteService.QueryPlaces: %w", err)
	}
	return places, nil
}

func (s *NoteService) GetTopMentions(ctx context.Context, query string, since, until *time.Time, userID uint64, mode string) ([]*models.MentionUsageDto, error) {
	hashtags, mentions, places := utils.ExtractEntities(query)
	data, err := s.dbStore.NoteRepo().GetTopMentions(ctx, hashtags, mentions, places, since, until, userID, mode)
	if err != nil {
		return nil, fmt.Errorf("error in NoteService.GetTopMentions: %w", err)
	}
	return data, nil
}

func (s *NoteService) GetNotes(ctx context.Context, query string, since, until *time.Time, userID uint64) ([]*models.EntryEntity, error) {
	hashtags, mentions, places := utils.ExtractEntities(query)
	data, err := s.dbStore.NoteRepo().GetNotesAndExpenses(ctx, hashtags, mentions, places, since, until, userID)
	if err != nil {
		return nil, fmt.Errorf("error in NoteService.GetNotes: %w", err)
	}
	return data, nil
}

func (s *NoteService) DeleteNote(ctx context.Context, noteID, userID uint64) error {
	if err := s.dbStore.NoteRepo().DeleteNote(ctx, noteID, userID); err != nil {
		return fmt.Errorf("error in NoteService.GetNotes: %w", err)
	}
	return nil
}

func (s *NoteService) GetQueryStats(ctx context.Context, query string, since, until *time.Time, userID uint64) (*models.QueryStats, error) {
	hashtags, mentions, places := utils.ExtractEntities(query)

	dates, err := s.dbStore.NoteRepo().GetFilteredTimestamps(ctx, hashtags, mentions, places, userID, since, until)
	if err != nil {
		return nil, err
	}

	if len(dates) == 0 {
		return &models.QueryStats{}, nil
	}

	sort.Slice(dates, func(i, j int) bool { return dates[i].Before(dates[j]) })

	var gaps []float64
	for i := 1; i < len(dates); i++ {
		gaps = append(gaps, dates[i].Sub(dates[i-1]).Hours()/24)
	}

	return &models.QueryStats{
		Dates:      dates,
		TotalCount: len(dates),
		FirstDate:  dates[0],
		LastDate:   dates[len(dates)-1],
		AverageGap: utils.Mean(gaps),
		MedianGap:  utils.Median(gaps),
		MinGap:     utils.Min(gaps),
		MaxGap:     utils.Max(gaps),
		StdDevGap:  utils.StdDev(gaps),
	}, nil
}
