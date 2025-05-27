import { Timestamp } from "firebase/firestore";
import OptimizedPrintableWorkOrder from "./OptimizedPrintableWorkOrder";

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

interface Order {
  id: string;
  orderNumber: string;
  description: string;
  partNo: string;
  quantity: number;
  status: string;
  start: Timestamp;
  end: Timestamp;
  customer?: string;
  priority?: string;
  notes?: string;
  updated?: Timestamp;
}

interface PrintableWorkOrderProps {
  open: boolean;
  onClose: () => void;
  order: Order;
  processes: Process[];
}

const PrintableWorkOrder = ({ open, onClose, order, processes }: PrintableWorkOrderProps) => {
  return (
    <OptimizedPrintableWorkOrder
      open={open}
      onClose={onClose}
      order={order}
      processes={processes}
    />
  );
};

export default PrintableWorkOrder;
