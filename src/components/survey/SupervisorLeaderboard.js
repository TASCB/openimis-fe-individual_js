import React from "react";
import {
  Table, TableHead, TableBody, TableRow, TableCell, Typography, Box, Chip, Tooltip,
} from "@material-ui/core";
import { useTheme, fade } from "@material-ui/core/styles";
import { fmtAgo, fmtInt } from "./surveyUtils";
import { surveyPalette } from "./surveyTheme";

function SupervisorLeaderboard({ rows = [], formatMessage, onSelect, selected, maxHeight = 360 }) {
  const t = (id, fallback) => (formatMessage ? (formatMessage(id) === id ? fallback : formatMessage(id)) : fallback);
  const theme = useTheme();
  const pal = surveyPalette(theme);

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
            <TableCell style={{ width: 28 }}>#</TableCell>
            <TableCell>{t("survey.dashboard.supervisor", "Supervisor")}</TableCell>
            <TableCell align="right">{t("survey.dashboard.teamSize", "Team")}</TableCell>
            <TableCell align="right">{t("survey.dashboard.pendingShort", "Queue")}</TableCell>
            <TableCell align="right">{t("survey.dashboard.reviewedShort", "Reviewed")}</TableCell>
            <TableCell align="right">{t("survey.dashboard.lastSync", "Last sync")}</TableCell>
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
                  style={{ cursor: onSelect ? "pointer" : "default", background: isSel ? fade(pal.primary, 0.1) : undefined }}
                >
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>
                    <Typography variant="body2" style={{ fontWeight: i < 3 ? 600 : 400 }}>{r.name}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {r.username ? `${r.username} · ` : ""}
                      {fmtInt(r.total ?? 0)} {t("survey.dashboard.interviewsWord", "interviews")}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">{fmtInt(r.teamSize ?? 0)}</Typography>
                    <Typography variant="caption" color="textSecondary">{fmtInt(r.activeInterviewers ?? 0)} {t("survey.dashboard.activeShort", "Active")}</Typography>
                  </TableCell>
                  <TableCell align="right">{fmtInt(r.pendingReview ?? 0)}</TableCell>
                  <TableCell align="right" style={{ fontWeight: (r.reviewed || 0) ? 600 : 400 }}>{fmtInt(r.reviewed ?? 0)}</TableCell>
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
