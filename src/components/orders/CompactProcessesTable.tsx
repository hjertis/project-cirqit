import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Box,
  Checkbox,
  Paper,
} from "@mui/material";
import { Timestamp } from "firebase/firestore";

interface Process {
  id: string;
  name: string;
  type: string;
  sequence: number;
  status: string;
  startDate: Timestamp;
  endDate: Timestamp;
  assignedResource: string | null;
  progress: number;
}

interface CompactProcessesTableProps {
  processes: Process[];
  processProgress: Record<string, number>;
  onProgressChange?: (processId: string, progress: number) => void;
  isPrintMode?: boolean;
}

const formatDate = (timestamp: Timestamp): string => {
  if (!timestamp || !timestamp.toDate) return "N/A";
  const date = timestamp.toDate();
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

const CompactProcessesTable = ({
  processes,
  processProgress,
  onProgressChange,
  isPrintMode = false,
}: CompactProcessesTableProps) => {
  const handleProgressChange = (processId: string, progress: number) => {
    if (onProgressChange) {
      onProgressChange(processId, progress);
    }
  };

  if (processes.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No processes found for this order.
      </Typography>
    );
  }

  return (
    <TableContainer component={Paper} variant="outlined" className="process-table" sx={{ mb: 1 }}>
      <Table size="small" sx={{ tableLayout: "fixed" }}>
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox" sx={{ width: "4%" }}>
              Seq
            </TableCell>
            <TableCell sx={{ width: "20%" }}>Process</TableCell>
            <TableCell sx={{ width: "20%" }}>Date Range</TableCell>
            <TableCell sx={{ width: "12%" }}>Resource</TableCell>
            <TableCell sx={{ width: "26%" }}>Progress</TableCell>
            <TableCell sx={{ width: "18%" }}>Notes</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {processes.map(process => (
            <TableRow
              key={process.id}
              className="process-row"
              sx={{ height: isPrintMode ? "30px" : "auto" }}
            >
              <TableCell align="center" padding="checkbox">
                <Typography variant="caption">{process.sequence}</Typography>
              </TableCell>
              <TableCell sx={{ p: 0.5 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: "medium",
                    fontSize: isPrintMode ? "0.75rem" : "0.8rem",
                    lineHeight: 1.2,
                  }}
                >
                  {process.name}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    fontSize: isPrintMode ? "0.65rem" : "0.7rem",
                    display: "block",
                    lineHeight: 1,
                  }}
                >
                  {process.type}
                </Typography>
              </TableCell>
              <TableCell sx={{ p: 0.5, whiteSpace: "nowrap" }}>
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: isPrintMode ? "0.7rem" : "0.75rem",
                    lineHeight: 1.1,
                    display: "block",
                  }}
                >
                  {formatDate(process.startDate)} -<br />
                  {formatDate(process.endDate)}
                </Typography>
              </TableCell>
              <TableCell sx={{ p: 0.5 }}>
                <Typography variant="caption">{process.assignedResource || "—"}</Typography>
              </TableCell>
              <TableCell sx={{ p: 0.5 }}>
                <Box className="progress-section" sx={{ width: "100%" }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      width: "100%",
                    }}
                  >
                    {[0, 25, 50, 75, 100].map(value => (
                      <Box
                        key={value}
                        sx={{
                          textAlign: "center",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                        }}
                      >
                        <Checkbox
                          checked={processProgress[process.id] >= value}
                          onChange={() => handleProgressChange(process.id, value)}
                          sx={{
                            p: 0,
                            m: 0,
                            transform: isPrintMode ? "scale(0.7)" : "scale(0.8)",
                          }}
                          className="progress-checkbox"
                          size="small"
                          disabled={!onProgressChange}
                        />
                        <Typography
                          variant="caption"
                          sx={{
                            fontSize: isPrintMode ? "0.6rem" : "0.65rem",
                            display: "block",
                            mt: -0.5,
                          }}
                        >
                          {value}%
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </TableCell>
              <TableCell sx={{ p: 0.5 }}>
                <Box
                  className="notes-field"
                  sx={{
                    height: isPrintMode ? "20px" : "25px",
                    border: "1px solid #ddd",
                    width: "100%",
                  }}
                >
                  &nbsp;
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default CompactProcessesTable;
