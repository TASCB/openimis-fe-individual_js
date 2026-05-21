import React from "react";
import {
  Card, CardContent, Typography, Box, Tooltip,
} from "@material-ui/core";
import { useTheme, fade } from "@material-ui/core/styles";
import Skeleton from "@material-ui/lab/Skeleton";
import {
  ResponsiveContainer, AreaChart, Area,
} from "recharts";
import { fmtInt } from "./surveyUtils";
import { surveyPalette, severityColor } from "./surveyTheme";

// Compact KPI tile: label, big (formatted) value, sub-line, accent colour drawn from
// the theme (primary by default; error/warning/success for a semantic severity), an
// optional mini sparkline, and an optional tooltip.
function KpiTile({
  label, value, subtitle, icon, color, severity, sparkline, sparklineKey = "count",
  loading = false, tooltip, onClick, active = false,
}) {
  const theme = useTheme();
  const pal = surveyPalette(theme);
  const accent = color || (severity ? severityColor(severity, pal) : pal.primary);
  const displayValue = typeof value === "number" ? fmtInt(value) : (value ?? "—");
  const clickable = !!onClick;
  const gradId = `spark-${String(label || "").replace(/[^a-zA-Z0-9]/g, "")}`;

  const inner = (
    <Card
      elevation={active ? 5 : 3}
      onClick={onClick}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(e); } } : undefined}
      style={{
        height: "100%",
        borderTop: `4px solid ${accent}`,
        cursor: clickable ? "pointer" : "default",
        background: active ? fade(accent, 0.06) : undefined,
        boxShadow: active ? `0 0 0 1px ${accent}` : undefined,
      }}
    >
      <CardContent style={{ paddingBottom: 12 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Typography variant="caption" color="textSecondary" style={{ textTransform: "uppercase", letterSpacing: 0.4 }}>
            {label}
          </Typography>
          {icon ? <Box style={{ color: accent, opacity: 0.85 }}>{icon}</Box> : null}
        </Box>
        <Box mt={0.5} display="flex" alignItems="flex-end" justifyContent="space-between">
          {loading ? (
            <Skeleton variant="text" width={72} height={40} />
          ) : (
            <Typography variant="h4" style={{ fontWeight: 700, color: accent, lineHeight: 1.1 }}>
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
          <Typography variant="caption" color="textSecondary" style={{ display: "block", marginTop: 2 }}>{subtitle}</Typography>
        ) : null}
      </CardContent>
    </Card>
  );
  return tooltip ? <Tooltip title={tooltip}>{inner}</Tooltip> : inner;
}

export default KpiTile;
