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
import { archiveOrder } from "./orderService";

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
  
  // Check if we need to archive this order
  const isFinishedOrder = order.Status === "Finished" || order.Status === "Done";
  
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
    
    // If the order is finished, archive it immediately
    if (isFinishedOrder) {
      await archiveOrder(workOrderId);
      return { created: true, updated: false, archived: true };
    }
    
    return { created: true, updated: false, archived: false };
  } else {
    // Update existing order
    const updates: Record<string, any> = {};
    const currentData = docSnap.data();
    let statusChanged = false;
    
    if (currentData?.status !== order.Status) {
      updates.status = order.Status;
      statusChanged = true;
    }
    
    if (
      !currentData?.start?.toDate || 
      currentData.start.toDate().getTime() !== startDate.getTime()
    ) {
      updates.start = Timestamp.fromDate(startDate);
    }
    
    if (
      !currentData?.end?.toDate ||
      currentData.end.toDate().getTime() !== endDate.getTime()
    ) {
      updates.end = Timestamp.fromDate(endDate);
    }
    
    if (
      currentData?.quantity !== Number(order.Quantity) &&
      !isNaN(Number(order.Quantity))
    ) {
      updates.quantity = Number(order.Quantity);
    }
    
    if (Object.keys(updates).length > 0) {
      updates.updated = Timestamp.fromDate(new Date());
      await updateDoc(docRef, updates);
      
      // If the status was changed to "Finished" or "Done", archive the order
      if (statusChanged && isFinishedOrder) {
        await archiveOrder(workOrderId);
        return { created: false, updated: true, archived: true };
      }
      
      return { created: false, updated: true, archived: false };
    }
    
    return { created: false, updated: false, archived: false };
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
    archived: 0,
    skipped: 0,
    errors: 0,
    errorMessages: [] as string[]
  };
  
  for (const order of orders) {
    try {
      const result = await importOrder(order);
      if (result.created) results.created++;
      if (result.updated) results.updated++;
      if (result.archived) results.archived++;
      if (!result.created && !result.updated) results.skipped++;
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