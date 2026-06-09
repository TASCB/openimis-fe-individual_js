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

// Flat KPI card matching the Payment Operations dashboard: 1px-bordered surface,
// 16px radius, a left accent strip, uppercase muted label, big themed value and a
// caption. All colour comes from the live MUI theme (configured via fe-core), so the
// card follows branding; only genuine signals (error/warning/success) use a 2nd hue.
const useStyles = makeStyles((theme) => ({
  card: {
    position: "relative",
    height: "100%",
    borderRadius: 16,
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: "none",
    overflow: "hidden",
    transition: "transform .15s ease, box-shadow .15s ease",
  },
  clickable: {
    cursor: "pointer",
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: `0 8px 24px ${fade(theme.palette.primary.main, 0.12)}`,
    },
  },
  accent: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 4,
    height: "100%",
  },
  content: {
    padding: theme.spacing(2.5),
    "&:last-child": { paddingBottom: theme.spacing(2.5) },
  },
  label: {
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    fontSize: "0.72rem",
    fontWeight: 600,
    color: theme.palette.grey[600],
  },
  value: {
    fontSize: "2.4rem",
    fontWeight: 700,
    lineHeight: 1,
    marginTop: theme.spacing(1),
  },
  caption: {
    fontSize: "0.78rem",
    color: theme.palette.grey[600],
    marginTop: theme.spacing(0.75),
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
  const accent = color || (severity ? severityColor(severity, pal) : pal.primary);
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
      <span className={classes.accent} style={{ backgroundColor: accent }} />
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
