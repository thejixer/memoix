import React, { useMemo, CSSProperties } from "react";

export interface ActivityHeatmapProps {
  data?: Record<string, boolean | number>; // keys are 'YYYY-MM-DD'
  squareSize?: number;
  gap?: number;
}

function cloneDate(d: Date): Date {
  return new Date(d.getTime());
}

function toISODate(d: Date): string {
  return d.toISOString().split("T")[0];
}

export default function ActivityHeatmap({
  data = {},
  squareSize = 12,
  gap = 4,
}: ActivityHeatmapProps) {
  const { weeks } = useMemo(() => {
    const end = new Date();
    const daysBack = 364;
    const tentativeStart = new Date();
    tentativeStart.setDate(end.getDate() - daysBack);

    const start = cloneDate(tentativeStart);
    const dayOfWeek = start.getDay();
    start.setDate(start.getDate() - dayOfWeek);

    const weeks: Date[][] = [];
    let cursor = cloneDate(start);

    while (cursor <= end) {
      const week: Date[] = [];
      for (let i = 0; i < 7; i++) {
        week.push(cloneDate(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(week);
    }

    return { weeks };
  }, []);

  const activeSet = useMemo(() => {
    const s = new Set<string>();
    for (const k in data) {
      if (!data[k]) continue;
      s.add(k);
    }
    return s;
  }, [data]);

  const containerStyle: CSSProperties = {
    display: "flex",
    gap: `${gap}px`,
    alignItems: "flex-start",
    userSelect: "none",
  };

  const weekStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: `${gap}px`,
  };

  const dayBaseStyle: CSSProperties = {
    width: `${squareSize}px`,
    height: `${squareSize}px`,
    borderRadius: "3px",
    boxSizing: "border-box",
    transition: "transform .08s ease, box-shadow .08s ease",
    flexShrink: 0,
  };

  return (
    <div>
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
              const title = iso;

              const dayStyle: CSSProperties = {
                ...dayBaseStyle,
                background: isActive ? "#33ff33" : "#ebedf0",
                boxShadow: isActive ? "0 0 0 1px rgba(0,0,0,0.06) inset" : "none",
                opacity: isInRange ? 1 : 0.35,
              };

              return (
                <div
                  key={di}
                  className="ah-day"
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
