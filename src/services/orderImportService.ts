// src/services/orderImportService.ts
import { db } from "../config/firebase";
import { 
  doc, 
  setDoc, 
  getDoc, 
  Timestamp, 
  updateDoc,
  collection,
  writeBatch
} from "firebase/firestore";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

// Initialize dayjs with custom parse format plugin
dayjs.extend(customParseFormat);

export interface OrderImportData {
  No: string;
  Description: string;
  SourceNo: string;
  Quantity: string | number;
  StartingDateTime: string;
  EndingDateTime: string;
  Status: string;
  Notes?: string;
  State?: string;
}

/**
 * Import a single order into Firestore
 */
export const importOrder = async (order: OrderImportData) => {
  const workOrderId = order.No;
  const docRef = doc(db, "orders", workOrderId);
  const docSnap = await getDoc(docRef);
  
  // Parse dates
  const startDate = dayjs(order.StartingDateTime, "DD-MM-YYYY").toDate();
  const endDate = dayjs(order.EndingDateTime, "DD-MM-YYYY").toDate();
  
  // Determine priority based on order state
  const getPriority = (state?: string) => {
    if (state === "URGENT") return "High";
    if (state === "HIGH") return "Medium-High";
    return "Medium";
  };
  
  if (!docSnap.exists()) {
    // Create new order
    const workOrder = {
      orderNumber: order.No,
      id: order.No,
      description: order.Description,
      partNo: order.SourceNo,
      quantity: Number(order.Quantity),
      start: Timestamp.fromDate(startDate),
      end: Timestamp.fromDate(endDate),
      dueDate: Timestamp.fromDate(endDate),
      status: order.Status,
      priority: getPriority(order.State),
      notes: order.Notes || "",
      state: order.State || "",
      updated: Timestamp.fromDate(new Date())
    };
    
    // Save the work order
    await setDoc(docRef, workOrder);
    
    // Generate processes for this work order
    await generateProcesses(workOrderId, order.State || "REGULAR", startDate);
    
    return { created: true, updated: false };
  } else {
    // Update existing order
    const updates: Record<string, any> = {};
    
    if (docSnap.data()?.status !== order.Status) {
      updates.status = order.Status;
    }
    
    if (
      !docSnap.data()?.start?.toDate || 
      docSnap.data().start.toDate().getTime() !== startDate.getTime()
    ) {
      updates.start = Timestamp.fromDate(startDate);
    }
    
    if (
      !docSnap.data()?.end?.toDate ||
      docSnap.data().end.toDate().getTime() !== endDate.getTime()
    ) {
      updates.end = Timestamp.fromDate(endDate);
    }
    
    if (
      docSnap.data()?.quantity !== Number(order.Quantity) &&
      !isNaN(Number(order.Quantity))
    ) {
      updates.quantity = Number(order.Quantity);
    }
    
    if (Object.keys(updates).length > 0) {
      updates.updated = Timestamp.fromDate(new Date());
      await updateDoc(docRef, updates);
      return { created: false, updated: true };
    }
    
    return { created: false, updated: false };
  }
};

/**
 * Import multiple orders in batch
 */
export const importOrdersBatch = async (orders: OrderImportData[]) => {
  const results = {
    total: orders.length,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    errorMessages: [] as string[]
  };
  
  for (const order of orders) {
    try {
      const result = await importOrder(order);
      if (result.created) results.created++;
      else if (result.updated) results.updated++;
      else results.skipped++;
    } catch (error) {
      results.errors++;
      results.errorMessages.push(
        `Error importing order ${order.No}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  
  return results;
};

/**
 * Generate process entries for a work order
 */
const generateProcesses = async (workOrderId: string, state: string, startDate: Date) => {
  // In a real implementation, you would load process templates and 
  // generate actual process records.
  // This is a simplified implementation.
  
  const batch = writeBatch(db);
  const processTypes = ["Setup", "Production", "Quality Check", "Packaging"];
  
  // Base duration in days for each process
  const durations = {
    "Setup": 1,
    "Production": state === "URGENT" ? 2 : 3,
    "Quality Check": 1,
    "Packaging": 1
  };
  
  let currentDate = new Date(startDate);
  
  processTypes.forEach((processType, index) => {
    const processRef = doc(collection(db, "processes"));
    const durationDays = durations[processType as keyof typeof durations];
    
    const endDate = new Date(currentDate);
    endDate.setDate(endDate.getDate() + durationDays);
    
    batch.set(processRef, {
      workOrderId,
      processId: processRef.id,
      type: processType,
      name: `${processType} - WO-${workOrderId}`,
      sequence: index + 1,
      status: index === 0 ? "Pending" : "Not Started",
      startDate: Timestamp.fromDate(currentDate),
      endDate: Timestamp.fromDate(endDate),
      assignedResource: null,
      progress: 0,
      createdAt: Timestamp.fromDate(new Date())
    });
    
    // Set next process start date
    currentDate = new Date(endDate);
  });
  
  await batch.commit();
};