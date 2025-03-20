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

		CREATE TABLE if not exists notes_persons (
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

		_, err = tx.Exec(`INSERT INTO notes_persons (note_id, person_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, NewNote.ID, personID)
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
		// should I add a tx.Rollback() here ?!! #todo
		return nil, fmt.Errorf("error in noteRepo.Create 10: %w", err)
	}

	return NewNote, nil
}

func (r *NoteRepo) GetTopTags(ctx context.Context, hashtags, mentions []string, userID uint64) ([]*models.TagUsageDto, error) {
	args := []any{userID}
	argIndex := 2
	var hashtagFilters, mentionFilters, exclusionFilters []string

	// Prepare Hashtag conditions for filtering and exclusion
	if len(hashtags) > 0 {
		for _, tag := range hashtags {
			hashtagFilters = append(hashtagFilters, fmt.Sprintf("$%d", argIndex))
			exclusionFilters = append(exclusionFilters, fmt.Sprintf("$%d", argIndex)) // For exclusion later
			args = append(args, tag)
			argIndex++
		}
	}

	// Prepare Mention conditions
	if len(mentions) > 0 {
		for _, mention := range mentions {
			mentionFilters = append(mentionFilters, fmt.Sprintf("$%d", argIndex))
			args = append(args, mention[1:]) // Remove '@'
			argIndex++
		}
	}

	// Start query construction
	query := `
			WITH filtered_items AS (
					SELECT n.id, 'note' AS type
					FROM notes n
					LEFT JOIN notes_tags nt ON n.id = nt.note_id
					LEFT JOIN tags t ON nt.tag_id = t.id
					LEFT JOIN notes_persons np ON n.id = np.note_id
					LEFT JOIN persons p ON np.person_id = p.id
					WHERE n.user_id = $1
	`

	// Apply AND filtering for hashtags if any
	if len(hashtags) > 0 {
		query += fmt.Sprintf(`
					AND n.id IN (
							SELECT note_id FROM notes_tags nt
							JOIN tags t ON nt.tag_id = t.id
							WHERE t.name IN (%s)
							GROUP BY nt.note_id
							HAVING COUNT(DISTINCT t.name) = %d
					)`, strings.Join(hashtagFilters, ", "), len(hashtags))
	}

	// Apply AND filtering for mentions if any
	if len(mentions) > 0 {
		query += fmt.Sprintf(`
					AND n.id IN (
							SELECT note_id FROM notes_persons np
							JOIN persons p ON np.person_id = p.id
							WHERE p.name IN (%s)
							GROUP BY np.note_id
							HAVING COUNT(DISTINCT p.name) = %d
					)`, strings.Join(mentionFilters, ", "), len(mentions))
	}

	// Continue with the query for expenses
	query += `
					GROUP BY n.id

					UNION ALL

					SELECT e.id, 'expense' AS type
					FROM expenses e
					LEFT JOIN expense_tags et ON e.id = et.expense_id
					LEFT JOIN tags t ON et.tag_id = t.id
					LEFT JOIN expense_persons ep ON e.id = ep.expense_id
					LEFT JOIN persons p ON ep.person_id = p.id
					WHERE e.user_id = $1
	`

	// Apply AND filtering for hashtags in expenses
	if len(hashtags) > 0 {
		query += fmt.Sprintf(`
					AND e.id IN (
							SELECT expense_id FROM expense_tags et
							JOIN tags t ON et.tag_id = t.id
							WHERE t.name IN (%s)
							GROUP BY et.expense_id
							HAVING COUNT(DISTINCT t.name) = %d
					)`, strings.Join(hashtagFilters, ", "), len(hashtags))
	}

	// Apply AND filtering for mentions in expenses
	if len(mentions) > 0 {
		query += fmt.Sprintf(`
					AND e.id IN (
							SELECT expense_id FROM expense_persons ep
							JOIN persons p ON ep.person_id = p.id
							WHERE p.name IN (%s)
							GROUP BY ep.expense_id
							HAVING COUNT(DISTINCT p.name) = %d
					)`, strings.Join(mentionFilters, ", "), len(mentions))
	}

	// Closing the CTE
	query += `
					GROUP BY e.id
			)

			SELECT t.name, COUNT(*) AS usage_count
			FROM (
					SELECT nt.tag_id FROM notes_tags nt WHERE nt.note_id IN (SELECT id FROM filtered_items WHERE type = 'note')
					UNION ALL
					SELECT et.tag_id FROM expense_tags et WHERE et.expense_id IN (SELECT id FROM filtered_items WHERE type = 'expense')
			) item_tags
			JOIN tags t ON item_tags.tag_id = t.id
	`

	// Only add the exclusion filter if there are hashtags to exclude
	if len(exclusionFilters) > 0 {
		query += ` WHERE t.name NOT IN (` + strings.Join(exclusionFilters, ", ") + `) -- Exclude search hashtags`
	}

	query += `
			GROUP BY t.id, t.name
			ORDER BY usage_count DESC
			LIMIT 10;
	`

	// Execute query
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("error in NoteRepo.GetTopTags: %w", err)
	}
	defer rows.Close()

	var tags []*models.TagUsageDto
	for rows.Next() {
		tag := new(models.TagUsageDto)
		if err := rows.Scan(&tag.Name, &tag.UsageCount); err != nil {
			return nil, err
		}
		tags = append(tags, tag)
	}

	return tags, nil
}

func (r *NoteRepo) GetTopMentions(ctx context.Context, hashtags, mentions []string, userID uint64) ([]*models.MentionUsageDto, error) {
	args := []any{userID}
	argIndex := 2
	var hashtagFilters, mentionFilters, exclusionFilters []string

	// Prepare Hashtag conditions for filtering
	if len(hashtags) > 0 {
		for _, tag := range hashtags {
			hashtagFilters = append(hashtagFilters, fmt.Sprintf("$%d", argIndex))
			args = append(args, tag)
			argIndex++
		}
	}

	// Prepare Mention conditions for filtering
	if len(mentions) > 0 {
		for _, mention := range mentions {
			mentionFilters = append(mentionFilters, fmt.Sprintf("$%d", argIndex))
			exclusionFilters = append(exclusionFilters, fmt.Sprintf("$%d", argIndex)) // For exclusion later
			args = append(args, mention[1:])                                          // Remove '@'
			argIndex++
		}
	}

	query := `
		WITH filtered_items AS (
			SELECT n.id, 'note' AS type
			FROM notes n
			LEFT JOIN notes_tags nt ON n.id = nt.note_id
			LEFT JOIN tags t ON nt.tag_id = t.id
			LEFT JOIN notes_persons np ON n.id = np.note_id
			LEFT JOIN persons p ON np.person_id = p.id
			WHERE n.user_id = $1
	`

	// Apply AND filtering for hashtags
	if len(hashtags) > 0 {
		query += fmt.Sprintf(`
			AND n.id IN (
				SELECT note_id FROM notes_tags nt
				JOIN tags t ON nt.tag_id = t.id
				WHERE t.name IN (%s)
				GROUP BY nt.note_id
				HAVING COUNT(DISTINCT t.name) = %d
			)`, strings.Join(hashtagFilters, ", "), len(hashtags))
	}

	// Apply AND filtering for mentions
	if len(mentions) > 0 {
		query += fmt.Sprintf(`
			AND n.id IN (
				SELECT note_id FROM notes_persons np
				JOIN persons p ON np.person_id = p.id
				WHERE p.name IN (%s)
				GROUP BY np.note_id
				HAVING COUNT(DISTINCT p.name) = %d
			)`, strings.Join(mentionFilters, ", "), len(mentions))
	}

	query += ` GROUP BY n.id

		UNION ALL

		SELECT e.id, 'expense' AS type
		FROM expenses e
		LEFT JOIN expense_tags et ON e.id = et.expense_id
		LEFT JOIN tags t ON et.tag_id = t.id
		LEFT JOIN expense_persons ep ON e.id = ep.expense_id
		LEFT JOIN persons p ON ep.person_id = p.id
		WHERE e.user_id = $1
	`

	// Apply AND filtering for hashtags in expenses
	if len(hashtags) > 0 {
		query += fmt.Sprintf(`
			AND e.id IN (
				SELECT expense_id FROM expense_tags et
				JOIN tags t ON et.tag_id = t.id
				WHERE t.name IN (%s)
				GROUP BY et.expense_id
				HAVING COUNT(DISTINCT t.name) = %d
			)`, strings.Join(hashtagFilters, ", "), len(hashtags))
	}

	// Apply AND filtering for mentions in expenses
	if len(mentions) > 0 {
		query += fmt.Sprintf(`
			AND e.id IN (
				SELECT expense_id FROM expense_persons ep
				JOIN persons p ON ep.person_id = p.id
				WHERE p.name IN (%s)
				GROUP BY ep.expense_id
				HAVING COUNT(DISTINCT p.name) = %d
			)`, strings.Join(mentionFilters, ", "), len(mentions))
	}

	query += ` GROUP BY e.id
		)

		SELECT p.id, p.name, COUNT(*) AS mention_count
		FROM (
			SELECT np.person_id FROM notes_persons np WHERE np.note_id IN (SELECT id FROM filtered_items WHERE type = 'note')
			UNION ALL
			SELECT ep.person_id FROM expense_persons ep WHERE ep.expense_id IN (SELECT id FROM filtered_items WHERE type = 'expense')
		) item_mentions
		JOIN persons p ON item_mentions.person_id = p.id
	`

	// Exclude requested mentions from the result
	if len(mentions) > 0 {
		query += " WHERE p.name NOT IN (" + strings.Join(exclusionFilters, ", ") + ")"
	}

	query += ` GROUP BY p.id, p.name ORDER BY mention_count DESC LIMIT 10;`

	// Execute query
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("error in NoteRepo.GetTopMentions: %w", err)
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

func (r *NoteRepo) GetNotesAndExpenses(ctx context.Context, hashtags, mentions []string, userID uint64) ([]*models.EntryEntity, error) {
	query := `
			WITH filtered_notes AS (
					SELECT n.id, n.user_id, n.content, NULL::NUMERIC AS amount, n.date, 'note' AS type
					FROM notes n
					LEFT JOIN notes_tags nt ON n.id = nt.note_id
					LEFT JOIN tags t ON nt.tag_id = t.id
					LEFT JOIN notes_persons m ON n.id = m.note_id
					LEFT JOIN persons p ON m.person_id = p.id
					WHERE n.user_id = $1
	`

	args := []any{userID}
	argIndex := 2

	// Hashtag filtering (AND logic)
	if len(hashtags) > 0 {
		placeholders := make([]string, len(hashtags))
		for i, tag := range hashtags {
			placeholders[i] = fmt.Sprintf("$%d", argIndex)
			args = append(args, tag)
			argIndex++
		}
		query += fmt.Sprintf(" AND n.id IN (SELECT note_id FROM notes_tags nt JOIN tags t ON nt.tag_id = t.id WHERE t.name IN (%s) GROUP BY nt.note_id HAVING COUNT(DISTINCT t.name) = %d)", strings.Join(placeholders, ", "), len(hashtags))
	}

	// Mention filtering (AND logic)
	if len(mentions) > 0 {
		placeholders := make([]string, len(mentions))
		for i, mention := range mentions {
			placeholders[i] = fmt.Sprintf("$%d", argIndex)
			args = append(args, mention[1:]) // Remove '@' prefix from mention
			argIndex++
		}
		query += fmt.Sprintf(" AND n.id IN (SELECT note_id FROM notes_persons m JOIN persons p ON m.person_id = p.id WHERE p.name IN (%s) GROUP BY m.note_id HAVING COUNT(DISTINCT p.name) = %d)", strings.Join(placeholders, ", "), len(mentions))
	}

	query += " GROUP BY n.id), "

	query += `
			filtered_expenses AS (
					SELECT e.id, e.user_id, e.content, e.amount, e.date, 'expense' AS type
					FROM expenses e
					LEFT JOIN expense_tags et ON e.id = et.expense_id
					LEFT JOIN tags t ON et.tag_id = t.id
					LEFT JOIN expense_persons ep ON e.id = ep.expense_id
					LEFT JOIN persons p ON ep.person_id = p.id
					WHERE e.user_id = $1
	`

	// Hashtag filtering (AND logic) for expenses
	if len(hashtags) > 0 {
		placeholders := make([]string, len(hashtags))
		for i, tag := range hashtags {
			placeholders[i] = fmt.Sprintf("$%d", argIndex)
			args = append(args, tag)
			argIndex++
		}
		query += fmt.Sprintf(" AND e.id IN (SELECT expense_id FROM expense_tags et JOIN tags t ON et.tag_id = t.id WHERE t.name IN (%s) GROUP BY et.expense_id HAVING COUNT(DISTINCT t.name) = %d)", strings.Join(placeholders, ", "), len(hashtags))
	}

	// Mention filtering (AND logic) for expenses
	if len(mentions) > 0 {
		placeholders := make([]string, len(mentions))
		for i, mention := range mentions {
			placeholders[i] = fmt.Sprintf("$%d", argIndex)
			args = append(args, mention[1:])
			argIndex++
		}
		query += fmt.Sprintf(" AND e.id IN (SELECT expense_id FROM expense_persons ep JOIN persons p ON ep.person_id = p.id WHERE p.name IN (%s) GROUP BY ep.expense_id HAVING COUNT(DISTINCT p.name) = %d)", strings.Join(placeholders, ", "), len(mentions))
	}

	query += " GROUP BY e.id)"

	query += `
			SELECT * FROM filtered_notes
			UNION ALL
			SELECT * FROM filtered_expenses
			ORDER BY date DESC;
	`

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("error in GetNotesAndExpenses: %w", err)
	}
	defer rows.Close()

	var results []*models.EntryEntity
	for rows.Next() {
		item := new(models.EntryEntity)
		if err := rows.Scan(&item.ID, &item.UserID, &item.Content, &item.Amount, &item.Date, &item.Type); err != nil {
			return nil, fmt.Errorf("error in GetNotesAndExpenses scanning: %w", err)
		}
		results = append(results, item)
	}

	return results, nil
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
