import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Alert,
  Box,
} from "@mui/material";
import { VpnKey as KeyIcon } from "@mui/icons-material";
import { JoinClassroomRequest } from "@/types";

interface JoinClassroomDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: JoinClassroomRequest) => Promise<void>;
}

export default function JoinClassroomDialog({
  open,
  onClose,
  onSubmit,
}: JoinClassroomDialogProps) {
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmed = inviteCode.trim().toLowerCase();
    if (!trimmed) {
      setError("Please enter an invite code.");
      return;
    }
    setError("");
    setIsSubmitting(true);
    try {
      await onSubmit({ inviteCode: trimmed });
      setInviteCode("");
      onClose();
    } catch {
      setError(
        "Invalid invite code, or you are already enrolled in this class.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setError("");
      setInviteCode("");
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        <Typography variant="h4" component="span">
          Join a class
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Ask your teacher for the class invite code, then enter it below.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box
          sx={{
            bgcolor: "background.default",
            borderRadius: 2,
            p: 3,
            textAlign: "center",
          }}
        >
          <KeyIcon sx={{ fontSize: 32, color: "primary.main", mb: 1 }} />
          <TextField
            fullWidth
            label="Invite code"
            placeholder="e.g. abc1234"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            inputProps={{
              style: {
                textAlign: "center",
                fontSize: "1.25rem",
                letterSpacing: "0.15em",
                fontWeight: 600,
              },
            }}
            autoFocus
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={handleClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Joining..." : "Join"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
