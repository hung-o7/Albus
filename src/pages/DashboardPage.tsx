import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Container,
  Typography,
  Grid,
  Skeleton,
  Alert,
} from "@mui/material";
import { Inbox as EmptyIcon } from "@mui/icons-material";
import Navbar from "@/components/layout/Navbar";
import ClassroomCard from "@/components/classroom/ClassroomCard";
import CreateClassroomDialog from "@/components/classroom/CreateClassroomDialog";
import JoinClassroomDialog from "@/components/classroom/JoinClassroomDialog";
import { useAuth } from "@/context/AuthContext";
import { classroomService } from "@/services/classroomService";
import {
  Classroom,
  CreateClassroomRequest,
  JoinClassroomRequest,
} from "@/types";

export default function DashboardPage() {
  const { user, isTeacher } = useAuth();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  const fetchClassrooms = useCallback(async () => {
    try {
      const data = await classroomService.getMyClassrooms();
      setClassrooms(data);
    } catch {
      setError("Failed to load your classes.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClassrooms();
  }, [fetchClassrooms]);

  const handleCreate = async (data: CreateClassroomRequest) => {
    await classroomService.createClassroom(data);
    await fetchClassrooms();
  };

  const handleJoin = async (data: JoinClassroomRequest) => {
    await classroomService.joinClassroom(data);
    await fetchClassrooms();
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Navbar
        onCreateClass={() => setCreateOpen(true)}
        onJoinClass={() => setJoinOpen(true)}
      />

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Greeting */}
        <Typography variant="h3" sx={{ mb: 0.5 }}>
          {getGreeting()}, {user?.firstName}
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 4 }}>
          {isTeacher
            ? "Here are your classes. Create a new one to get started."
            : "Here are your enrolled classes."}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Classroom grid */}
        {isLoading ? (
          <Grid container spacing={3}>
            {[1, 2, 3].map((i) => (
              <Grid item xs={12} sm={6} md={4} key={i}>
                <Skeleton
                  variant="rounded"
                  height={220}
                  sx={{ borderRadius: 3 }}
                />
              </Grid>
            ))}
          </Grid>
        ) : classrooms.length === 0 ? (
          <Box
            sx={{
              textAlign: "center",
              py: 10,
              px: 2,
              bgcolor: "background.paper",
              borderRadius: 3,
              border: "2px dashed",
              borderColor: "divider",
            }}
          >
            <EmptyIcon sx={{ fontSize: 64, color: "text.disabled", mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              No classes yet
            </Typography>
            <Typography color="text.secondary">
              {isTeacher
                ? "Click the + button above to create your first class."
                : "Click the + button above and enter an invite code to join a class."}
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {classrooms.map((classroom) => (
              <Grid item xs={12} sm={6} md={4} key={classroom.id}>
                <ClassroomCard classroom={classroom} />
              </Grid>
            ))}
          </Grid>
        )}
      </Container>

      {/* Dialogs */}
      <CreateClassroomDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
      />
      <JoinClassroomDialog
        open={joinOpen}
        onClose={() => setJoinOpen(false)}
        onSubmit={handleJoin}
      />
    </Box>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
