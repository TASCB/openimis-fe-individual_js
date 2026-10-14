import React from "react";
import { Box, Typography } from "@material-ui/core";
import { useTheme, lighten } from "@material-ui/core/styles";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { fmtInt } from "./surveyUtils";
import { surveyPalette } from "./surveyTheme";
import {
  PIPELINE_KEYS, pipelineGroups, toTime, fmtDay,
} from "./surveyTrends";

export const PIPELINE_LABELS = {
  inProgress: "In progress",
  awaitingSupervisor: "Awaiting supervisor",
  awaitingHq: "Awaiting HQ",
  approved: "Approved",
  rejected: "Rejected",
};

function PipelineHistoryChart({ history = [], height = 420, formatMessage }) {
  const t = (id, fallback) => (formatMessage ? (formatMessage(id) === id ? fallback : formatMessage(id)) : fallback);
  const theme = useTheme();
  const pal = surveyPalette(theme);
  const colors = {
    inProgress: pal.greyLight,
    awaitingSupervisor: lighten(pal.warning, 0.4),
    awaitingHq: pal.warning,
    approved: pal.primaryDark,
    rejected: pal.error,
  };

  if (history.length < 2) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" style={{ height, color: pal.textSecondary, textAlign: "center", padding: 16 }}>
        <Typography variant="body2">
          {t("survey.dashboard.historyEmpty", "Not enough snapshots in this period to draw a trend.")}
        </Typography>
      </Box>
    );
  }

  const data = history.map((s) => ({ t: toTime(s.date), ...pipelineGroups(s) }));
  const label = (k) => t(`survey.dashboard.group.${k}`, PIPELINE_LABELS[k]);

  return (
    <Box style={{ width: "100%", height }} role="img" aria-label={t("survey.dashboard.pipelineHistory", "Pipeline over time")}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={pal.greyBg} vertical={false} />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(v) => fmtDay(v)}
            tick={{ fontSize: 11, fill: pal.textSecondary }}
            minTickGap={28}
          />
          <YAxis tick={{ fontSize: 11, fill: pal.textSecondary }} width={56} tickFormatter={fmtInt} />
          <Tooltip
            labelFormatter={(v) => fmtDay(v, true)}
            formatter={(v, k) => [fmtInt(v), label(k)]}
          />
          <Legend formatter={(k) => label(k)} iconType="square" wrapperStyle={{ fontSize: 12 }} />
          {PIPELINE_KEYS.map((k) => (
            <Area
              key={k}
              dataKey={k}
              stackId="1"
              type="linear"
              stroke={colors[k]}
              fill={colors[k]}
              fillOpacity={0.85}
              dot={{ r: 2.5, fill: colors[k], strokeWidth: 0 }}
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  );
}

export default PipelineHistoryChart;
