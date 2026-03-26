import {
  Card,
  CardContent,
  CardActionArea,
  Typography,
  Avatar,
  Box,
  Chip,
} from "@mui/material";
import { People as PeopleIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { Classroom } from "@/types";
import { getInitials } from "@/utils/helpers";

interface ClassroomCardProps {
  classroom: Classroom;
}

export default function ClassroomCard({ classroom }: ClassroomCardProps) {
  const navigate = useNavigate();

  return (
    <Card
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <CardActionArea
        onClick={() => navigate(`/classroom/${classroom.id}`)}
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
        }}
      >
        {/* Banner */}
        <Box
          sx={{
            bgcolor: classroom.bannerColor || "#1a6b4a",
            height: 100,
            position: "relative",
            px: 2.5,
            pt: 2,
          }}
        >
          <Typography
            variant="h5"
            sx={{
              color: "white",
              fontFamily: '"DM Serif Display", serif',
              fontWeight: 400,
              fontSize: "1.35rem",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {classroom.name}
          </Typography>
          {classroom.section && (
            <Typography
              variant="body2"
              sx={{ color: "rgba(255,255,255,0.85)", mt: 0.25 }}
            >
              {classroom.section}
            </Typography>
          )}

          {/* Teacher avatar */}
          <Avatar
            sx={{
              position: "absolute",
              right: 16,
              bottom: -24,
              width: 48,
              height: 48,
              bgcolor: "secondary.main",
              border: "3px solid white",
              fontSize: "1rem",
            }}
          >
            {getInitials(
              classroom.teacher.firstName,
              classroom.teacher.lastName,
            )}
          </Avatar>
        </Box>

        {/* Content */}
        <CardContent sx={{ flexGrow: 1, pt: 2.5 }}>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              minHeight: 40,
            }}
          >
            {classroom.description || "No description"}
          </Typography>
        </CardContent>

        {/* Footer */}
        <Box
          sx={{
            px: 2.5,
            pb: 2,
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <Chip
            icon={<PeopleIcon />}
            label={`${classroom.studentCount} student${classroom.studentCount !== 1 ? "s" : ""}`}
            size="small"
            variant="outlined"
            sx={{
              "& .MuiChip-icon": {
                ml: 1.5,
              },
            }}
          />
          {classroom.subject && (
            <Chip label={classroom.subject} size="small" variant="outlined" />
          )}
        </Box>
      </CardActionArea>
    </Card>
  );
}
