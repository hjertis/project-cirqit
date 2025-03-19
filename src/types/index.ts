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
  // New fields for resource assignment
  assignedResourceId?: string; // ID of the assigned resource
  assignedResourceName?: string; // Name of the assigned resource (for display)
}
