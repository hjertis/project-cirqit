export interface Order {
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

  assignedResourceId?: string;
  assignedResourceName?: string;
}

export interface Fault {
  orderId: string;
  partNumber: string;
  refPoint?: string;
  serialNumber?: string;
  description?: string;
  addDate: Timestamp;
  updated: Timestamp;
}

export interface ProcessTemplate {
  name: string;
  duration: number;
  sequence: number;
}

export interface Product {
  partNo: string;
  description: string;
  processTemplates: ProcessTemplate[];
  // Add other fields as needed (e.g., count, etc.)
}
