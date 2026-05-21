import React from "react";
import { Paper, Box, Typography, Tooltip } from "@material-ui/core";
import { useTheme, fade } from "@material-ui/core/styles";
import { fmtInt } from "./surveyUtils";
import { surveyPalette } from "./surveyTheme";

// The 4 funnel stages, in order, mapped to the interview status they let you drill into.
const STAGE_STATUS = ["all", "Completed", "ApprovedBySupervisor", "ApprovedByHeadquarters"];

// Returns { idx, lost, real } describing the worst conversion step, or null.
export function findBottleneck(stages = []) {
  if (!stages.length) return null;
  let idx = -1;
  let worst = Infinity;
  for (let i = 1; i < stages.length; i += 1) {
    const prev = stages[i - 1].count || 0;
    const conv = prev > 0 ? (stages[i].count || 0) / prev : 1;
    if (conv < worst) { worst = conv; idx = i; }
  }
  const real = idx > 0 && worst < 0.9;
  return { idx, worst, real, lost: real ? (stages[idx - 1].count || 0) - (stages[idx].count || 0) : 0 };
}

// Hero "pipeline" view: a 4-stage funnel shown as evenly spaced cards; the
// worst-converting step is highlighted in the theme's warning hue so the real
// bottleneck is unmissable. Everything else uses the theme's primary colour.
function PipelineStrip({ stages = [], onStageClick, activeStatus, formatMessage }) {
  const t = (id, fallback) => (formatMessage ? (formatMessage(id) === id ? fallback : formatMessage(id)) : fallback);
  const theme = useTheme();
  const pal = surveyPalette(theme);
  const grand = stages[0]?.count || 0;
  const bn = findBottleneck(stages);
  const accentFor = (i) => (bn && bn.real && i === bn.idx ? pal.warning : pal.primary);

  return (
    <Paper elevation={3} style={{ padding: 16 }}>
      <Box display="flex" justifyContent="space-between" alignItems="baseline" mb={1.5} style={{ flexWrap: "wrap", gap: 8 }}>
        <Typography variant="subtitle1" style={{ fontWeight: 600 }}>
          {t("survey.dashboard.pipeline", "Data collection pipeline")}
        </Typography>
        {stages.length ? (
          <Typography variant="caption" color="textSecondary">
            {fmtInt(grand)} {t("survey.dashboard.interviewsWord", "interviews")}
          </Typography>
        ) : null}
      </Box>

      {!stages.length ? (
        <Typography variant="body2" color="textSecondary">{t("survey.dashboard.noData", "No data")}</Typography>
      ) : (
        <Box style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
          {stages.map((s, i) => {
            const status = STAGE_STATUS[i] || STAGE_STATUS[STAGE_STATUS.length - 1];
            const share = grand ? (s.count || 0) / grand : 0;
            const isActive = activeStatus === status || (status === "all" && !activeStatus);
            const clickable = !!onStageClick;
            const stepIsBottleneck = bn && bn.real && i === bn.idx;
            const accent = accentFor(i);
            return (
              <React.Fragment key={s.stage}>
                <Tooltip title={clickable ? t("survey.dashboard.clickToFilterFeed", "Click to filter the live feed") : ""}>
                  <Box
                    onClick={clickable ? () => onStageClick(status === "all" ? null : status) : undefined}
                    role={clickable ? "button" : undefined}
                    tabIndex={clickable ? 0 : undefined}
                    onKeyDown={clickable ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onStageClick(status === "all" ? null : status);
                      }
                    } : undefined}
                    style={{
                      flex: "1 1 0",
                      minWidth: 140,
                      cursor: clickable ? "pointer" : "default",
                      border: `1px solid ${isActive ? accent : theme.palette.divider}`,
                      borderTop: `4px solid ${accent}`,
                      borderRadius: 6,
                      padding: "10px 12px",
                      background: isActive ? fade(accent, 0.08) : pal.paper,
                      boxShadow: isActive ? `0 0 0 1px ${accent}` : "none",
                    }}
                  >
                    <Typography variant="caption" color="textSecondary" style={{ textTransform: "uppercase", letterSpacing: 0.3, lineHeight: 1.2, display: "block" }}>
                      {s.stage}
                    </Typography>
                    <Typography variant="h5" style={{ fontWeight: 700, color: accent }}>
                      {fmtInt(s.count)}
                    </Typography>
                    <Box style={{ background: pal.greyBg, borderRadius: 3, height: 6, marginTop: 4, overflow: "hidden" }}>
                      <Box style={{ width: `${Math.max(share * 100, 1)}%`, height: "100%", background: accent, transition: "width .4s ease" }} />
                    </Box>
                    {stepIsBottleneck && bn?.lost ? (
                      <Typography variant="caption" style={{ color: pal.warning, fontWeight: 600 }}>
                        {fmtInt(bn.lost)} {t("survey.dashboard.waitingHere", "waiting at this step")}
                      </Typography>
                    ) : null}
                  </Box>
                </Tooltip>
              </React.Fragment>
            );
          })}
        </Box>
      )}
    </Paper>
  );
}

export default PipelineStrip;
