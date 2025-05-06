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
