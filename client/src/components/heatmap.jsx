import React, { useMemo } from "react";
import { toISODate } from "../utils/date";
// Props:
// - data: object where keys are `YYYY-MM-DD` and value is truthy if active that day (or a number)
// - squareSize (optional): size of each square in px, default 12
// - gap (optional): gap between squares in px, default 4
// Example data: { '2025-01-01': true, '2025-02-03': 1 }
function cloneDate(d) {
  return new Date(d.getTime());
}

export default function ActivityHeatmap({ data = {}, squareSize = 12, gap = 4 }) {
  // Build the grid days similar to GitHub's layout: columns = weeks, rows = weekdays (Sun..Sat)
  const { weeks, startDate, endDate } = useMemo(() => {
    const end = new Date();
    // last 365 days (including today)
    const daysBack = 364;
    const tentativeStart = new Date();
    tentativeStart.setDate(end.getDate() - daysBack);

    // Align start to previous Sunday so we start full weeks like GitHub
    const start = cloneDate(tentativeStart);
    const dayOfWeek = start.getDay(); // 0 = Sunday
    start.setDate(start.getDate() - dayOfWeek);

    const weeks = [];
    let cursor = cloneDate(start);
    while (cursor <= end) {
      // build one week (Sunday..Saturday)
      const week = [];
      for (let i = 0; i < 7; i++) {
        week.push(new Date(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(week);
    }

    return { weeks, startDate: start, endDate: end };
  }, []);

  const activeSet = useMemo(() => {
    // normalize keys to ISO date strings
    const s = new Set();
    for (const k in data) {
      try {
        // allow either Date objects or strings
        if (!data[k]) continue; // treat falsy as inactive
        const iso = String(k);
        s.add(iso);
      } catch (e) {
        // ignore
      }
    }
    return s;
  }, [data]);

  // Inline styles that depend on props
  const containerStyle = {
    display: "flex",
    gap: `${gap}px`,
    alignItems: "flex-start",
    userSelect: "none",
  };

  const weekStyle = {
    display: "flex",
    flexDirection: "column",
    gap: `${gap}px`,
  };

  const dayBaseStyle = {
    width: `${squareSize}px`,
    height: `${squareSize}px`,
    borderRadius: "3px",
    boxSizing: "border-box",
    transition: "transform .08s ease, box-shadow .08s ease",
    flexShrink: 0,
  };

  return (
    <div>
      {/* Small injected styles for tooltip behaviour and hover */}
      <style>{`
        .ah-day:hover { transform: scale(1.15); z-index: 2; }
        .ah-tooltip { pointer-events: none; }
      `}</style>

      <div style={containerStyle} aria-label="activity-heatmap">
        {weeks.map((week, wi) => (
          <div key={wi} style={weekStyle} className="ah-week">
            {week.map((d, di) => {
              const iso = toISODate(d);
              const isActive = activeSet.has(iso);
              const isInRange = d <= new Date();
              const title = `${iso}`;

              const dayStyle = {
                ...dayBaseStyle,
                background: isActive ? "#33ff33" : "#ebedf0",
                boxShadow: isActive ? "0 0 0 1px rgba(0,0,0,0.06) inset" : "none",
                opacity: isInRange ? 1 : 0.35,
              };

              return (
                <div
                  key={di}
                  className={`ah-day`}
                  title={title}
                  style={dayStyle}
                  aria-label={title}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}