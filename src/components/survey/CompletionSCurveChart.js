import React from "react";
import { Box, Typography } from "@material-ui/core";
import { useTheme } from "@material-ui/core/styles";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from "recharts";
import { fmtInt, fmtShortDate } from "./surveyUtils";
import { surveyPalette } from "./surveyTheme";

// Cumulative completion ("S-curve") vs. a flat planned-target line. Built from the
// daily snapshot history, so it fills in over time — empty/“building” state until then.
function CompletionSCurveChart({ series = [], target = 0, height = 240, formatMessage }) {
  const t = (id, fallback) => (formatMessage ? (formatMessage(id) === id ? fallback : formatMessage(id)) : fallback);
  const theme = useTheme();
  const pal = surveyPalette(theme);
  const hasData = series.some((d) => (d.cumulative || 0) > 0);
  if (!series.length || !hasData) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" style={{ height, color: pal.textSecondary, textAlign: "center", padding: 16 }}>
        <Typography variant="body2">
          {t("survey.dashboard.sCurveEmpty", "No trend yet — the cumulative-completion curve builds up as daily snapshots accumulate.")}
        </Typography>
      </Box>
    );
  }
  const data = series.map((d) => ({ date: fmtShortDate(d.date), cumulative: d.cumulative || 0 }));
  const maxY = Math.max(target || 0, ...data.map((d) => d.cumulative), 1);
  return (
    <Box style={{ width: "100%", height }} role="img" aria-label={t("survey.dashboard.sCurve", "Cumulative completion over time")}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
          <defs>
            <linearGradient id="scurveFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={pal.primary} stopOpacity={0.35} />
              <stop offset="100%" stopColor={pal.primary} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={pal.greyBg} />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: pal.textSecondary }} interval="preserveStartEnd" minTickGap={24} />
          <YAxis domain={[0, maxY]} tick={{ fontSize: 10, fill: pal.textSecondary }} width={48} tickFormatter={fmtInt} />
          <Tooltip formatter={(v) => [fmtInt(v), t("survey.dashboard.cumulative", "Cumulative")]} />
          {target ? (
            <ReferenceLine y={target} stroke={pal.grey} strokeDasharray="6 4" label={{ value: `${t("survey.dashboard.target", "Target")}: ${fmtInt(target)}`, position: "insideTopRight", fontSize: 10, fill: pal.textSecondary }} />
          ) : null}
          <Area type="monotone" dataKey="cumulative" stroke={pal.primary} strokeWidth={2.5} fill="url(#scurveFill)" dot={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  );
}

export default CompletionSCurveChart;
