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
			date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
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

func (r *NoteRepo) GetTopTags(
	ctx context.Context,
	hashtags, mentions, places []string,
	since, until *time.Time,
	userID uint64,
	mode string, // "both" (default), "note", or "expense"
) ([]*models.TagUsageDto, error) {
	if mode != "" && mode != "both" && mode != "note" && mode != "expense" {
		return nil, fmt.Errorf("invalid mode: %s (must be '', 'both', 'note', or 'expense')", mode)
	}
	// Normalize mode
	if mode == "" {
		mode = "both"
	}

	includeNotes := mode == "both" || mode == "note"
	includeExpenses := mode == "both" || mode == "expense"

	queryParts := QueryParts{
		NoteConditions:    []string{"n.user_id = $1"},
		ExpenseConditions: []string{"e.user_id = $1"},
		Values:            []any{userID},
		Counter:           2,
	}

	// Apply all filters — unified strategy for hashtags, mentions, and places
	filters := []FilterStrategy{
		HashtagFilter{Hashtags: hashtags},
		MentionFilter{Mentions: mentions},
		PlaceFilter{Places: places},
	}

	for _, filter := range filters {
		filter.ApplyFilter(&queryParts)
	}

	// Apply since/until independently
	if since != nil {
		queryParts.NoteConditions = append(queryParts.NoteConditions, fmt.Sprintf("n.date >= $%d", queryParts.Counter))
		queryParts.ExpenseConditions = append(queryParts.ExpenseConditions, fmt.Sprintf("e.date >= $%d", queryParts.Counter))
		queryParts.Values = append(queryParts.Values, *since)
		queryParts.Counter++
	}

	if until != nil {
		queryParts.NoteConditions = append(queryParts.NoteConditions, fmt.Sprintf("n.date <= $%d", queryParts.Counter))
		queryParts.ExpenseConditions = append(queryParts.ExpenseConditions, fmt.Sprintf("e.date <= $%d", queryParts.Counter))
		queryParts.Values = append(queryParts.Values, *until)
		queryParts.Counter++
	}

	// Build WHERE conditions
	conditionStringNotes := ""
	conditionStringExpenses := ""
	if len(queryParts.NoteConditions) > 0 {
		conditionStringNotes = "WHERE " + strings.Join(queryParts.NoteConditions, " AND ")
	}
	if len(queryParts.ExpenseConditions) > 0 {
		conditionStringExpenses = "WHERE " + strings.Join(queryParts.ExpenseConditions, " AND ")
	}

	// Exclude current hashtags from result
	excludeTags := ""
	if len(hashtags) > 0 {
		placeholders := make([]string, len(hashtags))
		for i, tag := range hashtags {
			queryParts.Values = append(queryParts.Values, strings.ToLower(tag))
			placeholders[i] = fmt.Sprintf("$%d", queryParts.Counter)
			queryParts.Counter++
		}
		excludeTags = "WHERE LOWER(t.name) NOT IN (" + strings.Join(placeholders, ", ") + ")"
	}

	// Build parts dynamically based on mode
	var unionParts []string

	if includeNotes {
		notePart := fmt.Sprintf(`
			SELECT n.id, 'note' AS type
			FROM notes n
			LEFT JOIN notes_tags nt ON n.id = nt.note_id
			LEFT JOIN tags t ON nt.tag_id = t.id
			LEFT JOIN notes_persons np ON n.id = np.note_id
			LEFT JOIN persons p ON np.person_id = p.id
			LEFT JOIN notes_places npl ON n.id = npl.note_id
			LEFT JOIN places pl ON npl.place_id = pl.id
			%s
			GROUP BY n.id
		`, conditionStringNotes)
		unionParts = append(unionParts, notePart)
	}

	if includeExpenses {
		expensePart := fmt.Sprintf(`
			SELECT e.id, 'expense' AS type
			FROM expenses e
			LEFT JOIN expense_tags et ON e.id = et.expense_id
			LEFT JOIN tags t ON et.tag_id = t.id
			LEFT JOIN expense_persons ep ON e.id = ep.expense_id
			LEFT JOIN persons p ON ep.person_id = p.id
			LEFT JOIN expense_places epl ON e.id = epl.expense_id
			LEFT JOIN places pl ON epl.place_id = pl.id
			%s
			GROUP BY e.id
		`, conditionStringExpenses)
		unionParts = append(unionParts, expensePart)
	}

	// Nothing to query
	if len(unionParts) == 0 {
		return []*models.TagUsageDto{}, nil
	}

	filteredItemsQuery := strings.Join(unionParts, "\nUNION ALL\n")

	// Build tag union part
	var tagUnionParts []string
	if includeNotes {
		tagUnionParts = append(tagUnionParts, `
			SELECT nt.tag_id
			FROM notes_tags nt
			WHERE nt.note_id IN (SELECT id FROM filtered_items WHERE type = 'note')
		`)
	}
	if includeExpenses {
		tagUnionParts = append(tagUnionParts, `
			SELECT et.tag_id
			FROM expense_tags et
			WHERE et.expense_id IN (SELECT id FROM filtered_items WHERE type = 'expense')
		`)
	}
	tagUnion := strings.Join(tagUnionParts, "\nUNION ALL\n")

	// Final query
	query := fmt.Sprintf(`
		WITH filtered_items AS (
			%s
		)
		SELECT t.name, COUNT(*) AS usage_count
		FROM (
			%s
		) item_tags
		JOIN tags t ON item_tags.tag_id = t.id
		%s
		GROUP BY t.id, t.name
		ORDER BY usage_count DESC
		LIMIT 10;
	`, filteredItemsQuery, tagUnion, excludeTags)

	// Execute query
	rows, err := r.db.QueryContext(ctx, query, queryParts.Values...)
	if err != nil {
		return nil, fmt.Errorf("error in GetTopTags: %w", err)
	}
	defer rows.Close()

	var tags []*models.TagUsageDto
	for rows.Next() {
		tag := new(models.TagUsageDto)
		if err := rows.Scan(&tag.Name, &tag.UsageCount); err != nil {
			return nil, fmt.Errorf("error scanning GetTopTags: %w", err)
		}
		tags = append(tags, tag)
	}

	return tags, nil
}


