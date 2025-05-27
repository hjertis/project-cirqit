import { db } from "../config/firebase";
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  Timestamp,
  updateDoc,
  collection,
  writeBatch,
} from "firebase/firestore";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { archiveOrder } from "./orderService";
import { DEFAULT_PRODUCT_PROCESSES } from "../constants/defaultProcessTemplate";

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
  FinishedDate?: string; // Add support for FinishedDate
}

const parseDate = (dateString: string): Date | null => {
  const formats = ["DD-MM-YYYY", "DD/MM/YYYY"];
  for (const format of formats) {
    const parsedDate = dayjs(dateString, format, true);
    if (parsedDate.isValid()) {
      return parsedDate.toDate();
    }
  }
  return null;
};

export const importOrder = async (order: OrderImportData) => {
  const workOrderId = order.No;
  const docRef = doc(db, "orders", workOrderId);
  const docSnap = await getDoc(docRef);

  const startDate = parseDate(order.StartingDateTime);
  const endDate = parseDate(order.EndingDateTime);
  const finishedDate = order.FinishedDate ? parseDate(order.FinishedDate) : null;

  if (!startDate || !endDate) {
    throw new Error("Invalid date format. Supported formats are DD-MM-YYYY and DD/MM/YYYY.");
  }

  const getPriority = (state?: string) => {
    if (state === "URGENT") return "High";
    if (state === "HIGH") return "Medium-High";
    return "Medium";
  };
  const isFinishedOrder = order.Status === "Finished" || order.Status === "Done";
  const isRemovedOrder = order.Status === "Removed";

  if (!docSnap.exists()) {
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
      updated: Timestamp.fromDate(new Date()),
      // Add finishedDate if available
      ...(finishedDate && { finishedDate: Timestamp.fromDate(finishedDate) }),
      // Add removedDate if the status is Removed
      ...(isRemovedOrder && { removedDate: Timestamp.fromDate(new Date()) }),
    };

    await setDoc(docRef, workOrder);

    await generateProcesses(
      workOrderId,
      order.State || "REGULAR",
      startDate,
      order.Description,
      order.SourceNo
    );
    if (isFinishedOrder) {
      await archiveOrder(workOrderId);
      return { created: true, updated: false, archived: true };
    }

    if (isRemovedOrder) {
      return { created: true, updated: false, removed: true };
    }

    return { created: true, updated: false, archived: false };
  } else {
    const updates: Record<string, any> = {}; // Use 'any' for flexibility or a more specific type
    const currentData = docSnap.data();
    let statusChangedToFinishedOrDone = false;
    let statusChangedToRemoved = false;

    // Check if the status in the CSV is different from the current status in Firestore
    const FINAL_STATUSES = ["Finished", "Done"];
    if (
      currentData?.status !== order.Status &&
      order.Status &&
      FINAL_STATUSES.includes(order.Status)
    ) {
      updates.status = order.Status; // Only update if CSV status is Finished or Done

      // Check if the new status is 'Finished' or 'Done'
      if (order.Status === "Finished" || order.Status === "Done") {
        statusChangedToFinishedOrDone = true;
      }
      // Check if the new status is 'Removed'
      if (order.Status === "Removed") {
        updates.removedDate = Timestamp.fromDate(new Date());
        statusChangedToRemoved = true;
      }
    }

    if (
      !currentData?.start?.toDate ||
      currentData.start.toDate().getTime() !== startDate.getTime()
    ) {
      updates.start = Timestamp.fromDate(startDate);
    }

    if (currentData?.end?.toDate && currentData.end.toDate().getTime() !== endDate.getTime()) {
      updates.end = Timestamp.fromDate(endDate);
    }

    if (currentData?.quantity !== Number(order.Quantity) && !isNaN(Number(order.Quantity))) {
      updates.quantity = Number(order.Quantity);
    }

    // Add finishedDate update logic
    if (finishedDate) {
      const currentFinishedDate = currentData.finishedDate?.toDate?.();
      if (!currentFinishedDate || currentFinishedDate.getTime() !== finishedDate.getTime()) {
        updates.finishedDate = Timestamp.fromDate(finishedDate);
      }
    }
    if (Object.keys(updates).length > 0) {
      updates.updated = Timestamp.fromDate(new Date());
      await updateDoc(docRef, updates);

      if (statusChangedToFinishedOrDone) {
        await archiveOrder(workOrderId);
        return { created: false, updated: true, archived: true };
      }

      if (statusChangedToRemoved) {
        return { created: false, updated: true, removed: true };
      }

      return { created: false, updated: true, archived: false };
    }

    return { created: false, updated: false, archived: false };
  }
};

