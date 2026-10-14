import React from "react";
import { fade } from "@material-ui/core/styles";

export function headCellStyle(theme) {
  return {
    background: fade(theme.palette.primary.main, 0.04),
    color: theme.palette.text.secondary,
    fontSize: "0.72rem",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.03em",
    whiteSpace: "nowrap",
  };
}

export function RankBadge({ rank, theme }) {
  const top = rank <= 3;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 24,
        height: 24,
        borderRadius: "50%",
        fontSize: "0.75rem",
        fontWeight: 700,
        background: top ? theme.palette.primary.dark : "transparent",
        color: top ? theme.palette.primary.contrastText : theme.palette.text.secondary,
      }}
    >
      {rank}
    </span>
  );
}
