import React from "react";
import { Box, Paper, Typography } from "@material-ui/core";
import { useTheme } from "@material-ui/core/styles";
import {
  ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { fmtInt } from "./surveyUtils";
import { surveyPalette } from "./surveyTheme";
import { MOVEMENT_KEYS, fmtDay } from "./surveyTrends";

const LABELS = {
  completed: "Completed",
  supervisorApproved: "Approved by supervisor",
  hqApproved: "Approved by HQ",
  rejected: "Rejected",
};

function MovementTooltip({
  active, payload, label, colors, t,
}) {
  if (!active || !payload || !payload.length) return null;
  const row = payload[0].payload;
  return (
    <Paper style={{ padding: "8px 12px", fontSize: 12 }}>
      <Typography style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
        {row.days > 1 ? `${fmtDay(row.from)} → ${fmtDay(label, true)} (${row.days} ${t("survey.dashboard.daysWord", "days")})` : fmtDay(label, true)}
      </Typography>
      {MOVEMENT_KEYS.map((k) => (
        <Box key={k} display="flex" justifyContent="space-between" style={{ gap: 16 }}>
          <span style={{ color: colors[k] }}>{t(`survey.dashboard.move.${k}`, LABELS[k])}</span>
          <span>
            {fmtInt(row[`${k}Total`])}
            {row.days > 1 ? ` · ${fmtInt(row[k])}/${t("survey.dashboard.dayShort", "day")}` : ""}
          </span>
        </Box>
      ))}
    </Paper>
  );
}

function StageMovementChart({ rows = [], height = 420, formatMessage }) {
  const t = (id, fallback) => (formatMessage ? (formatMessage(id) === id ? fallback : formatMessage(id)) : fallback);
  const theme = useTheme();
  const pal = surveyPalette(theme);
  const colors = {
    completed: pal.primaryLight,
    supervisorApproved: pal.primary,
    hqApproved: pal.primaryDark,
    rejected: pal.error,
  };

  if (!rows.length) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" style={{ height, color: pal.textSecondary, textAlign: "center", padding: 16 }}>
        <Typography variant="body2">
          {t("survey.dashboard.movementEmpty", "No snapshot intervals in this period.")}
        </Typography>
      </Box>
    );
  }

  return (
    <Box style={{ width: "100%", height, display: "flex", flexDirection: "column" }} role="img" aria-label={t("survey.dashboard.movement", "Movement between snapshots")}>
      <Box style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer>
          <BarChart data={rows} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={pal.greyBg} vertical={false} />
            <XAxis dataKey="t" tickFormatter={(v) => fmtDay(v)} tick={{ fontSize: 11, fill: pal.textSecondary }} minTickGap={16} />
            <YAxis tick={{ fontSize: 11, fill: pal.textSecondary }} width={56} tickFormatter={fmtInt} allowDecimals={false} />
            <Tooltip content={<MovementTooltip colors={colors} t={t} />} cursor={{ fill: pal.greyBg }} />
            <Legend formatter={(k) => t(`survey.dashboard.move.${k}`, LABELS[k])} iconType="square" wrapperStyle={{ fontSize: 12 }} />
            {MOVEMENT_KEYS.map((k) => (
              <Bar key={k} dataKey={k} fill={colors[k]} radius={[3, 3, 0, 0]} isAnimationActive={false}>
                {rows.map((r) => <Cell key={r.t} fillOpacity={r.days > 1 ? 0.4 : 1} />)}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </Box>
      <Typography style={{ fontSize: "0.75rem", color: pal.textSecondary, marginTop: 4 }}>
        {t("survey.dashboard.movementGapNote", "Faded bars span a gap between snapshots and show the daily average.")}
      </Typography>
    </Box>
  );
}

export default StageMovementChart;
