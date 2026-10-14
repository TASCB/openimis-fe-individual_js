import React from "react";
import {
  Table, TableHead, TableBody, TableRow, TableCell, Typography, Box, Chip, Tooltip,
} from "@material-ui/core";
import { useTheme, fade } from "@material-ui/core/styles";
import { fmtAgo, fmtInt } from "./surveyUtils";
import { surveyPalette } from "./surveyTheme";
import { headCellStyle, RankBadge } from "./leaderboardStyles";

function SupervisorLeaderboard({ rows = [], formatMessage, onSelect, selected, maxHeight = 360 }) {
  const t = (id, fallback) => (formatMessage ? (formatMessage(id) === id ? fallback : formatMessage(id)) : fallback);
  const theme = useTheme();
  const pal = surveyPalette(theme);
  const head = headCellStyle(theme);
  const hasTeams = rows.some((r) => r.teamSize || r.activeInterviewers);

  if (!rows.length) {
    return (
      <Typography variant="body2" color="textSecondary">
        {t("survey.dashboard.noSupervisorData", "No supervisor names are available in the current HQ sample yet.")}
      </Typography>
    );
  }

  return (
    <Box style={{ maxHeight, overflow: "auto" }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell style={{ ...head, width: 40 }}>#</TableCell>
            <TableCell style={head}>{t("survey.dashboard.supervisor", "Supervisor")}</TableCell>
            {hasTeams ? <TableCell align="right" style={head}>{t("survey.dashboard.teamSize", "Team")}</TableCell> : null}
            <TableCell align="right" style={head}>{t("survey.dashboard.pendingShort", "Queue")}</TableCell>
            <TableCell align="right" style={head}>{t("survey.dashboard.reviewedShort", "Reviewed")}</TableCell>
            <TableCell align="right" style={head}>{t("survey.dashboard.lastSync", "Last sync")}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r, i) => {
            const isSel = selected === r.name;
            return (
              <Tooltip key={r.name} title={onSelect ? t("survey.dashboard.clickToFilterFeed", "Click to filter the live feed") : ""}>
                <TableRow
                  hover
                  onClick={onSelect ? () => onSelect(isSel ? null : r.name) : undefined}
                  style={{ cursor: onSelect ? "pointer" : "default", background: isSel ? fade(pal.primary, 0.08) : undefined }}
                >
                  <TableCell><RankBadge rank={i + 1} theme={theme} /></TableCell>
                  <TableCell>
                    <Typography variant="body2" style={{ fontWeight: 600, color: pal.primaryDark }}>{r.name}</Typography>
                    <Typography variant="caption" color="textSecondary" display="block">
                      {r.username ? `${r.username} · ` : ""}
                      {fmtInt(r.total ?? 0)} {t("survey.dashboard.interviewsWord", "interviews")}
                    </Typography>
                  </TableCell>
                  {hasTeams ? (
                    <TableCell align="right">
                      <Typography variant="body2">{fmtInt(r.teamSize ?? 0)}</Typography>
                      <Typography variant="caption" color="textSecondary">{fmtInt(r.activeInterviewers ?? 0)} {t("survey.dashboard.activeShort", "Active")}</Typography>
                    </TableCell>
                  ) : null}
                  <TableCell align="right">{fmtInt(r.pendingReview ?? 0)}</TableCell>
                  <TableCell align="right" style={{ fontWeight: 700, color: pal.primaryDark }}>{fmtInt(r.reviewed ?? 0)}</TableCell>
                  <TableCell align="right">
                    {r.rejected ? <Chip size="small" label={`-${r.rejected}`} style={{ background: fade(pal.error, 0.18), marginRight: 4 }} /> : null}
                    <Typography variant="caption">{fmtAgo(r.lastActivity) || "—"}</Typography>
                  </TableCell>
                </TableRow>
              </Tooltip>
            );
          })}
        </TableBody>
      </Table>
    </Box>
  );
}

export default SupervisorLeaderboard;
