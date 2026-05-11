import React from "react";
import { Box, Typography } from "@material-ui/core";
import { useTheme } from "@material-ui/core/styles";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { fmtInt, fmtShortDate } from "./surveyUtils";
import { surveyPalette } from "./surveyTheme";

// Interviews completed per day (from the daily snapshot deltas).
function DailyProductivityChart({ data = [], height = 220, formatMessage }) {
  const t = (id, fallback) => (formatMessage ? (formatMessage(id) === id ? fallback : formatMessage(id)) : fallback);
  const theme = useTheme();
  const pal = surveyPalette(theme);
  const hasData = data.some((d) => (d.count || 0) > 0);
  if (!data.length || !hasData) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" style={{ height, color: pal.textSecondary, textAlign: "center", padding: 16 }}>
        <Typography variant="body2">
          {t("survey.dashboard.dailyEmpty", "No daily figures yet — this fills in once snapshots are recorded on subsequent days.")}
        </Typography>
      </Box>
    );
  }
  const rows = data.map((d) => ({ date: fmtShortDate(d.date), count: d.count || 0 }));
  return (
    <Box style={{ width: "100%", height }} role="img" aria-label={t("survey.dashboard.dailyProductivity", "Interviews completed per day")}>
      <ResponsiveContainer>
        <BarChart data={rows} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={pal.greyBg} vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: pal.textSecondary }} interval="preserveStartEnd" minTickGap={20} />
          <YAxis tick={{ fontSize: 10, fill: pal.textSecondary }} width={48} tickFormatter={fmtInt} allowDecimals={false} />
          <Tooltip formatter={(v) => [fmtInt(v), t("survey.dashboard.completedWord", "completed")]} cursor={{ fill: pal.greyBg }} />
          <Bar dataKey="count" fill={pal.primary} radius={[3, 3, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}

export default DailyProductivityChart;
