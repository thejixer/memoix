package repository

import (
	"context"
	"database/sql"
	"fmt"
	"memoix-server/internal/apperrors"
	"memoix-server/internal/models"
	"memoix-server/internal/service"
	"strings"
	"time"
)

func (s *PostgresStore) createNoteTables() error {

	query := `

		CREATE TABLE if not exists notes (
			id SERIAL PRIMARY KEY,
			user_id integer NOT NULL,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
			content TEXT NOT NULL,
			date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);

		CREATE TABLE if not exists tags (
			id SERIAL PRIMARY KEY,
			name TEXT NOT NULL,
			user_id integer,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		);
		CREATE UNIQUE INDEX IF NOT EXISTS unique_tags_lower ON tags (LOWER(name), user_id);

		CREATE TABLE if not exists notes_tags (
			note_id integer REFERENCES notes(id) ON DELETE CASCADE,
			tag_id integer REFERENCES tags(id) ON DELETE CASCADE,
			PRIMARY KEY (note_id, tag_id)
		);

		CREATE TABLE if not exists mentions (
			id SERIAL PRIMARY KEY,
			note_id integer REFERENCES notes(id) ON DELETE CASCADE,
			person_id integer REFERENCES persons(id) ON DELETE CASCADE,
			UNIQUE (note_id, person_id) 
		);

		CREATE TABLE if not exists places (
			id SERIAL PRIMARY KEY,
			name TEXT NOT NULL,
			user_id integer,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		);
		CREATE UNIQUE INDEX IF NOT EXISTS unique_places_lower ON places (LOWER(name), user_id);

		CREATE TABLE if not exists notes_places (
			note_id integer REFERENCES notes(id) ON DELETE CASCADE,
			place_id integer REFERENCES places(id) ON DELETE CASCADE,
			PRIMARY KEY (note_id, place_id)
		);

	`

	_, err := s.db.Exec(query)

	return err
}

type NoteRepo struct {
	db *sql.DB
}

func NewNoteRepo(db *sql.DB) *NoteRepo {
	return &NoteRepo{
		db: db,
	}
}

func (s *PostgresStore) NoteRepo() service.INoteRepository {
	return s.noteRepo
}

