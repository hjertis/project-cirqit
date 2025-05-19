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
  FieldValue,
} from "firebase/firestore";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { archiveOrder } from "./orderService";
import { STANDARD_PROCESS_NAMES } from "../constants/constants.ts";
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

const washKeywords = ["EVP", "TSP", "SKY", "ETI", "TS PRO"];

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
    const updates: Record<string, FieldValue | Partial<unknown> | undefined> = {};
    const currentData = docSnap.data();
    let statusChanged = false;
    let statusRemovedChanged = false;

    if (currentData?.status !== order.Status) {
      if (order.Status === "Finished" || order.Status === "Done") {
        updates.status = order.Status;
        statusChanged = true;
      }

      if (order.Status === "Removed") {
        updates.status = order.Status;
        updates.removedDate = Timestamp.fromDate(new Date());
        statusRemovedChanged = true;
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

      if (statusChanged && isFinishedOrder) {
        await archiveOrder(workOrderId);
        return { created: false, updated: true, archived: true };
      }

      if (statusRemovedChanged) {
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
    try {
      const result = await importOrder(order);
      if (result.created) results.created++;
      if (result.updated) results.updated++;
      if (result.archived) results.archived++;
      if (result.removed) results.removed++;
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

const generateProcesses = async (
  workOrderId: string,
  state: string,
  startDate: Date,
  productName?: string,
  partNo?: string
) => {
  const batch = writeBatch(db);

  // 1. Try to get product processTemplates
  let processTemplates: any[] = [];
  if (partNo) {
    const productDoc = await getDoc(doc(db, "products", partNo));
    if (productDoc.exists()) {
      const productData = productDoc.data();
      if (productData && Array.isArray(productData.processTemplates)) {
        processTemplates = productData.processTemplates;
      }
    }
  }

  // 2. Fallback to default
  if (processTemplates.length === 0) {
    processTemplates = DEFAULT_PRODUCT_PROCESSES;
  }

  // 3. Create process entries for this order
  let currentDate = new Date(startDate);
  processTemplates.forEach((template, index) => {
    const processRef = doc(collection(db, "processes"));
    const durationDays = template.durationDays ?? 1;
    const endDate = new Date(currentDate);
    endDate.setDate(endDate.getDate() + durationDays);

    batch.set(processRef, {
      ...template,
      workOrderId,
      processId: processRef.id,
      sequence: template.sequence ?? index + 1,
      status: index === 0 ? "Pending" : "Not Started",
      startDate: Timestamp.fromDate(currentDate),
      endDate: Timestamp.fromDate(endDate),
      assignedResource: null,
      progress: 0,
      createdAt: Timestamp.fromDate(new Date()),
    });

    currentDate = new Date(endDate);
  });

  await batch.commit();
};
