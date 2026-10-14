import React from "react";
import {
  Card, CardContent, Typography, Box, Tooltip,
} from "@material-ui/core";
import { useTheme, fade, makeStyles } from "@material-ui/core/styles";
import Skeleton from "@material-ui/lab/Skeleton";
import {
  ResponsiveContainer, AreaChart, Area,
} from "recharts";
import { fmtInt } from "./surveyUtils";
import { surveyPalette, severityColor } from "./surveyTheme";

const useStyles = makeStyles((theme) => ({
  card: {
    height: "100%",
    borderRadius: 8,
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: "none",
    transition: "transform .15s ease, box-shadow .15s ease",
  },
  clickable: {
    cursor: "pointer",
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: `0 8px 24px ${fade(theme.palette.primary.main, 0.12)}`,
    },
  },
  content: {
    padding: theme.spacing(2.5, 2.75),
    "&:last-child": { paddingBottom: theme.spacing(2.5) },
  },
  label: {
    textTransform: "uppercase",
    letterSpacing: "0.02em",
    fontSize: "0.8rem",
    fontWeight: 600,
    color: theme.palette.text.primary,
  },
  value: {
    fontSize: "2.2rem",
    fontWeight: 700,
    lineHeight: 1,
    marginTop: theme.spacing(2),
  },
  caption: {
    fontSize: "0.82rem",
    color: theme.palette.grey[600],
    marginTop: theme.spacing(1.25),
    display: "block",
  },
}));

function KpiTile({
  label, value, subtitle, icon, color, severity, sparkline, sparklineKey = "count",
  loading = false, tooltip, onClick, active = false,
}) {
  const classes = useStyles();
  const theme = useTheme();
  const pal = surveyPalette(theme);
  const accent = color || (severity === "warn" || severity === "bad" ? severityColor(severity, pal) : pal.primaryDark);
  const displayValue = typeof value === "number" ? fmtInt(value) : (value ?? "—");
  const clickable = !!onClick;
  const gradId = `spark-${String(label || "").replace(/[^a-zA-Z0-9]/g, "")}`;

  const inner = (
    <Card
      className={`${classes.card} ${clickable ? classes.clickable : ""}`.trim()}
      onClick={onClick}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(e); } } : undefined}
      style={active ? { background: fade(accent, 0.06), boxShadow: `0 0 0 1px ${accent}` } : undefined}
    >
      <CardContent className={classes.content}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Typography className={classes.label}>{label}</Typography>
          {icon ? <Box style={{ color: accent, opacity: 0.85 }}>{icon}</Box> : null}
        </Box>
        <Box display="flex" alignItems="flex-end" justifyContent="space-between">
          {loading ? (
            <Skeleton variant="text" width={84} height={52} />
          ) : (
            <Typography className={classes.value} style={{ color: accent }}>
              {displayValue}
            </Typography>
          )}
          {sparkline && sparkline.length > 1 ? (
            <Box style={{ width: 88, height: 34 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparkline} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={accent} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={accent} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey={sparklineKey} stroke={accent} strokeWidth={1.5} fill={`url(#${gradId})`} dot={false} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          ) : null}
        </Box>
        {subtitle ? (
          <Typography className={classes.caption}>{subtitle}</Typography>
        ) : null}
      </CardContent>
    </Card>
  );
  return tooltip ? <Tooltip title={tooltip}>{inner}</Tooltip> : inner;
}

export default KpiTile;