func (r *NoteRepo) GetTopMentions(
	ctx context.Context,
	hashtags, mentions, places []string,
	since, until *time.Time,
	userID uint64,
	mode string, // "", "both", "note", or "expense"
) ([]*models.MentionUsageDto, error) {

	// ✅ Validate mode
	if mode != "" && mode != "both" && mode != "note" && mode != "expense" {
		return nil, fmt.Errorf("invalid mode: %s (must be '', 'both', 'note', or 'expense')", mode)
	}

	// Normalize mode
	if mode == "" {
		mode = "both"
	}

	includeNotes := mode == "both" || mode == "note"
	includeExpenses := mode == "both" || mode == "expense"

	queryParts := QueryParts{
		NoteConditions:    []string{"n.user_id = $1"},
		ExpenseConditions: []string{"e.user_id = $1"},
		Values:            []any{userID},
		Counter:           2,
	}

	// ✅ Apply unified filter strategy for hashtags, mentions, and places
	filters := []FilterStrategy{
		HashtagFilter{Hashtags: hashtags},
		MentionFilter{Mentions: mentions},
		PlaceFilter{Places: places},
	}
	for _, filter := range filters {
		filter.ApplyFilter(&queryParts)
	}

	// ✅ Apply since/until independently
	if since != nil {
		queryParts.NoteConditions = append(queryParts.NoteConditions, fmt.Sprintf("n.date >= $%d", queryParts.Counter))
		queryParts.ExpenseConditions = append(queryParts.ExpenseConditions, fmt.Sprintf("e.date >= $%d", queryParts.Counter))
		queryParts.Values = append(queryParts.Values, *since)
		queryParts.Counter++
	}

	if until != nil {
		queryParts.NoteConditions = append(queryParts.NoteConditions, fmt.Sprintf("n.date <= $%d", queryParts.Counter))
		queryParts.ExpenseConditions = append(queryParts.ExpenseConditions, fmt.Sprintf("e.date <= $%d", queryParts.Counter))
		queryParts.Values = append(queryParts.Values, *until)
		queryParts.Counter++
	}

	// Build WHERE conditions
	conditionStringNotes := ""
	conditionStringExpenses := ""
	if len(queryParts.NoteConditions) > 0 {
		conditionStringNotes = "WHERE " + strings.Join(queryParts.NoteConditions, " AND ")
	}
	if len(queryParts.ExpenseConditions) > 0 {
		conditionStringExpenses = "WHERE " + strings.Join(queryParts.ExpenseConditions, " AND ")
	}

	// ✅ Build mode-based subqueries dynamically
	var unionParts []string

	if includeNotes {
		notePart := fmt.Sprintf(`
			SELECT n.id, 'note' AS type
			FROM notes n
			LEFT JOIN notes_tags nt ON n.id = nt.note_id
			LEFT JOIN tags t ON nt.tag_id = t.id
			LEFT JOIN notes_persons np ON n.id = np.note_id
			LEFT JOIN persons p ON np.person_id = p.id
			LEFT JOIN notes_places npl ON n.id = npl.note_id
			LEFT JOIN places pl ON npl.place_id = pl.id
			%s
			GROUP BY n.id
		`, conditionStringNotes)
		unionParts = append(unionParts, notePart)
	}

	if includeExpenses {
		expensePart := fmt.Sprintf(`
			SELECT e.id, 'expense' AS type
			FROM expenses e
			LEFT JOIN expense_tags et ON e.id = et.expense_id
			LEFT JOIN tags t ON et.tag_id = t.id
			LEFT JOIN expense_persons ep ON e.id = ep.expense_id
			LEFT JOIN persons p ON ep.person_id = p.id
			LEFT JOIN expense_places epl ON e.id = epl.expense_id
			LEFT JOIN places pl ON epl.place_id = pl.id
			%s
			GROUP BY e.id
		`, conditionStringExpenses)
		unionParts = append(unionParts, expensePart)
	}

	// Nothing to query
	if len(unionParts) == 0 {
		return []*models.MentionUsageDto{}, nil
	}

	filteredItemsQuery := strings.Join(unionParts, "\nUNION ALL\n")

	// ✅ Build tag union part dynamically based on mode
	var mentionUnionParts []string
	if includeNotes {
		mentionUnionParts = append(mentionUnionParts, `
			SELECT np.person_id
			FROM notes_persons np
			WHERE np.note_id IN (SELECT id FROM filtered_items WHERE type = 'note')
		`)
	}
	if includeExpenses {
		mentionUnionParts = append(mentionUnionParts, `
			SELECT ep.person_id
			FROM expense_persons ep
			WHERE ep.expense_id IN (SELECT id FROM filtered_items WHERE type = 'expense')
		`)
	}
	mentionUnion := strings.Join(mentionUnionParts, "\nUNION ALL\n")

	// ✅ Main query — uses unified filtering and includes places
	query := fmt.Sprintf(`
		WITH filtered_items AS (
			%s
		)
		SELECT p.id, p.name, COUNT(*) AS mention_count
		FROM (
			%s
		) item_mentions
		JOIN persons p ON item_mentions.person_id = p.id
	`, filteredItemsQuery, mentionUnion)

	// ✅ Exclude search mentions (so they don't appear in top list)
	if len(mentions) > 0 {
		exclusion := make([]string, 0, len(mentions))
		for _, m := range mentions {
			exclusion = append(exclusion, fmt.Sprintf("$%d", queryParts.Counter))
			queryParts.Values = append(queryParts.Values, m[1:]) // remove '@'
			queryParts.Counter++
		}
		query += fmt.Sprintf(" WHERE p.name NOT IN (%s)", strings.Join(exclusion, ", "))
	}

	query += `
		GROUP BY p.id, p.name
		ORDER BY mention_count DESC
		LIMIT 10;
	`

	// ✅ Execute query
	rows, err := r.db.QueryContext(ctx, query, queryParts.Values...)
	if err != nil {
		return nil, fmt.Errorf("error in NoteRepo.GetTopMentions: %w", err)
	}
	defer rows.Close()

	var mentionsList []*models.MentionUsageDto
	for rows.Next() {
		mention := new(models.MentionUsageDto)
		if err := rows.Scan(&mention.ID, &mention.Name, &mention.UsageCount); err != nil {
			return nil, fmt.Errorf("error scanning GetTopMentions: %w", err)
		}
		mentionsList = append(mentionsList, mention)
	}

	return mentionsList, nil
}


