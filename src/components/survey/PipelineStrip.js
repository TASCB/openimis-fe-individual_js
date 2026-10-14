import React from "react";
import { Paper, Box, Typography, Tooltip } from "@material-ui/core";
import { useTheme, fade } from "@material-ui/core/styles";
import { fmtInt } from "./surveyUtils";
import { surveyPalette } from "./surveyTheme";
import { STATUS_GROUPS } from "./surveyStatus";

const STAGE_STATUS = ["all", "awaitingSupervisor", "awaitingHq", "approved"];

function PipelineStrip({
  stages = [], groupCounts = {}, onStageClick, activeStatus, formatMessage,
}) {
  const t = (id, fallback) => (formatMessage ? (formatMessage(id) === id ? fallback : formatMessage(id)) : fallback);
  const theme = useTheme();
  const pal = surveyPalette(theme);
  const grand = stages[0]?.count || 0;
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
            const group = STATUS_GROUPS.find((g) => g.key === status);
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
                  {clickable && group ? (
                    <Typography style={{ fontSize: "0.78rem", color: theme.palette.text.secondary, display: "block", marginTop: 10 }}>
                      {t("survey.dashboard.opens", "Opens")} {fmtInt(groupCounts[status])} · {t(`survey.dashboard.group.${group.key}`, group.label)} →
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
