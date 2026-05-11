import React from "react";
import Alert from "@material-ui/lab/Alert";
import { fmtInt } from "./surveyUtils";

// One calm info banner explaining that the operational widgets below run off a
// bounded sample (the HQ endpoint can't page all interviews) — shown only when it
// actually is a sample. The KPIs/pipeline above are exact, so we say so here too.
function SampleBanner({ sampleSize, totalInterviews, formatMessage }) {
  const t = (id, fallback) => (formatMessage ? (formatMessage(id) === id ? fallback : formatMessage(id)) : fallback);
  const sample = Number(sampleSize) || 0;
  const total = Number(totalInterviews) || 0;
  if (!total || sample >= total) return null;
  return (
    <Alert severity="info" variant="outlined" style={{ marginBottom: 16 }}>
      {t("survey.dashboard.sampleBanner1", "The KPIs and pipeline above are exact.")}{" "}
      {t("survey.dashboard.sampleBanner2", "The live feed, leaderboard and activity heatmap below are based on a sample of")}{" "}
      <strong>{fmtInt(sample)}</strong> {t("survey.dashboard.sampleBanner3", "interviews")} (
      {t("survey.dashboard.hqReports", "HQ reports")} <strong>{fmtInt(total)}</strong>) —{" "}
      {t("survey.dashboard.sampleBanner4", "this Survey Solutions endpoint doesn't allow paging through all interviews, so the sample accumulates as the dashboard polls.")}
    </Alert>
  );
}

export default SampleBanner;
