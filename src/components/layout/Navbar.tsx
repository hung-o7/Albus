import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Box,
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from "@mui/material";
import { Add as AddIcon, School as SchoolIcon } from "@mui/icons-material";
import { useAuth } from "@/context/AuthContext";
import { getInitials } from "@/utils/helpers";
import { UserRole } from "@/types";

interface NavbarProps {
  onCreateClass?: () => void;
  onJoinClass?: () => void;
}

export default function Navbar({ onCreateClass, onJoinClass }: NavbarProps) {
  const { user, logout, isTeacher, updateProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileAnchor, setProfileAnchor] = useState<null | HTMLElement>(null);
  const [addAnchor, setAddAnchor] = useState<null | HTMLElement>(null);
  const [bioOpen, setBioOpen] = useState(false);
  const [bioText, setBioText] = useState(user?.bio ?? "");
  const [bioSaving, setBioSaving] = useState(false);

  useEffect(() => {
    if ((location.state as any)?.setupProfile) {
      setBioText("");
      setBioOpen(true);
      // Clear the state so it doesn't reopen on refresh
      window.history.replaceState({}, "");
    }
  }, [location.state]);

  if (!user) return null;

  const handleOpenBio = () => {
    setBioText(user.bio ?? "");
    setProfileAnchor(null);
    setBioOpen(true);
  };

  const handleSaveBio = async () => {
    setBioSaving(true);
    try {
      await updateProfile(bioText);
    } finally {
      setBioSaving(false);
      setBioOpen(false);
    }
  };

  return (
    <>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: "background.paper",
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Toolbar sx={{ gap: 1 }}>
          {/* Logo */}
          <IconButton
            edge="start"
            onClick={() => navigate("/dashboard")}
            sx={{ mr: 1 }}
          >
            <SchoolIcon sx={{ color: "primary.main", fontSize: 28 }} />
          </IconButton>
          <Typography
            variant="h6"
            sx={{
              color: "text.primary",
              fontFamily: '"DM Serif Display", serif',
              cursor: "pointer",
            }}
            onClick={() => navigate("/dashboard")}
          >
            Sprout
          </Typography>

          <Box sx={{ flexGrow: 1 }} />

          {/* Add button */}
          <IconButton
            onClick={(e) => setAddAnchor(e.currentTarget)}
            sx={{
              bgcolor: "primary.main",
              color: "white",
              "&:hover": { bgcolor: "primary.dark" },
              width: 36,
              height: 36,
            }}
          >
            <AddIcon fontSize="small" />
          </IconButton>
          <Menu
            anchorEl={addAnchor}
            open={Boolean(addAnchor)}
            onClose={() => setAddAnchor(null)}
            transformOrigin={{ horizontal: "right", vertical: "top" }}
            anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
          >
            {isTeacher && (
              <MenuItem
                onClick={() => {
                  setAddAnchor(null);
                  onCreateClass?.();
                }}
              >
                Create class
              </MenuItem>
            )}
            <MenuItem
              onClick={() => {
                setAddAnchor(null);
                onJoinClass?.();
              }}
            >
              Join class
            </MenuItem>
          </Menu>

          {/* Profile avatar */}
          <Chip
            avatar={
              <Avatar
                sx={{
                  bgcolor: "primary.main",
                  width: 32,
                  height: 32,
                  fontSize: "0.85rem",
                  color: "whitesmoke !important",
                }}
              >
                {getInitials(user.firstName, user.lastName)}
              </Avatar>
            }
            label={user.firstName}
            onClick={(e) => setProfileAnchor(e.currentTarget)}
            variant="outlined"
            sx={{
              ml: 1,
              border: "none",
              "&:hover": { bgcolor: "action.hover" },
              cursor: "pointer",
            }}
          />
          <Menu
            anchorEl={profileAnchor}
            open={Boolean(profileAnchor)}
            onClose={() => setProfileAnchor(null)}
            transformOrigin={{ horizontal: "right", vertical: "top" }}
            anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
          >
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="subtitle2">
                {user.firstName} {user.lastName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {user.email}
              </Typography>
              <br />
              <Chip
                label={user.role === UserRole.TEACHER ? "Teacher" : "Student"}
                size="small"
                color="primary"
                variant="outlined"
                sx={{ mt: 0.5 }}
              />
            </Box>
            <Divider />
            {!isTeacher && (
              <MenuItem onClick={handleOpenBio}>Edit my profile</MenuItem>
            )}
            <MenuItem
              onClick={() => {
                setProfileAnchor(null);
                logout();
                navigate("/login");
              }}
            >
              Sign out
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Student bio dialog */}
      <Dialog
        open={bioOpen}
        onClose={() => setBioOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>My Profile</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Tell Albus a little about yourself! Mention things you like (e.g. "I
            love dinosaurs and pizza") and Albus will use them to make learning
            more fun.
          </Typography>
          <TextField
            label="About me"
            multiline
            rows={3}
            fullWidth
            value={bioText}
            onChange={(e) => setBioText(e.target.value)}
            placeholder="I love soccer, dogs, and strawberry ice cream!"
            slotProps={{ htmlInput: { maxLength: 300 } }}
            helperText={`${bioText.length}/300`}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBioOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveBio}
            disabled={bioSaving}
          >
            {bioSaving ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
