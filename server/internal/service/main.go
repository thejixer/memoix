package service

import "memoix-server/internal/handler"

type IRedisStore interface {
	SetOTP(phoneNumber, otp string) error
	GetOTP(phoneNumber string) (string, error)
	DelOTP(phoneNumber string) error
}

type IdbStore interface {
	AuthRepo() IAuthRepository
	PersonRepo() IPersonRepository
	NoteRepo() INoteRepository
}

type Service struct {
	authService   *AuthService
	personService *PersonService
	noteService   *NoteService
}

func NewService(dbStore IdbStore, redisStore IRedisStore) *Service {

	authService := NewAuthService(dbStore, redisStore)
	personService := NewPersonService(dbStore, redisStore)
	noteService := NewNoteService(dbStore, redisStore)

	return &Service{
		authService:   authService,
		personService: personService,
		noteService:   noteService,
	}
}

func (s *Service) AuthService() handler.IAuthService {
	return s.authService
}
func (s *Service) PersonService() handler.IPersonService {
	return s.personService
}
func (s *Service) NoteService() handler.INoteService {
	return s.noteService
}
