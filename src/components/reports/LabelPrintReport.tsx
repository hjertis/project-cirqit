import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  TextField,
  MenuItem,
} from "@mui/material";
import { db } from "../../config/firebase";
import { collection, getDocs, query, orderBy, Timestamp } from "firebase/firestore";

interface PrintLog {
  workOrder: string;
  partNumber: string;
  startSerial: string;
  quantity: number;
  printerIp: string;
  timestamp: Timestamp;
  week: string;
}

const LabelPrintReport = () => {
  const [logs, setLogs] = useState<PrintLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterWeek, setFilterWeek] = useState("");
  const [weeks, setWeeks] = useState<string[]>([]);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      const labelSerialsCol = collection(db, "labelSerials");
      const weekSnaps = await getDocs(labelSerialsCol);
      const weekIds: string[] = [];
      let allLogs: PrintLog[] = [];
      for (const weekDoc of weekSnaps.docs) {
        const week = weekDoc.id;
        weekIds.push(week);
        const printsCol = collection(db, "labelSerials", week, "prints");
        const printSnaps = await getDocs(query(printsCol, orderBy("timestamp", "desc")));
        printSnaps.forEach(docSnap => {
          const data = docSnap.data();
          allLogs.push({
            ...data,
            week,
          } as PrintLog);
        });
      }
      setWeeks(weekIds.sort().reverse());
      setLogs(allLogs);
      setLoading(false);
    };
    fetchLogs();
  }, []);

  const filteredLogs = filterWeek ? logs.filter(l => l.week === filterWeek) : logs;

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Label Print Traceability Report
      </Typography>
      <Box sx={{ mb: 2, display: "flex", gap: 2 }}>
        <TextField
          select
          label="Filter by Week"
          value={filterWeek}
          onChange={e => setFilterWeek(e.target.value)}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">All Weeks</MenuItem>
          {weeks.map(week => (
            <MenuItem key={week} value={week}>
              {week}
            </MenuItem>
          ))}
        </TextField>
      </Box>
      {loading ? (
        <CircularProgress />
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Week</TableCell>
                <TableCell>Work Order</TableCell>
                <TableCell>Part Number</TableCell>
                <TableCell>Start Serial</TableCell>
                <TableCell>Quantity</TableCell>
                <TableCell>Printer IP</TableCell>
                <TableCell>Timestamp</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLogs.map((log, idx) => (
                <TableRow key={idx}>
                  <TableCell>{log.week}</TableCell>
                  <TableCell>{log.workOrder}</TableCell>
                  <TableCell>{log.partNumber}</TableCell>
                  <TableCell>{log.startSerial}</TableCell>
                  <TableCell>{log.quantity}</TableCell>
                  <TableCell>{log.printerIp}</TableCell>
                  <TableCell>{log.timestamp?.toDate().toLocaleString() || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default LabelPrintReport;
