import React from "react";
import {
  Table, TableHead, TableBody, TableRow, TableCell, Typography, Box, Chip, Tooltip,
} from "@material-ui/core";
import { useTheme, fade } from "@material-ui/core/styles";
import { fmtAgo, fmtInt } from "./surveyUtils";
import { surveyPalette } from "./surveyTheme";

function MiniBar({ completed = 0, rejected = 0, max = 1, pal }) {
  const w = (n) => `${Math.round((Math.max(0, n) / Math.max(1, max)) * 100)}%`;
  const done = Math.max(0, completed - rejected);
  return (
    <Box style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", background: pal.greyBg, minWidth: 60 }}>
      <Box style={{ width: w(done || completed), background: pal.primary }} />
      {rejected ? <Box style={{ width: w(rejected), background: pal.error }} /> : null}
    </Box>
  );
}

// Enumerator leaderboard over the synced sample. Rows are clickable to filter the
// live feed by that enumerator; a mini bar shows their completed-vs-rejected mix.
function EnumeratorLeaderboard({ rows = [], formatMessage, onSelect, selected }) {
  const t = (id, fallback) => (formatMessage ? (formatMessage(id) === id ? fallback : formatMessage(id)) : fallback);
  const theme = useTheme();
  const pal = surveyPalette(theme);
  if (!rows.length) return <Typography variant="body2" color="textSecondary">{t("survey.dashboard.noData", "No data")}</Typography>;
  const maxCompleted = Math.max(1, ...rows.map((r) => r.completed || 0));
  return (
    <Box style={{ maxHeight: 360, overflow: "auto" }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell style={{ width: 28 }}>#</TableCell>
            <TableCell>{t("survey.dashboard.enumerator", "Enumerator")}</TableCell>
            <TableCell>{t("survey.dashboard.mixCol", "Done / rejected")}</TableCell>
            <TableCell align="right">{t("survey.dashboard.completedShort", "Done")}</TableCell>
            <TableCell align="right">{t("survey.dashboard.approvedHqShort", "HQ ✓")}</TableCell>
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
                    {r.supervisorName ? <Typography variant="caption" color="textSecondary">{r.supervisorName}</Typography> : null}
                  </TableCell>
                  <TableCell><MiniBar completed={r.completed || 0} rejected={r.rejected || 0} max={maxCompleted} pal={pal} /></TableCell>
                  <TableCell align="right">{fmtInt(r.completed ?? 0)}</TableCell>
                  <TableCell align="right" style={{ color: (r.approvedByHq || 0) ? pal.primaryDark : undefined, fontWeight: (r.approvedByHq || 0) ? 600 : 400 }}>{fmtInt(r.approvedByHq ?? 0)}</TableCell>
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

export default EnumeratorLeaderboard;
