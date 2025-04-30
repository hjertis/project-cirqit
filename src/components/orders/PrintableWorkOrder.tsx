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

interface PrintableWorkOrderProps {
  open: boolean;
  onClose: () => void;
  order: any;
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
