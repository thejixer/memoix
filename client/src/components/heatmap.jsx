import React, { useMemo } from 'react';
import { toISODate } from '../utils/date';
// Props:
// - data: object where keys are `YYYY-MM-DD` and value is truthy if active that day (or a number)
// - squareSize (optional): size of each square in px, default 12
// - gap (optional): gap between squares in px, default 4
// Example data: { '2025-01-01': true, '2025-02-03': 1 }
function cloneDate(d) {
	return new Date(d.getTime());
}

export default function ActivityHeatmap({
	data = {},
	squareSize = 12,
	gap = 4,
}) {
	const { weeks } = useMemo(() => {
		const end = new Date();
		const daysBack = 364;
		const start = new Date();
		start.setDate(end.getDate() - daysBack);
		start.setDate(start.getDate() - start.getDay());

		const weeks = [];
		let cursor = new Date(start);
		while (cursor <= end) {
			const week = [];
			for (let i = 0; i < 7; i++) {
				week.push(new Date(cursor));
				cursor.setDate(cursor.getDate() + 1);
			}
			weeks.push(week);
		}
		return { weeks };
	}, []);

	const activeSet = useMemo(() => {
		const s = new Set();
		for (const k in data) if (data[k]) s.add(String(k));
		return s;
	}, [data]);

	const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

	// Month labels: map week index -> month string
	const monthLabels = useMemo(() => {
		const labels = {};
		let lastMonth = null;
		weeks.forEach((week, wi) => {
			const month = week[0].toLocaleString('default', { month: 'short' });
			if (month !== lastMonth) {
				labels[wi] = month;
				lastMonth = month;
			}
		});
		return labels; // { 0: "Jan", 5: "Feb", ... }
	}, [weeks]);

	return (
		<div
			style={{
				display: 'grid',
				gridTemplateRows: `${squareSize}px repeat(7, ${squareSize}px)`,
				gridTemplateColumns: `${squareSize * 2}px repeat(${
					weeks.length
				}, ${squareSize}px)`,
				gap: `${gap}px`,
				alignItems: 'center',
				userSelect: 'none',
			}}
		>
			{/* Top-left empty */}
			<div></div>

			{/* Month labels */}
			{weeks.map((_, wi) => (
				<div
					key={`month-${wi}`}
					style={{
						textAlign: 'center',
						fontSize: '0.75rem',
						color: '#33ff33',
						fontFamily: 'monospace',
					}}
				>
					{monthLabels[wi] || ''}
				</div>
			))}

			{/* Weekday labels */}
			{weekdays.map((wd, row) => (
				<React.Fragment key={`row-${row}`}>
					<div
						style={{
							gridRow: row + 2,
							gridColumn: 1,
							fontSize: '0.75rem',
							color: '#33ff33',
							fontFamily: 'monospace',
							textAlign: 'right',
						}}
					>
						{wd}
					</div>
					{/* Squares for this row */}
					{weeks.map((week, col) => {
						const d = week[row];
						const iso = d.toISOString().slice(0, 10);
						const isActive = activeSet.has(iso);
						return (
							<div
								key={`${row}-${col}`}
								style={{
									width: `${squareSize}px`,
									height: `${squareSize}px`,
									background: isActive ? '#33ff33' : '#555',
									borderRadius: '3px',
									boxShadow: isActive ? '0 0 2px #33ff33 inset' : 'none',
									opacity: d <= new Date() ? 1 : 0.35,
								}}
								title={iso}
							/>
						);
					})}
				</React.Fragment>
			))}
		</div>
	);
}
