import {
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, Timestamp } from "firebase/firestore";
import { db } from "../../config/firebase";

interface EfficiencyData {
  order: string;
  description: string;
  plannedEnd: string;
  actualEnd: string;
  difference: number;
  onTime: boolean;
}

const EfficiencyDetailsTable = () => {
  const fetchEfficiencyData = async () => {
    const ordersSnap = await getDocs(collection(db, "orders"));
    const archivedSnap = await getDocs(collection(db, "archivedOrders"));
    const allOrders = [
      ...ordersSnap.docs.map(doc => doc.data()),
      ...archivedSnap.docs.map(doc => doc.data()),
    ];
    // Only include orders with planned and actual end dates
    return allOrders
      .filter(order => order.end && order.actualEnd)
      .map(order => {
        const plannedEnd =
          order.end instanceof Timestamp ? order.end.toDate() : new Date(order.end);
        const actualEnd =
          order.actualEnd instanceof Timestamp
            ? order.actualEnd.toDate()
            : new Date(order.actualEnd);
        const diff = (actualEnd.getTime() - plannedEnd.getTime()) / (1000 * 60 * 60 * 24);
        return {
          order: order.orderNumber || order.id,
          description: order.description || "",
          plannedEnd: plannedEnd.toLocaleDateString(),
          actualEnd: actualEnd.toLocaleDateString(),
          difference: diff,
          onTime: diff <= 0,
        };
      });
  };

  const {
    data = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["efficiencyDetailsTable"],
    queryFn: fetchEfficiencyData,
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) return <div>Loading...</div>;
  if (isError)
    return (
      <div style={{ color: "red" }}>{error instanceof Error ? error.message : String(error)}</div>
    );
  if (data.length === 0) return <div>No efficiency data available.</div>;

  return (
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
                {item.difference > 0
                  ? `+${item.difference.toFixed(1)}`
                  : item.difference.toFixed(1)}{" "}
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
};

export default EfficiencyDetailsTable;
