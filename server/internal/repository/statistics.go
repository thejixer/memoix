package repository

import (
	"context"
	"fmt"
	"strings"
	"time"
)

func (r *NoteRepo) GetFilteredTimestamps(
	ctx context.Context,
	hashtags, mentions, places []string,
	userID uint64,
	startDate, endDate *time.Time,
) ([]time.Time, error) {
	queryParts := QueryParts{
		NoteConditions:    []string{"n.user_id = $1"},
		ExpenseConditions: []string{"e.user_id = $1"},
		Values:            []any{userID},
		Counter:           2,
	}

	// Apply filters (same strategy pattern you already have)
	filters := []FilterStrategy{
		HashtagFilter{Hashtags: hashtags},
		MentionFilter{Mentions: mentions},
		PlaceFilter{Places: places},
	}

	for _, filter := range filters {
		filter.ApplyFilter(&queryParts)
	}

	// Date range filtering
	if startDate != nil {
		queryParts.NoteConditions = append(queryParts.NoteConditions, fmt.Sprintf("n.date >= $%d", queryParts.Counter))
		queryParts.ExpenseConditions = append(queryParts.ExpenseConditions, fmt.Sprintf("e.date >= $%d", queryParts.Counter))
		queryParts.Values = append(queryParts.Values, *startDate)
		queryParts.Counter++
	}
	if endDate != nil {
		queryParts.NoteConditions = append(queryParts.NoteConditions, fmt.Sprintf("n.date <= $%d", queryParts.Counter))
		queryParts.ExpenseConditions = append(queryParts.ExpenseConditions, fmt.Sprintf("e.date <= $%d", queryParts.Counter))
		queryParts.Values = append(queryParts.Values, *endDate)
		queryParts.Counter++
	}

	// Build WHERE clauses
	conditionStringNotes := ""
	conditionStringExpenses := ""

	if len(queryParts.NoteConditions) > 0 {
		conditionStringNotes = "WHERE " + strings.Join(queryParts.NoteConditions, " AND ")
	}
	if len(queryParts.ExpenseConditions) > 0 {
		conditionStringExpenses = "WHERE " + strings.Join(queryParts.ExpenseConditions, " AND ")
	}

	query := fmt.Sprintf(`
		WITH filtered_notes AS (
			SELECT n.date
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
			SELECT e.date
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
		SELECT date FROM filtered_notes
		UNION ALL
		SELECT date FROM filtered_expenses
		ORDER BY date ASC;`, conditionStringNotes, conditionStringExpenses)

	rows, err := r.db.QueryContext(ctx, query, queryParts.Values...)
	if err != nil {
		return nil, fmt.Errorf("GetFilteredTimestamps query error: %w", err)
	}
	defer rows.Close()

	var dates []time.Time
	for rows.Next() {
		var t time.Time
		if err := rows.Scan(&t); err != nil {
			return nil, fmt.Errorf("GetFilteredTimestamps scan error: %w", err)
		}
		dates = append(dates, t)
	}

	return dates, nil
}
