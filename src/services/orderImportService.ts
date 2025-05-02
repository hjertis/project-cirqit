import { db } from "../config/firebase";
import {
  doc,
  setDoc,
  getDoc,
  Timestamp,
  updateDoc,
  collection,
  writeBatch,
} from "firebase/firestore";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { archiveOrder } from "./orderService";
import { STANDARD_PROCESS_NAMES } from "../constants/constants.ts";

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

export const importOrder = async (order: OrderImportData) => {
  const workOrderId = order.No;
  const docRef = doc(db, "orders", workOrderId);
  const docSnap = await getDoc(docRef);

  const startDate = dayjs(order.StartingDateTime, "DD-MM-YYYY").toDate();
  const endDate = dayjs(order.EndingDateTime, "DD-MM-YYYY").toDate();
  // Parse finished date if available
  const finishedDate = order.FinishedDate ? dayjs(order.FinishedDate, "DD-MM-YYYY").toDate() : null;

  const getPriority = (state?: string) => {
    if (state === "URGENT") return "High";
    if (state === "HIGH") return "Medium-High";
    return "Medium";
  };

  const isFinishedOrder = order.Status === "Finished" || order.Status === "Done";

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
    };

    await setDoc(docRef, workOrder);

    await generateProcesses(workOrderId, order.State || "REGULAR", startDate, order.Description);

    if (isFinishedOrder) {
      await archiveOrder(workOrderId);
      return { created: true, updated: false, archived: true };
    }

    return { created: true, updated: false, archived: false };
  } else {
    const updates: Record<string, any> = {};
    const currentData = docSnap.data();
    let statusChanged = false;

    if (currentData?.status !== order.Status) {
      if (order.Status === "Finished" || order.Status === "Done") {
        updates.status = order.Status;
        statusChanged = true;
      }
    }

    if (
      !currentData?.start?.toDate ||
      currentData.start.toDate().getTime() !== startDate.getTime()
    ) {
      updates.start = Timestamp.fromDate(startDate);
    }

    if (!currentData?.end?.toDate || currentData.end.toDate().getTime() !== endDate.getTime()) {
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

      return { created: false, updated: true, archived: false };
    }

    return { created: false, updated: false, archived: false };
  }
};

export const importOrdersBatch = async (orders: OrderImportData[]) => {
  const results = {
    total: orders.length,
    created: 0,
    updated: 0,
    archived: 0,
    skipped: 0,
    errors: 0,
    errorMessages: [] as string[],
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

const generateProcesses = async (
  workOrderId: string,
  state: string,
  startDate: Date,
  productName?: string
) => {
  const batch = writeBatch(db);
  let processTypes = [...STANDARD_PROCESS_NAMES];

  if (
    productName &&
    washKeywords.some(keyword => productName.toUpperCase().includes(keyword.toUpperCase()))
  ) {
    const hmtIndex = processTypes.indexOf("HMT");
    if (hmtIndex !== -1 && !processTypes.includes("Wash")) {
      processTypes = [
        ...processTypes.slice(0, hmtIndex + 1),
        "Wash",
        ...processTypes.slice(hmtIndex + 1),
      ];
    }
  }

  const durations: Record<string, number> = {
    Setup: 1,
    SMT: state === "URGENT" ? 2 : 3,
    Inspection: 1,
    "Repair/Rework": 1,
    HMT: 1,
    Wash: 1,
    Cut: 1,
    Test: 1,
    Delivery: 1,
  };

  let currentDate = new Date(startDate);

  processTypes.forEach((processType, index) => {
    const processRef = doc(collection(db, "processes"));
    const durationDays = durations[processType as keyof typeof durations] ?? 1;

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
      createdAt: Timestamp.fromDate(new Date()),
    });

    currentDate = new Date(endDate);
  });

  await batch.commit();
};
