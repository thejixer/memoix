package service

import (
	"context"
	"fmt"
	"memoix-server/internal/models"
	"memoix-server/internal/utils"
	"time"
)

type INoteRepository interface {
	Create(ctx context.Context, content string, date time.Time, tags, mentions, places []string, userID uint64) (*models.NoteEntity, error)
	GetTopTags(ctx context.Context, hashtags, mentions []string, userID uint64) ([]*models.TagUsageDto, error)
	GetTopMentions(ctx context.Context, hashtags, mentions []string, userID uint64) ([]*models.MentionUsageDto, error)
	GetNotesAndExpenses(ctx context.Context, hashtags, mentions []string, userID uint64) ([]*models.EntryEntity, error)
	DeleteNote(ctx context.Context, noteID, userID uint64) error
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

	fmt.Println("##########")
	fmt.Println("tags : ", tags)
	fmt.Println("mentions : ", mentions)
	fmt.Println("places : ", places)
	fmt.Println("##########")

	note, err := s.dbStore.NoteRepo().Create(ctx, content, date, tags, mentions, places, userID)
	if err != nil {
		return nil, fmt.Errorf("error in NoteService.Create: %w", err)
	}
	return note, nil
}

func (s *NoteService) GetTopTags(ctx context.Context, query string, userID uint64) ([]*models.TagUsageDto, error) {
	hashtags, mentions, _ := utils.ExtractEntities(query)
	tags, err := s.dbStore.NoteRepo().GetTopTags(ctx, hashtags, mentions, userID)
	if err != nil {
		return nil, fmt.Errorf("error in NoteService.GetTopTags: %w", err)
	}
	return tags, nil
}

func (s *NoteService) GetTopMentions(ctx context.Context, query string, userID uint64) ([]*models.MentionUsageDto, error) {
	hashtags, mentions, _ := utils.ExtractEntities(query)
	data, err := s.dbStore.NoteRepo().GetTopMentions(ctx, hashtags, mentions, userID)
	if err != nil {
		return nil, fmt.Errorf("error in NoteService.GetTopMentions: %w", err)
	}
	return data, nil
}

func (s *NoteService) GetNotes(ctx context.Context, query string, userID uint64) ([]*models.EntryEntity, error) {
	hashtags, mentions, _ := utils.ExtractEntities(query)
	data, err := s.dbStore.NoteRepo().GetNotesAndExpenses(ctx, hashtags, mentions, userID)
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