func (r *NoteRepo) QueryTags(ctx context.Context, userId uint64, text string, limit, offset *int) ([]*models.TagDto, error) {
	query := `
		SELECT name
		FROM tags
		WHERE user_id = $1
		  AND name ILIKE $2
		ORDER BY name ASC
	`
	args := []interface{}{userId, "%" + text + "%"}

	// apply LIMIT + OFFSET only if both are provided
	if limit != nil && offset != nil {
		query += " LIMIT $3 OFFSET $4"
		args = append(args, *limit, *offset)
	}

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tags []*models.TagDto
	for rows.Next() {
		var t models.TagDto
		if err := rows.Scan(&t.Name); err != nil {
			return nil, err
		}
		tags = append(tags, &t)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return tags, nil
}

func (r *NoteRepo) QueryPlaces(ctx context.Context, userId uint64, text string, limit, offset *int) ([]*models.PlaceDto, error) {
	query := `
		SELECT name
		FROM places
		WHERE user_id = $1
		  AND name ILIKE $2
		ORDER BY name ASC
	`
	args := []interface{}{userId, "%" + text + "%"}

	// apply LIMIT + OFFSET only if both are provided
	if limit != nil && offset != nil {
		query += " LIMIT $3 OFFSET $4"
		args = append(args, *limit, *offset)
	}

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var places []*models.PlaceDto
	for rows.Next() {
		var p models.PlaceDto
		if err := rows.Scan(&p.Name); err != nil {
			return nil, err
		}
		places = append(places, &p)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return places, nil
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
