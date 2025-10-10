package repository

import (
	"context"
	"errors"
	"fmt"
	"memoix-server/internal/models"
	"strings"
)

type FilterStrategy interface {
	ApplyFilter(queryParts *QueryParts)
}

type QueryParts struct {
	NoteConditions    []string
	ExpenseConditions []string
	Values            []any
	Counter           int
}

type HashtagFilter struct {
	Hashtags []string
}

func (h HashtagFilter) ApplyFilter(queryParts *QueryParts) {
	if len(h.Hashtags) == 0 {
		return
	}
	placeholders := placeholders(len(h.Hashtags), &queryParts.Counter)

	queryParts.NoteConditions = append(queryParts.NoteConditions, fmt.Sprintf(
		"n.id IN (SELECT note_id FROM notes_tags nt JOIN tags t ON nt.tag_id = t.id WHERE t.name IN (%s) GROUP BY nt.note_id HAVING COUNT(DISTINCT t.name) = %d)",
		placeholders, len(h.Hashtags)),
	)
	queryParts.ExpenseConditions = append(queryParts.ExpenseConditions, fmt.Sprintf(
		"e.id IN (SELECT expense_id FROM expense_tags et JOIN tags t ON et.tag_id = t.id WHERE t.name IN (%s) GROUP BY et.expense_id HAVING COUNT(DISTINCT t.name) = %d)",
		placeholders, len(h.Hashtags)),
	)

	for _, hashtag := range h.Hashtags {
		queryParts.Values = append(queryParts.Values, hashtag)
	}
}

type MentionFilter struct {
	Mentions []string
}

func (m MentionFilter) ApplyFilter(queryParts *QueryParts) {
	if len(m.Mentions) == 0 {
		return
	}
	placeholders := placeholders(len(m.Mentions), &queryParts.Counter)
	queryParts.NoteConditions = append(queryParts.NoteConditions, fmt.Sprintf(
		"n.id IN (SELECT note_id FROM notes_persons m JOIN persons p ON m.person_id = p.id WHERE p.name IN (%s) GROUP BY m.note_id HAVING COUNT(DISTINCT p.name) = %d)",
		placeholders, len(m.Mentions)),
	)
	queryParts.ExpenseConditions = append(queryParts.ExpenseConditions, fmt.Sprintf(
		"e.id IN (SELECT expense_id FROM expense_persons m JOIN persons p ON m.person_id = p.id WHERE p.name IN (%s) GROUP BY m.expense_id HAVING COUNT(DISTINCT p.name) = %d)",
		placeholders, len(m.Mentions)),
	)

	for _, mention := range m.Mentions {
		queryParts.Values = append(queryParts.Values, mention[1:])
	}
}

type PlaceFilter struct {
	Places []string
}

func (p PlaceFilter) ApplyFilter(queryParts *QueryParts) {
	if len(p.Places) == 0 {
		return
	}
	placeholders := placeholders(len(p.Places), &queryParts.Counter)

	queryParts.NoteConditions = append(queryParts.NoteConditions, fmt.Sprintf(
		"n.id IN (SELECT note_id FROM notes_places np JOIN places pl ON np.place_id = pl.id WHERE pl.name IN (%s) GROUP BY np.note_id HAVING COUNT(DISTINCT pl.name) = %d)",
		placeholders, len(p.Places)),
	)
	queryParts.ExpenseConditions = append(queryParts.ExpenseConditions, fmt.Sprintf(
		"e.id IN (SELECT expense_id FROM expense_places ex_pl JOIN places pl ON ex_pl.place_id = pl.id WHERE pl.name IN (%s) GROUP BY ex_pl.expense_id HAVING COUNT(DISTINCT pl.name) = %d)",
		placeholders, len(p.Places)),
	)

	for _, place := range p.Places {
		queryParts.Values = append(queryParts.Values, place)
	}
}

func (r *NoteRepo) GetNotesAndExpenses(ctx context.Context, hashtags, mentions, places []string, userID uint64) ([]*models.EntryEntity, error) {
	queryParts := QueryParts{
		NoteConditions:    []string{"n.user_id = $1"},
		ExpenseConditions: []string{"e.user_id = $1"},
		Values:            []any{userID},
		Counter:           2,
	}

	filters := []FilterStrategy{
		HashtagFilter{Hashtags: hashtags},
		MentionFilter{Mentions: mentions},
		PlaceFilter{Places: places},
	}

	for _, filter := range filters {
		filter.ApplyFilter(&queryParts)
	}

	conditionStringNotes := ""
	conditionStringExpenses := ""

	if len(queryParts.ExpenseConditions) != len(queryParts.NoteConditions) {
		return nil, errors.New("something went wrong")
	}

	if len(queryParts.ExpenseConditions) > 0 && len(queryParts.NoteConditions) > 0 {
		conditionStringNotes = "WHERE " + strings.Join(queryParts.NoteConditions, " AND ")
		conditionStringExpenses = "WHERE " + strings.Join(queryParts.ExpenseConditions, " AND ")
	}

	query := fmt.Sprintf(`
		WITH filtered_notes AS (
				SELECT n.id, n.user_id, n.content, NULL::NUMERIC AS amount, n.date, 'note' AS type
				FROM notes n
				LEFT JOIN notes_tags nt ON n.id = nt.note_id
				LEFT JOIN tags t ON nt.tag_id = t.id
				LEFT JOIN notes_persons m ON n.id = m.note_id
				LEFT JOIN persons p ON m.person_id = p.id
				LEFT JOIN notes_places np ON n.id = np.note_id
				LEFT JOIN places pl ON np.place_id = pl.id
				%s
				GROUP BY n.id
		),
		filtered_expenses AS (
				SELECT e.id, e.user_id, e.content, e.amount, e.date, 'expense' AS type
				FROM expenses e
				LEFT JOIN expense_tags et ON e.id = et.expense_id
				LEFT JOIN tags t ON et.tag_id = t.id
				LEFT JOIN expense_persons ep ON e.id = ep.expense_id
				LEFT JOIN persons p ON ep.person_id = p.id
				LEFT JOIN expense_places ex_pl ON e.id = ex_pl.expense_id
				LEFT JOIN places pl ON ex_pl.place_id = pl.id
				%s
				GROUP BY e.id
		)
		SELECT * FROM filtered_notes
		UNION ALL
		SELECT * FROM filtered_expenses
		ORDER BY date DESC;`, conditionStringNotes, conditionStringExpenses)

	// Execute Query
	rows, err := r.db.QueryContext(ctx, query, queryParts.Values...)
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

func placeholders(n int, counter *int) string {
	placeholders := make([]string, n)
	for i := range placeholders {
		placeholders[i] = fmt.Sprintf("$%d", *counter)
		(*counter)++
	}
	return strings.Join(placeholders, ", ")
}
