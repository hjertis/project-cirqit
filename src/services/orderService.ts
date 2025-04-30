import {
  doc,
  collection,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  query,
  where,
  getDocs,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "../config/firebase";

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
  state?: string;
}

export const updateOrderStatus = async (
  orderId: string,
  newStatus: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const orderRef = doc(db, "orders", orderId);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists()) {
      return {
        success: false,
        message: `Order ${orderId} not found`,
      };
    }

    const orderData = orderSnap.data();

    const isFinishingOrder = newStatus === "Finished" || newStatus === "Done";

    if (isFinishingOrder) {
      await archiveOrder(orderId);
      return {
        success: true,
        message: `Order ${orderId} updated to ${newStatus} and moved to archive`,
      };
    } else {
      await updateDoc(orderRef, {
        status: newStatus,
        updated: Timestamp.fromDate(new Date()),
      });

      return {
        success: true,
        message: `Order ${orderId} updated to ${newStatus}`,
      };
    }
  } catch (error) {
    console.error(`Error updating order ${orderId} status:`, error);
    return {
      success: false,
      message: `Failed to update order: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};

export const archiveOrder = async (
  orderId: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const batch = writeBatch(db);

    const orderRef = doc(db, "orders", orderId);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists()) {
      return {
        success: false,
        message: `Order ${orderId} not found`,
      };
    }

    const orderData = orderSnap.data();

    if (orderData.status !== "Finished" && orderData.status !== "Done") {
      orderData.status = "Finished";
    }

    const archivedOrder = {
      ...orderData,
      archivedAt: Timestamp.fromDate(new Date()),
      originalId: orderId,
      updated: Timestamp.fromDate(new Date()),
    };

    const archivedOrderRef = doc(db, "archivedOrders", orderId);
    batch.set(archivedOrderRef, archivedOrder);

    batch.delete(orderRef);

    const processesQuery = query(collection(db, "processes"), where("workOrderId", "==", orderId));

    const processesSnapshot = await getDocs(processesQuery);

    processesSnapshot.forEach(processDoc => {
      const processData = processDoc.data();

      const archivedProcessRef = doc(db, "archivedProcesses", processDoc.id);
      batch.set(archivedProcessRef, {
        ...processData,
        archivedAt: Timestamp.fromDate(new Date()),
        originalId: processDoc.id,
      });

      const processRef = doc(db, "processes", processDoc.id);
      batch.delete(processRef);
    });

    await batch.commit();

    return {
      success: true,
      message: `Order ${orderId} archived successfully with ${processesSnapshot.size} related processes`,
    };
  } catch (error) {
    console.error(`Error archiving order ${orderId}:`, error);
    return {
      success: false,
      message: `Failed to archive order: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};

export const restoreOrder = async (
  archivedOrderId: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const batch = writeBatch(db);

    const archivedOrderRef = doc(db, "archivedOrders", archivedOrderId);
    const archivedOrderSnap = await getDoc(archivedOrderRef);

    if (!archivedOrderSnap.exists()) {
      return {
        success: false,
        message: `Archived order ${archivedOrderId} not found`,
      };
    }

    const orderData = archivedOrderSnap.data();

    const { archivedAt, ...activeOrderData } = orderData;

    activeOrderData.updated = Timestamp.fromDate(new Date());

    const orderRef = doc(db, "orders", archivedOrderId);
    batch.set(orderRef, activeOrderData);

    batch.delete(archivedOrderRef);

    const archivedProcessesQuery = query(
      collection(db, "archivedProcesses"),
      where("workOrderId", "==", archivedOrderId)
    );

    const processesSnapshot = await getDocs(archivedProcessesQuery);

    processesSnapshot.forEach(processDoc => {
      const processData = processDoc.data();

      const { archivedAt, ...activeProcessData } = processData;

      const processRef = doc(db, "processes", processDoc.id);
      batch.set(processRef, activeProcessData);

      const archivedProcessRef = doc(db, "archivedProcesses", processDoc.id);
      batch.delete(archivedProcessRef);
    });

    await batch.commit();

    return {
      success: true,
      message: `Order ${archivedOrderId} restored successfully with ${processesSnapshot.size} related processes`,
    };
  } catch (error) {
    console.error(`Error restoring order ${archivedOrderId}:`, error);
    return {
      success: false,
      message: `Failed to restore order: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};
