// ================================
// FILE: src/components/dialogs/PmtProgressDialog.js
// (adjust path to match your project, e.g. ../components/dialogs/PmtProgressDialog.js)
// ================================
import React, { useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { useDispatch, useSelector } from "react-redux";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
  LinearProgress,
  Card,
  CardContent,
  CircularProgress,
} from "@material-ui/core";
import { Alert } from "@material-ui/lab";
import { makeStyles } from "@material-ui/core/styles";
import { formatMessage } from "@openimis/fe-core";

import { INDIVIDUAL_MODULE_NAME } from "../../constants";
import { fetchPmtRunProgress } from "../../actions";

const useStyles = makeStyles((theme) => ({
  progressContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: theme.spacing(2),
    padding: theme.spacing(2),
  },
  circularWrapper: {
    position: "relative",
    display: "inline-flex",
  },
  circularLabel: {
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    position: "absolute",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 600,
  },
  statsCard: {
    marginTop: theme.spacing(2),
    width: "100%",
    backgroundColor: "#f5f5f5",
  },
  statRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: theme.spacing(0.5, 0),
    fontSize: "14px",
  },
  successMessage: {
    backgroundColor: "#c8e6c9",
    color: "#2e7d32",
    padding: theme.spacing(2),
    borderRadius: theme.shape.borderRadius,
    width: "100%",
  },
}));

function PmtProgressDialog({ open, mutationId, onClose }) {
  const intl = useIntl();
  const classes = useStyles();
  const dispatch = useDispatch();

  const [isCompleted, setIsCompleted] = useState(false);
  const [isFailed, setIsFailed] = useState(false);

  // This assumes you implemented reducer state:
  // state.individual.pmtRunProgress
  const progress = useSelector((state) => state.individual?.pmtRunProgress);
  const progressError = useSelector((state) => state.individual?.errorPmtRunProgress);

  // Reset dialog local state when reopened / mutation changes
  useEffect(() => {
    if (!open) return;
    setIsCompleted(false);
    setIsFailed(false);
  }, [open, mutationId]);

  // Polling
  useEffect(() => {
    if (!open || !mutationId) return;
    if (isCompleted || isFailed) return;

    dispatch(fetchPmtRunProgress(mutationId));

    const interval = setInterval(() => {
      dispatch(fetchPmtRunProgress(mutationId));
    }, 1500);

    return () => clearInterval(interval);
  }, [open, mutationId, dispatch, isCompleted, isFailed]);

  // Completion detection
  useEffect(() => {
    if (!progress) return;

    if (progress.status === "COMPLETED") {
      setIsCompleted(true);
    } else if (progress.status === "FAILED") {
      setIsFailed(true);
    }
  }, [progress]);

  const percentage = Number(progress?.percentageComplete ?? 0);

  const handleClose = () => {
    onClose({ completed: isCompleted || isFailed });
  };

  const titleKey =
    isCompleted
      ? "pmt.progress.titleCompleted"
      : isFailed
      ? "pmt.progress.titleFailed"
      : "pmt.progress.title";

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        {formatMessage(intl, INDIVIDUAL_MODULE_NAME, titleKey)}
      </DialogTitle>

      <DialogContent>
        <Box className={classes.progressContainer}>
          {/* GraphQL error */}
          {progressError && !isCompleted && !isFailed && (
            <Alert severity="error">
              {typeof progressError === "string"
                ? progressError
                : formatMessage(intl, INDIVIDUAL_MODULE_NAME, "pmt.progress.failed")}
            </Alert>
          )}

          {/* Running */}
          {!isCompleted && !isFailed && (
            <>
              <div className={classes.circularWrapper}>
                <CircularProgress variant="determinate" value={percentage} size={120} />
                <div className={classes.circularLabel}>
                  <Typography variant="subtitle1">{`${percentage}%`}</Typography>
                </div>
              </div>

              <Typography>
                {progress?.statusMessage ||
                  formatMessage(intl, INDIVIDUAL_MODULE_NAME, "pmt.progress.starting")}
              </Typography>

              <Box width="100%" mt={1}>
                <LinearProgress variant="determinate" value={percentage} />
              </Box>

              <Card className={classes.statsCard}>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    {formatMessage(intl, INDIVIDUAL_MODULE_NAME, "pmt.progress.statistics")}
                  </Typography>

                  <Box className={classes.statRow}>
                    <span>
                      {formatMessage(intl, INDIVIDUAL_MODULE_NAME, "pmt.progress.households")}
                    </span>
                    <span>
                      {(progress?.processedGroups ?? 0)} / {(progress?.totalGroups ?? 0)}
                    </span>
                  </Box>

                  <Box className={classes.statRow}>
                    <span>
                      {formatMessage(intl, INDIVIDUAL_MODULE_NAME, "pmt.progress.individuals")}
                    </span>
                    <span>
                      {(progress?.processedIndividuals ?? 0)} / {(progress?.totalIndividuals ?? 0)}
                    </span>
                  </Box>

                  {progress?.status === "ENROLLING" && (
                    <Box className={classes.statRow}>
                      <span>
                        {formatMessage(intl, INDIVIDUAL_MODULE_NAME, "pmt.progress.enrolled")}
                      </span>
                      <span>{(progress?.enrollmentsCreated ?? 0)}</span>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* Completed */}
          {isCompleted && (
            <Box className={classes.successMessage}>
              <Typography variant="h6">
                ✓ {formatMessage(intl, INDIVIDUAL_MODULE_NAME, "pmt.progress.success")}
              </Typography>
              <Typography>
                {formatMessage(intl, INDIVIDUAL_MODULE_NAME, "pmt.progress.successMessage").replace(
                  "{count}",
                  String(progress?.enrollmentsCreated ?? 0)
                )}
              </Typography>
            </Box>
          )}

          {/* Failed */}
          {isFailed && (
            <Alert severity="error">
              {formatMessage(intl, INDIVIDUAL_MODULE_NAME, "pmt.progress.failed")}
            </Alert>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} color="primary" variant="contained">
          {formatMessage(
            intl,
            INDIVIDUAL_MODULE_NAME,
            isCompleted || isFailed ? "pmt.progress.close" : "pmt.progress.runInBackground"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default PmtProgressDialog;