func (r *NoteRepo) Create(ctx context.Context, content string, date time.Time, tags, mentions, places []string, userID uint64) (*models.NoteEntity, error) {
	// Begin transaction
	tx, err := r.db.Begin()
	if err != nil {
		return nil, fmt.Errorf("error in noteRepo.Create 1: %w", err)
	}
	// Insert note
	NewNote := &models.NoteEntity{
		UserID:  userID,
		Content: content,
		Date:    date,
	}
	err = tx.QueryRowContext(ctx, `INSERT INTO notes (user_id, content, date) VALUES ($1, $2, $3) RETURNING id`, userID, content, date).Scan(&NewNote.ID)
	if err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("error in noteRepo.Create 2: %w", err)
	}
	// Insert hashtags
	for _, tag := range tags {
		var tagID int
		err = tx.QueryRowContext(ctx, `
			INSERT INTO tags (name, user_id) 
			VALUES ($1, $2) 
			ON CONFLICT (LOWER(name), user_id) DO UPDATE SET name = EXCLUDED.name
			RETURNING id;
		`, tag, userID).Scan(&tagID)
		if err != nil {
			tx.Rollback()
			return nil, fmt.Errorf("error in noteRepo.Create 3: %w", err)
		}

		_, err = tx.Exec(`INSERT INTO notes_tags (note_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, NewNote.ID, tagID)
		if err != nil {
			tx.Rollback()
			return nil, fmt.Errorf("error in noteRepo.Create 4: %w", err)
		}
	}

	// Insert mentions
	for _, mention := range mentions {
		var personID int
		personName := mention[1:]
		err = tx.QueryRowContext(ctx, `SELECT id FROM persons WHERE name = $1 AND user_id = $2`, personName, userID).Scan(&personID)
		if err == sql.ErrNoRows {
			// Insert new person if they don't exist
			err = tx.QueryRowContext(ctx, `INSERT INTO persons (name, user_id, avatar, created_at) VALUES ($1, $2, $3, $4) RETURNING id`, personName, userID, "", time.Now().UTC()).Scan(&personID)
			if err != nil {
				tx.Rollback()
				return nil, fmt.Errorf("error in noteRepo.Create  5: %w", err)
			}
		} else if err != nil {
			tx.Rollback()
			return nil, fmt.Errorf("error in noteRepo.Create 6: %w", err)
		}

		_, err = tx.Exec(`INSERT INTO mentions (note_id, person_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, NewNote.ID, personID)
		if err != nil {
			tx.Rollback()
			return nil, fmt.Errorf("error in noteRepo.Create 7: %w", err)
		}
	}
	// Insert places
	for _, place := range places {
		var placeID int
		err = tx.QueryRowContext(ctx, `
			INSERT INTO places (name, user_id)
			VALUES ($1, $2) 
			ON CONFLICT (LOWER(name), user_id) DO UPDATE SET name = EXCLUDED.name
			RETURNING id;
		`, place, userID).Scan(&placeID)
		if err != nil {
			tx.Rollback()
			return nil, fmt.Errorf("error in noteRepo.Create 8: %w", err)
		}

		_, err = tx.Exec(`INSERT INTO notes_places (note_id, place_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, NewNote.ID, placeID)
		if err != nil {
			tx.Rollback()
			return nil, fmt.Errorf("error in noteRepo.Create 9: %w", err)
		}

	}

	// Commit transaction
	err = tx.Commit()
	if err != nil {
		return nil, fmt.Errorf("error in noteRepo.Create 10: %w", err)
	}

	return NewNote, nil
}

func (r *NoteRepo) GetTopTags(ctx context.Context, hashtags, mentions []string, userID uint64) ([]*models.TagUsageDto, error) {

	query := `
		WITH filtered_notes AS (
			SELECT n.id
			FROM notes n
			LEFT JOIN notes_tags nt ON n.id = nt.note_id
			LEFT JOIN tags t ON nt.tag_id = t.id
			LEFT JOIN mentions m ON n.id = m.note_id
			LEFT JOIN persons p ON m.person_id = p.id
			WHERE n.user_id = $1
	`

	args := []interface{}{userID}
	argIndex := 2
	var conditions []string

	if len(hashtags) > 0 {
		placeholders := make([]string, len(hashtags))
		for i, hashtag := range hashtags {
			placeholders[i] = fmt.Sprintf("$%d", argIndex)
			args = append(args, hashtag)
			argIndex++
		}
		conditions = append(conditions, fmt.Sprintf("t.name IN (%s)", strings.Join(placeholders, ", ")))
	}

	if len(mentions) > 0 {
		placeholders := make([]string, len(mentions))
		for i, mention := range mentions {
			placeholders[i] = fmt.Sprintf("$%d", argIndex)
			args = append(args, mention[1:]) // Remove '@' prefix
			argIndex++
		}
		conditions = append(conditions, fmt.Sprintf("p.name IN (%s)", strings.Join(placeholders, ", ")))
	}

	if len(conditions) > 0 {
		query += " AND " + strings.Join(conditions, " AND ")
	}

	query += "\n\t\tGROUP BY n.id"

	var havingConditions []string

	if len(hashtags) > 0 {
		havingConditions = append(havingConditions, fmt.Sprintf("COUNT(DISTINCT t.name) = $%d", argIndex))
		args = append(args, len(hashtags))
		argIndex++
	}

	if len(mentions) > 0 {
		havingConditions = append(havingConditions, fmt.Sprintf("COUNT(DISTINCT p.name) = $%d", argIndex))
		args = append(args, len(mentions))
		argIndex++
	}

	if len(havingConditions) > 0 {
		query += " HAVING " + strings.Join(havingConditions, " AND ")
	}

	query += `
		)
		SELECT t.name, COUNT(nt.tag_id) AS usage_count
		FROM notes_tags nt
		JOIN tags t ON nt.tag_id = t.id
		WHERE nt.note_id IN (SELECT id FROM filtered_notes)
	`

	if len(hashtags) > 0 {
		placeholders := make([]string, len(hashtags))
		for i, hashtag := range hashtags {
			placeholders[i] = fmt.Sprintf("$%d", argIndex)
			args = append(args, hashtag)
			argIndex++
		}
		query += " AND t.name NOT IN (" + strings.Join(placeholders, ", ") + ")"
	}

	query += `
		GROUP BY t.id, t.name
		ORDER BY usage_count DESC
		LIMIT 10;
	`

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tags []*models.TagUsageDto
	for rows.Next() {
		tag := new(models.TagUsageDto)
		if err := rows.Scan(&tag.Name, &tag.UsageCount); err != nil {
			return nil, fmt.Errorf("error in noteRepo.GetTopTags: %w", err)
		}
		tags = append(tags, tag)
	}

	return tags, nil
}

func (r *NoteRepo) GetTopMentions(ctx context.Context, hashtags, mentions []string, userID uint64) ([]*models.MentionUsageDto, error) {

	query := `
			WITH filtered_notes AS (
					SELECT n.id
					FROM notes n
					LEFT JOIN notes_tags nt ON n.id = nt.note_id
					LEFT JOIN tags t ON nt.tag_id = t.id
					LEFT JOIN mentions m ON n.id = m.note_id
					LEFT JOIN persons p ON m.person_id = p.id
					WHERE n.user_id = $1
	`

	args := []interface{}{userID}
	argIndex := 2
	var conditions []string

	if len(hashtags) > 0 {
		placeholders := make([]string, len(hashtags))
		for i, hashtag := range hashtags {
			placeholders[i] = fmt.Sprintf("$%d", argIndex)
			args = append(args, hashtag)
			argIndex++
		}
		conditions = append(conditions, fmt.Sprintf("t.name IN (%s)", strings.Join(placeholders, ", ")))
	}

	if len(mentions) > 0 {
		placeholders := make([]string, len(mentions))
		for i, mention := range mentions {
			placeholders[i] = fmt.Sprintf("$%d", argIndex)
			args = append(args, mention[1:])
			argIndex++
		}
		conditions = append(conditions, fmt.Sprintf("p.name IN (%s)", strings.Join(placeholders, ", ")))
	}

	if len(conditions) > 0 {
		query += " AND " + strings.Join(conditions, " AND ")
	}

	query += " GROUP BY n.id"

	havingClauses := []string{}
	if len(hashtags) > 0 {
		havingClauses = append(havingClauses, fmt.Sprintf("COUNT(DISTINCT t.name) = $%d", argIndex))
		args = append(args, len(hashtags))
		argIndex++
	}

	if len(mentions) > 0 {
		havingClauses = append(havingClauses, fmt.Sprintf("COUNT(DISTINCT p.name) = $%d", argIndex))
		args = append(args, len(mentions))
		argIndex++
	}

	if len(havingClauses) > 0 {
		query += " HAVING " + strings.Join(havingClauses, " AND ")
	}

	query += `)
			SELECT p.id, p.name, COUNT(m.id) AS mention_count
			FROM mentions m
			JOIN persons p ON m.person_id = p.id
			WHERE m.note_id IN (SELECT id FROM filtered_notes)
	`

	if len(mentions) > 0 {
		placeholders := make([]string, len(mentions))
		for i, mention := range mentions {
			placeholders[i] = fmt.Sprintf("$%d", argIndex)
			args = append(args, mention[1:])
			argIndex++
		}
		query += " AND p.name NOT IN (" + strings.Join(placeholders, ", ") + ")"
	}

	query += " GROUP BY p.id, p.name ORDER BY mention_count DESC LIMIT 10"

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("error in NoteService.GetTopMentions: %w", err)
	}
	defer rows.Close()

	var mentionsList []*models.MentionUsageDto
	for rows.Next() {
		mention := new(models.MentionUsageDto)
		if err := rows.Scan(&mention.ID, &mention.Name, &mention.UsageCount); err != nil {
			return nil, err
		}
		mentionsList = append(mentionsList, mention)
	}

	return mentionsList, nil
}

func (r *NoteRepo) GetNotes(ctx context.Context, hashtags, mentions []string, userID uint64) ([]*models.NoteEntity, error) {
	query := `
			SELECT n.id, n.user_id, n.content, n.date 
			FROM notes n
			LEFT JOIN notes_tags nt ON n.id = nt.note_id
			LEFT JOIN tags t ON nt.tag_id = t.id
			LEFT JOIN mentions m ON n.id = m.note_id
			LEFT JOIN persons p ON m.person_id = p.id
			WHERE n.user_id = $1
	`

	args := []interface{}{userID} // Store query parameters
	argIndex := 2                 // SQL parameter index starts from $2

	if len(hashtags) > 0 {
		query += " AND n.id IN (SELECT note_id FROM notes_tags nt JOIN tags t ON nt.tag_id = t.id WHERE t.name IN ("
		for i, tag := range hashtags {
			query += fmt.Sprintf("$%d", argIndex)
			args = append(args, tag)
			argIndex++
			if i < len(hashtags)-1 {
				query += ", "
			}
		}
		query += `) GROUP BY note_id HAVING COUNT(DISTINCT t.name) = $` + fmt.Sprintf("%d", argIndex)
		args = append(args, len(hashtags))
		argIndex++
		query += ")"
	}

	if len(mentions) > 0 {
		query += " AND n.id IN (SELECT note_id FROM mentions m JOIN persons p ON m.person_id = p.id WHERE p.name IN ("
		for i, mention := range mentions {
			query += fmt.Sprintf("$%d", argIndex)
			args = append(args, mention[1:])
			argIndex++
			if i < len(mentions)-1 {
				query += ", "
			}
		}
		query += `) GROUP BY note_id HAVING COUNT(DISTINCT p.name) = $` + fmt.Sprintf("%d", argIndex)
		args = append(args, len(mentions))
		argIndex++
		query += ")"
	}

	query += " GROUP BY n.id ORDER BY n.date DESC;"

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("error in noteRepo.GetNotes 1: %w", err)
	}
	defer rows.Close()

	var notes []*models.NoteEntity
	for rows.Next() {
		note := new(models.NoteEntity)
		if err := rows.Scan(&note.ID, &note.UserID, &note.Content, &note.Date); err != nil {
			return nil, fmt.Errorf("error in noteRepo.GetNotes 2: %w", err)
		}
		notes = append(notes, note)
	}

	return notes, nil
}

func (r *NoteRepo) DeleteNote(ctx context.Context, noteID, userID uint64) error {

	query := `DELETE FROM notes WHERE id = $1 AND user_id = $2`
	result, err := r.db.ExecContext(ctx, query, noteID, userID)
	if err != nil {
		return fmt.Errorf("failed to delete note: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("NoteRepo.DeleteNote : couldn't verify deletion: %w", err)
	}

	if rowsAffected == 0 {

		var exists bool
		checkQuery := `SELECT EXISTS (SELECT 1 FROM notes WHERE id = $1)`
		err = r.db.QueryRowContext(ctx, checkQuery, noteID).Scan(&exists)
		if err != nil {
			return fmt.Errorf("failed to check note existence: %w", err)
		}

		if !exists {
			return apperrors.ErrNotFound
		}
		return apperrors.ErrForbidden
	}

	return nil
}
