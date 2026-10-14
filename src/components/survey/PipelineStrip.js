import React from "react";
import { Paper, Box, Typography, Tooltip } from "@material-ui/core";
import { useTheme, fade } from "@material-ui/core/styles";
import { fmtInt } from "./surveyUtils";
import { surveyPalette } from "./surveyTheme";

const STAGE_STATUS = ["all", "awaitingSupervisor", "awaitingHq", "approved"];

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

function PipelineStrip({ stages = [], onStageClick, activeStatus, formatMessage }) {
  const t = (id, fallback) => (formatMessage ? (formatMessage(id) === id ? fallback : formatMessage(id)) : fallback);
  const theme = useTheme();
  const pal = surveyPalette(theme);
  const grand = stages[0]?.count || 0;
  const bn = findBottleneck(stages);
  const ink = pal.primaryDark;

  return (
    <Box>
      <Box mb={1.5}>
        <Typography style={{ fontWeight: 700, fontSize: "1.15rem", color: theme.palette.text.primary }}>
          {t("survey.dashboard.pipeline", "Data collection pipeline")}
        </Typography>
      </Box>

      {!stages.length ? (
        <Paper style={{ padding: 20, borderRadius: 8, border: `1px solid ${theme.palette.divider}`, boxShadow: "none" }}>
          <Typography variant="body2" color="textSecondary">{t("survey.dashboard.noData", "No data")}</Typography>
        </Paper>
      ) : (
        <Box style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          {stages.map((s, i) => {
            const status = STAGE_STATUS[i] || STAGE_STATUS[STAGE_STATUS.length - 1];
            const share = grand ? (s.count || 0) / grand : 0;
            const isActive = activeStatus === status || (status === "all" && !activeStatus);
            const clickable = !!onStageClick;
            const stepIsBottleneck = bn && bn.real && i === bn.idx;
            const select = () => onStageClick(status === "all" ? null : status);
            return (
              <Tooltip key={s.stage} title={clickable ? t("survey.dashboard.clickToFilterFeed", "Click to filter the live feed") : ""}>
                <Box
                  onClick={clickable ? select : undefined}
                  role={clickable ? "button" : undefined}
                  tabIndex={clickable ? 0 : undefined}
                  onKeyDown={clickable ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      select();
                    }
                  } : undefined}
                  style={{
                    cursor: clickable ? "pointer" : "default",
                    border: `1px solid ${isActive ? ink : theme.palette.divider}`,
                    borderRadius: 8,
                    padding: "20px 22px",
                    background: isActive ? fade(ink, 0.04) : pal.paper,
                  }}
                >
                  <Typography style={{ textTransform: "uppercase", letterSpacing: "0.02em", fontSize: "0.8rem", fontWeight: 600, lineHeight: 1.3, color: theme.palette.text.primary }}>
                    {s.stage}
                  </Typography>
                  <Typography style={{ fontWeight: 700, fontSize: "2.2rem", lineHeight: 1.1, color: ink, marginTop: 10 }}>
                    {fmtInt(s.count)}
                  </Typography>
                  <Box style={{ background: pal.greyBg, borderRadius: 4, height: 7, marginTop: 12, overflow: "hidden" }}>
                    <Box style={{ width: `${Math.max(share * 100, 1)}%`, height: "100%", background: ink, borderRadius: 4, transition: "width .4s ease" }} />
                  </Box>
                  {stepIsBottleneck && bn?.lost ? (
                    <Typography style={{ fontSize: "0.78rem", color: theme.palette.text.secondary, display: "block", marginTop: 10 }}>
                      {fmtInt(bn.lost)} {t("survey.dashboard.waitingHere", "waiting at this step")}
                    </Typography>
                  ) : null}
                </Box>
              </Tooltip>
            );
          })}
        </Box>
      )}
    </Box>
  );
}

export default PipelineStrip;