export const importOrdersBatch = async (
  orders: OrderImportData[],
  detectRemoved: boolean = true
) => {
  const results = {
    total: orders.length,
    created: 0,
    updated: 0,
    archived: 0,
    removed: 0,
    skipped: 0,
    autoRemoved: 0, // Count for orders auto-marked as removed
    errors: 0,
    errorMessages: [] as string[],
  };

  // Get all order numbers in the current import
  const importedOrderNumbers = new Set(orders.map(order => order.No));

  // Fetch all finished (archived) orders to avoid re-importing them
  const finishedOrdersSnapshot = await getDocs(collection(db, "archivedOrders"));
  const finishedOrderNumbers = new Set<string>();
  finishedOrdersSnapshot.forEach(doc => {
    const data = doc.data();
    if (data.orderNumber) {
      finishedOrderNumbers.add(data.orderNumber);
    }
  });

  // Process removal detection if enabled
  if (detectRemoved) {
    try {
      // Fetch all active orders that aren't finished or already removed
      const activeOrdersRef = collection(db, "orders");
      const activeOrdersSnapshot = await getDocs(
        query(activeOrdersRef, where("status", "not-in", ["Finished", "Done", "Removed"]))
      );

      const batch = writeBatch(db);
      let autoRemovedCount = 0;

      // Check each active order to see if it's in the import
      activeOrdersSnapshot.forEach(orderDoc => {
        const orderData = orderDoc.data();

        // If the order is not in the current import, mark it as removed
        if (!importedOrderNumbers.has(orderData.orderNumber)) {
          const orderRef = doc(db, "orders", orderDoc.id);
          batch.update(orderRef, {
            status: "Removed",
            removedDate: Timestamp.fromDate(new Date()),
            updated: Timestamp.fromDate(new Date()),
          });
          autoRemovedCount++;
        }
      });

      // Commit the batch update if there are any orders to be auto-removed
      if (autoRemovedCount > 0) {
        await batch.commit();
        results.autoRemoved = autoRemovedCount;
      }
    } catch (error) {
      console.error("Error detecting removed orders:", error);
      results.errorMessages.push(
        `Error detecting removed orders: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // Process each order in the import
  for (const order of orders) {
    // Skip orders that are already finished/archived
    if (finishedOrderNumbers.has(order.No)) {
      results.skipped = (results.skipped || 0) + 1;
      continue;
    }
    try {
      const result = await importOrder(order);
      if (result.created) results.created++;
      if (result.updated) results.updated++;
      if (result.archived) results.archived++;
      if (result.removed) results.removed++;
    } catch (error) {
      console.error(`Error importing order ${order.No}:`, error);
      results.errors++;
      results.errorMessages.push(
        `Error importing order ${order.No}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  return results;
};

const generateProcesses = async (
  workOrderId: string,
  state: string,
  startDate: Date,
  description: string,
  sourceNo: string
) => {
  const processTemplate = DEFAULT_PRODUCT_PROCESSES[state] || DEFAULT_PRODUCT_PROCESSES["REGULAR"];

  for (const [index, step] of processTemplate.entries()) {
    const stepId = `${workOrderId}-step-${index + 1}`;
    const stepDocRef = doc(db, "orderProcesses", stepId);

    const startOffset = step.startOffset || 0;
    const endOffset = step.endOffset || 0;

    const stepStartDate = Timestamp.fromDate(
      new Date(startDate.getTime() + startOffset * 60 * 1000)
    );
    const stepEndDate = Timestamp.fromDate(new Date(startDate.getTime() + endOffset * 60 * 1000));

    await setDoc(stepDocRef, {
      orderId: workOrderId,
      stepId,
      description: step.description,
      start: stepStartDate,
      end: stepEndDate,
      status: "Pending",
      created: Timestamp.fromDate(new Date()),
      updated: Timestamp.fromDate(new Date()),
    });
  }
};
