import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  FormControlLabel,
  Switch,
  Paper,
} from "@mui/material";
import { RecordVoiceOver as ReadingIcon } from "@mui/icons-material";
import { BANNER_COLORS } from "@/utils/helpers";
import { CreateClassroomRequest } from "@/types";

interface CreateClassroomDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateClassroomRequest) => Promise<void>;
}

export default function CreateClassroomDialog({
  open,
  onClose,
  onSubmit,
}: CreateClassroomDialogProps) {
  const [form, setForm] = useState<CreateClassroomRequest>({
    name: "",
    description: "",
    section: "",
    subject: "",
    bannerColor: BANNER_COLORS[0],
    readingEnabled: false,
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const update = (field: keyof CreateClassroomRequest, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setError("Class name is required.");
      return;
    }
    setError("");
    setIsSubmitting(true);
    try {
      await onSubmit(form);
      // Reset form on success
      setForm({
        name: "",
        description: "",
        section: "",
        subject: "",
        bannerColor: BANNER_COLORS[0],
        readingEnabled: false,
      });
      onClose();
    } catch {
      setError("Failed to create class. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setError("");
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h4" component="span">
          Create a class
        </Typography>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TextField
          fullWidth
          label="Class name *"
          placeholder="e.g. Biology 101"
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          sx={{ mt: 1, mb: 2 }}
          autoFocus
        />
        <TextField
          fullWidth
          label="Section"
          placeholder="e.g. Section A, Period 3"
          value={form.section}
          onChange={(e) => update("section", e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          label="Subject"
          placeholder="e.g. Science, Mathematics"
          value={form.subject}
          onChange={(e) => update("subject", e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          label="Description"
          placeholder="Tell students what this class is about..."
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          multiline
          rows={3}
          sx={{ mb: 3 }}
        />

        {/* Color picker */}
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Banner color
        </Typography>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 3 }}>
          {BANNER_COLORS.map((color) => (
            <Box
              key={color}
              onClick={() => update("bannerColor", color)}
              sx={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                bgcolor: color,
                cursor: "pointer",
                border:
                  form.bannerColor === color
                    ? "3px solid"
                    : "3px solid transparent",
                borderColor:
                  form.bannerColor === color ? "text.primary" : "transparent",
                outline:
                  form.bannerColor === color ? "2px solid white" : "none",
                outlineOffset: "-4px",
                transition: "transform 0.15s ease",
                "&:hover": { transform: "scale(1.15)" },
              }}
            />
          ))}
        </Box>

        {/* Reading assessment toggle */}
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            display: "flex",
            alignItems: "center",
            gap: 2,
            borderColor: form.readingEnabled ? "primary.main" : "divider",
            bgcolor: form.readingEnabled ? "action.hover" : "transparent",
            transition: "all 0.2s",
          }}
        >
          <ReadingIcon sx={{ color: form.readingEnabled ? "primary.main" : "text.disabled", fontSize: 28 }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2">Reading Assessment</Typography>
            <Typography variant="caption" color="text.secondary">
              Assign passages for students to read aloud — Albus listens and gives feedback on accuracy, fluency, and pronunciation.
            </Typography>
          </Box>
          <FormControlLabel
            control={
              <Switch
                checked={!!form.readingEnabled}
                onChange={(e) => setForm((prev) => ({ ...prev, readingEnabled: e.target.checked }))}
                color="primary"
              />
            }
            label=""
            sx={{ m: 0 }}
          />
        </Paper>
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
          {isSubmitting ? "Creating..." : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
