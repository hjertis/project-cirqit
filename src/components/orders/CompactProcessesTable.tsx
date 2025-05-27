import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Box,
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
  duration?: number;
}

interface CompactProcessesTableProps {
  processes: Process[];
  isPrintMode?: boolean;
  orderQuantity?: number;
}

const CompactProcessesTable = ({
  processes,
  isPrintMode = false,
  orderQuantity,
}: CompactProcessesTableProps) => {
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
        {" "}
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: "10%", fontWeight: "bold", fontSize: "0.8rem" }}>Seq</TableCell>
            <TableCell sx={{ width: "30%", fontWeight: "bold", fontSize: "0.8rem" }}>
              Process
            </TableCell>
            <TableCell
              sx={{ width: "35%", fontWeight: "bold", fontSize: "0.8rem", textAlign: "center" }}
            >
              Progress (Pieces Completed)
            </TableCell>
            <TableCell
              sx={{ width: "25%", fontWeight: "bold", fontSize: "0.8rem", textAlign: "center" }}
            >
              Operator Sign-off
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {processes.map(process => (
            <TableRow
              key={process.id}
              className="process-row"
              sx={{ height: isPrintMode ? "30px" : "auto" }}
            >
              <TableCell sx={{ textAlign: "center", fontSize: "0.8rem", verticalAlign: "bottom" }}>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    height: "100%",
                    minHeight: "40px",
                  }}
                >
                  <Typography variant="body2" sx={{ fontSize: "0.8rem" }}>
                    {process.sequence}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell sx={{ fontSize: "0.8rem", verticalAlign: "bottom" }}>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    justifyContent: "flex-end",
                    height: "100%",
                    minHeight: "40px",
                  }}
                >
                  <Typography variant="body2" sx={{ fontSize: "0.8rem" }}>
                    {process.name}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell sx={{ textAlign: "center", padding: "8px", verticalAlign: "bottom" }}>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    height: "100%",
                    minHeight: "40px",
                  }}
                >
                  <Typography variant="caption" sx={{ fontSize: "0.7rem" }}>
                    _______________ / {orderQuantity} done
                  </Typography>
                </Box>
              </TableCell>
              <TableCell sx={{ textAlign: "center", padding: "8px" }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "8px",
                  }}
                >
                  <Box
                    sx={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}
                  >
                    <Typography variant="caption" sx={{ fontSize: "0.65rem", mb: 0.5 }}>
                      Initials:
                    </Typography>
                    <Box
                      sx={{
                        borderBottom: "1px solid #000",
                        minHeight: "18px",
                        width: "100%",
                      }}
                    />
                  </Box>
                  <Box
                    sx={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}
                  >
                    <Typography variant="caption" sx={{ fontSize: "0.65rem", mb: 0.5 }}>
                      Date:
                    </Typography>
                    <Box
                      sx={{
                        borderBottom: "1px solid #000",
                        minHeight: "18px",
                        width: "100%",
                      }}
                    />
                  </Box>
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
