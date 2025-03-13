package service

import (
	"context"
	"fmt"
	"memoix-server/internal/models"
	"memoix-server/internal/utils"
	"regexp"
	"time"
)

type INoteRepository interface {
	Create(ctx context.Context, content string, date time.Time, tags, mentions, places []string, userID uint64) (*models.NoteEntity, error)
	GetTopTags(ctx context.Context, hashtags, mentions []string, userID uint64) ([]*models.TagUsageDto, error)
	GetTopMentions(ctx context.Context, hashtags, mentions []string, userID uint64) ([]*models.MentionUsageDto, error)
	GetNotes(ctx context.Context, hashtags, mentions []string, userID uint64) ([]*models.NoteEntity, error)
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

func (s *NoteService) extractTagsAndMentions(content string) ([]string, []string, []string) {

	hashtagPattern := regexp.MustCompile(`#\w+`)
	mentionPattern := regexp.MustCompile(`@\w+`)
	placesPattern := regexp.MustCompile(`&\w+`)

	hashtags := hashtagPattern.FindAllString(content, -1)
	mentions := mentionPattern.FindAllString(content, -1)
	places := placesPattern.FindAllString(content, -1)

	return utils.DeduplicateSlice(hashtags), utils.DeduplicateSlice(mentions), utils.DeduplicateSlice(places)
}

func (s *NoteService) Create(ctx context.Context, content string, date time.Time, userID uint64) (*models.NoteEntity, error) {

	tags, mentions, places := s.extractTagsAndMentions(content)

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
	hashtags, mentions, _ := s.extractTagsAndMentions(query)
	tags, err := s.dbStore.NoteRepo().GetTopTags(ctx, hashtags, mentions, userID)
	if err != nil {
		return nil, fmt.Errorf("error in NoteService.GetTopTags: %w", err)
	}
	return tags, nil
}

func (s *NoteService) GetTopMentions(ctx context.Context, query string, userID uint64) ([]*models.MentionUsageDto, error) {
	hashtags, mentions, _ := s.extractTagsAndMentions(query)
	data, err := s.dbStore.NoteRepo().GetTopMentions(ctx, hashtags, mentions, userID)
	if err != nil {
		return nil, fmt.Errorf("error in NoteService.GetTopMentions: %w", err)
	}
	return data, nil
}

func (s *NoteService) GetNotes(ctx context.Context, query string, userID uint64) ([]*models.NoteEntity, error) {
	hashtags, mentions, _ := s.extractTagsAndMentions(query)
	data, err := s.dbStore.NoteRepo().GetNotes(ctx, hashtags, mentions, userID)
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
