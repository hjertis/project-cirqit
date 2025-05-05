import {
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
} from "@mui/material";

interface EfficiencyData {
  order: string;
  description: string;
  plannedEnd: string;
  actualEnd: string;
  difference: number;
  onTime: boolean;
}

interface EfficiencyDetailsTableProps {
  data: EfficiencyData[];
}

const EfficiencyDetailsTable = ({ data }: EfficiencyDetailsTableProps) => (
  <TableContainer>
    <Table>
      <TableHead>
        <TableRow sx={{ backgroundColor: "background.default" }}>
          <TableCell>Order No</TableCell>
          <TableCell>Product</TableCell>
          <TableCell>Planned End</TableCell>
          <TableCell>Actual End</TableCell>
          <TableCell>Difference</TableCell>
          <TableCell>Status</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {data.map((item, index) => (
          <TableRow key={index} hover>
            <TableCell>{item.order}</TableCell>
            <TableCell>{item.description}</TableCell>
            <TableCell>{item.plannedEnd}</TableCell>
            <TableCell>{item.actualEnd}</TableCell>
            <TableCell sx={{ color: item.difference > 0 ? "error.main" : "success.main" }}>
              {item.difference > 0 ? `+${item.difference.toFixed(1)}` : item.difference.toFixed(1)}{" "}
              days
            </TableCell>
            <TableCell>
              <Chip
                label={item.onTime ? "On Time" : "Delayed"}
                color={item.onTime ? "success" : "warning"}
                size="small"
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TableContainer>
);

export default EfficiencyDetailsTable;
