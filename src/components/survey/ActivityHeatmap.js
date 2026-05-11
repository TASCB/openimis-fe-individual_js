import React from "react";
import { Box, Typography, Tooltip } from "@material-ui/core";
import { useTheme, fade } from "@material-ui/core/styles";
import { surveyPalette } from "./surveyTheme";

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// 7 (day-of-week) × 24 (hour) grid of enumerator activity (interview last-entry times),
// over the cached sample. A translucent-primary scale keeps it on the theme colour.
function ActivityHeatmap({ cells = [], formatMessage }) {
  const t = (id, fallback) => (formatMessage ? (formatMessage(id) === id ? fallback : formatMessage(id)) : fallback);
  const theme = useTheme();
  const pal = surveyPalette(theme);
  const shade = (ratio) => (ratio <= 0 ? pal.greyBg : fade(pal.primary, Math.min(1, 0.12 + ratio * 0.78)));

  const grid = {};
  let max = 0;
  let totalEvents = 0;
  (cells || []).forEach((c) => {
    const v = c.count || 0;
    grid[`${c.dayOfWeek}_${c.hour}`] = v;
    totalEvents += v;
    if (v > max) max = v;
  });
  if (!cells.length || totalEvents === 0) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" style={{ height: 180, color: pal.textSecondary, textAlign: "center", padding: 16 }}>
        <Typography variant="body2">
          {t("survey.dashboard.heatmapEmpty", "No recent activity timestamps in the synced sample yet.")}
        </Typography>
      </Box>
    );
  }
  const cell = 15;
  return (
    <Box style={{ overflowX: "auto" }} role="img" aria-label={t("survey.dashboard.heatmap", "Enumerator activity by day of week and hour")}>
      <Box display="flex" style={{ marginLeft: 34 }}>
        {Array.from({ length: 24 }).map((_, h) => (
          <Box key={h} style={{ width: cell, textAlign: "center" }}>
            <Typography variant="caption" style={{ fontSize: 8, color: pal.textSecondary }}>{h % 3 === 0 ? h : ""}</Typography>
          </Box>
        ))}
      </Box>
      {DOW.map((label, dow) => (
        <Box key={label} display="flex" alignItems="center" style={{ marginBottom: 2 }}>
          <Box style={{ width: 30 }}>
            <Typography variant="caption" style={{ fontSize: 9, color: pal.textSecondary }}>{label}</Typography>
          </Box>
          {Array.from({ length: 24 }).map((_, h) => {
            const v = grid[`${dow}_${h}`] || 0;
            return (
              <Tooltip key={h} title={`${label} ${String(h).padStart(2, "0")}:00 — ${v} ${t("survey.dashboard.eventsWord", "event(s)")}`}>
                <Box style={{ width: cell - 2, height: cell - 2, margin: 1, background: shade(max ? v / max : 0), borderRadius: 2 }} />
              </Tooltip>
            );
          })}
        </Box>
      ))}
      <Box display="flex" alignItems="center" style={{ marginTop: 6, marginLeft: 34, gap: 4 }}>
        <Typography variant="caption" style={{ fontSize: 9, color: pal.textSecondary }}>{t("survey.dashboard.less", "less")}</Typography>
        {[0, 0.25, 0.5, 0.75, 1].map((r) => (
          <Box key={r} style={{ width: 12, height: 12, background: shade(r), borderRadius: 2 }} />
        ))}
        <Typography variant="caption" style={{ fontSize: 9, color: pal.textSecondary }}>{t("survey.dashboard.more", "more")}</Typography>
      </Box>
    </Box>
  );
}

export default ActivityHeatmap;
