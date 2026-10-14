import React from "react";
import { Box, Typography, Tooltip } from "@material-ui/core";
import { useTheme, fade } from "@material-ui/core/styles";
import { surveyPalette } from "./surveyTheme";
import { fmtInt } from "./surveyUtils";

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 24 }, (_, h) => h);
const STEPS = 5;
const hh = (h) => String(h).padStart(2, "0");

function stepFor(v, max) {
  if (!v || !max) return 0;
  return Math.max(1, Math.ceil(Math.sqrt(v / max) * STEPS));
}

function stepRange(step, max) {
  const lo = Math.floor(max * ((step - 1) / STEPS) ** 2) + 1;
  const hi = Math.floor(max * (step / STEPS) ** 2);
  if (lo > hi) return null;
  return lo === hi ? fmtInt(hi) : `${fmtInt(lo)}–${fmtInt(hi)}`;
}

function Stat({ label, value, pal }) {
  return (
    <Box>
      <Typography style={{ fontSize: "0.72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em", color: pal.textSecondary }}>
        {label}
      </Typography>
      <Typography style={{ fontSize: "1.1rem", fontWeight: 700, color: pal.primaryDark }}>{value}</Typography>
    </Box>
  );
}

function ActivityHeatmap({ cells = [], formatMessage }) {
  const t = (id, fallback) => (formatMessage ? (formatMessage(id) === id ? fallback : formatMessage(id)) : fallback);
  const theme = useTheme();
  const pal = surveyPalette(theme);
  const shade = (step) => (step === 0 ? pal.greyBg : fade(pal.primaryDark, 0.15 + (0.85 * (step - 1)) / (STEPS - 1)));

  const grid = {};
  const dayTotals = Array(7).fill(0);
  let max = 0;
  let total = 0;
  (cells || []).forEach((c) => {
    const v = c.count || 0;
    grid[`${c.dayOfWeek}_${c.hour}`] = v;
    dayTotals[c.dayOfWeek] += v;
    total += v;
    if (v > max) max = v;
  });

  if (!total) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" style={{ height: 180, color: pal.textSecondary, textAlign: "center", padding: 16 }}>
        <Typography variant="body2">
          {t("survey.dashboard.heatmapEmpty", "No recent activity timestamps in the synced sample yet.")}
        </Typography>
      </Box>
    );
  }

  const dayMax = Math.max(...dayTotals);
  const cols = "36px repeat(24, minmax(10px, 1fr)) 56px";
  const label = { fontSize: "0.75rem", color: pal.textSecondary };

  return (
    <Box role="img" aria-label={t("survey.dashboard.heatmap", "Enumerator activity by day of week and hour")} style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <Box display="flex" style={{ columnGap: 28, rowGap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <Stat pal={pal} label={t("survey.dashboard.heatmapEntries", "Interviews")} value={fmtInt(total)} />
      </Box>

      <Box style={{ flex: 1, minHeight: 0, overflowX: "auto", display: "flex" }}>
        <Box
          style={{
            flex: 1,
            minWidth: 420,
            display: "grid",
            gridTemplateColumns: cols,
            gridTemplateRows: "auto repeat(7, minmax(22px, 1fr))",
            columnGap: 3,
            rowGap: 3,
            alignItems: "center",
          }}
        >
          <span />
          {HOURS.map((h) => (
            <Typography key={h} style={{ ...label, textAlign: "center" }}>{h % 3 === 0 ? hh(h) : ""}</Typography>
          ))}
          <Typography style={{ ...label, textAlign: "right", fontWeight: 600 }}>{t("survey.dashboard.total", "Total")}</Typography>

          {DOW.map((day, dow) => (
            <React.Fragment key={day}>
              <Typography style={{ ...label, fontWeight: 600, color: theme.palette.text.primary }}>{day}</Typography>
              {HOURS.map((h) => {
                const v = grid[`${dow}_${h}`] || 0;
                return (
                  <Tooltip key={h} title={`${day} ${hh(h)}:00–${hh((h + 1) % 24)}:00 · ${fmtInt(v)} (${total ? Math.round((v / total) * 100) : 0}%)`}>
                    <Box style={{ height: "100%", minHeight: 22, borderRadius: 3, background: shade(stepFor(v, max)) }} />
                  </Tooltip>
                );
              })}
              <Box display="flex" alignItems="center" justifyContent="flex-end" style={{ gap: 6 }}>
                <Box style={{ width: 20, height: 6, borderRadius: 3, background: pal.greyBg, overflow: "hidden" }}>
                  <Box style={{ width: `${(dayTotals[dow] / dayMax) * 100}%`, height: "100%", background: pal.primaryDark }} />
                </Box>
                <Typography style={{ ...label, fontWeight: 600, color: theme.palette.text.primary, minWidth: 24, textAlign: "right" }}>
                  {fmtInt(dayTotals[dow])}
                </Typography>
              </Box>
            </React.Fragment>
          ))}

        </Box>
      </Box>

      <Box display="flex" alignItems="center" flexWrap="wrap" style={{ marginTop: 16, gap: 12 }}>
        <Box display="flex" alignItems="center" style={{ gap: 4 }}>
          <Box style={{ width: 14, height: 14, borderRadius: 3, background: shade(0) }} />
          <Typography style={label}>0</Typography>
        </Box>
        {Array.from({ length: STEPS }, (_, i) => i + 1).filter((s) => stepRange(s, max)).map((s) => (
          <Box key={s} display="flex" alignItems="center" style={{ gap: 4 }}>
            <Box style={{ width: 14, height: 14, borderRadius: 3, background: shade(s) }} />
            <Typography style={label}>{stepRange(s, max)}</Typography>
          </Box>
        ))}
        <Typography style={{ ...label, marginLeft: "auto" }}>
          {t("survey.dashboard.heatmapBasis", "Last-entry time of synced interviews, server local time")}
        </Typography>
      </Box>
    </Box>
  );
}

export default ActivityHeatmap;
