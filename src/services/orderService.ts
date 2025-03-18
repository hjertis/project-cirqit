// src/services/orderService.ts
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
  writeBatch
} from "firebase/firestore";
import { db } from "../config/firebase";

// Type definitions
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

/**
 * Updates an order's status
 * If the new status is "Finished" or "Done", the order will be moved to the archive
 */
export const updateOrderStatus = async (orderId: string, newStatus: string): Promise<{success: boolean, message: string}> => {
  try {
    const orderRef = doc(db, "orders", orderId);
    const orderSnap = await getDoc(orderRef);
    
    if (!orderSnap.exists()) {
      return { 
        success: false, 
        message: `Order ${orderId} not found` 
      };
    }
    
    const orderData = orderSnap.data();
    
    // Check if we're transitioning to a finished state
    const isFinishingOrder = (newStatus === "Finished" || newStatus === "Done");
    
    if (isFinishingOrder) {
      // We need to move this order to the archive
      await archiveOrder(orderId);
      return { 
        success: true, 
        message: `Order ${orderId} updated to ${newStatus} and moved to archive` 
      };
    } else {
      // Just update the status normally
      await updateDoc(orderRef, {
        status: newStatus,
        updated: Timestamp.fromDate(new Date())
      });
      
      return { 
        success: true, 
        message: `Order ${orderId} updated to ${newStatus}` 
      };
    }
  } catch (error) {
    console.error(`Error updating order ${orderId} status:`, error);
    return { 
      success: false, 
      message: `Failed to update order: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
};

/**
 * Moves an order to the archive collection
 */
export const archiveOrder = async (orderId: string): Promise<{success: boolean, message: string}> => {
  try {
    // Begin a batch operation
    const batch = writeBatch(db);
    
    // 1. Get the order data
    const orderRef = doc(db, "orders", orderId);
    const orderSnap = await getDoc(orderRef);
    
    if (!orderSnap.exists()) {
      return { 
        success: false, 
        message: `Order ${orderId} not found` 
      };
    }
    
    const orderData = orderSnap.data();
    
    // Make sure the status is "Finished" or "Done"
    if (orderData.status !== "Finished" && orderData.status !== "Done") {
      // Update the status to "Finished"
      orderData.status = "Finished";
    }
    
    // 2. Add archival information
    const archivedOrder = {
      ...orderData,
      archivedAt: Timestamp.fromDate(new Date()),
      originalId: orderId,
      updated: Timestamp.fromDate(new Date())
    };
    
    // 3. Save to archivedOrders collection
    const archivedOrderRef = doc(db, "archivedOrders", orderId);
    batch.set(archivedOrderRef, archivedOrder);
    
    // 4. Delete from orders collection
    batch.delete(orderRef);
    
    // 5. Find and move all related processes
    const processesQuery = query(
      collection(db, "processes"),
      where("workOrderId", "==", orderId)
    );
    
    const processesSnapshot = await getDocs(processesQuery);
    
    // Move each process to archivedProcesses
    processesSnapshot.forEach(processDoc => {
      const processData = processDoc.data();
      
      // Create in archive
      const archivedProcessRef = doc(db, "archivedProcesses", processDoc.id);
      batch.set(archivedProcessRef, {
        ...processData,
        archivedAt: Timestamp.fromDate(new Date()),
        originalId: processDoc.id
      });
      
      // Remove from active processes
      const processRef = doc(db, "processes", processDoc.id);
      batch.delete(processRef);
    });
    
    // Commit all operations
    await batch.commit();
    
    return { 
      success: true, 
      message: `Order ${orderId} archived successfully with ${processesSnapshot.size} related processes` 
    };
  } catch (error) {
    console.error(`Error archiving order ${orderId}:`, error);
    return { 
      success: false, 
      message: `Failed to archive order: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
};

/**
 * Restore an order from archive back to active orders
 */
export const restoreOrder = async (archivedOrderId: string): Promise<{success: boolean, message: string}> => {
  try {
    // Begin a batch operation
    const batch = writeBatch(db);
    
    // 1. Get the archived order
    const archivedOrderRef = doc(db, "archivedOrders", archivedOrderId);
    const archivedOrderSnap = await getDoc(archivedOrderRef);
    
    if (!archivedOrderSnap.exists()) {
      return { 
        success: false, 
        message: `Archived order ${archivedOrderId} not found` 
      };
    }
    
    const orderData = archivedOrderSnap.data();
    
    // 2. Remove archive-specific fields
    const { archivedAt, ...activeOrderData } = orderData;
    
    // Ensure updated timestamp is current
    activeOrderData.updated = Timestamp.fromDate(new Date());
    
    // 3. Save to active orders collection
    const orderRef = doc(db, "orders", archivedOrderId);
    batch.set(orderRef, activeOrderData);
    
    // 4. Delete from archived orders
    batch.delete(archivedOrderRef);
    
    // 5. Find and restore all related processes
    const archivedProcessesQuery = query(
      collection(db, "archivedProcesses"),
      where("workOrderId", "==", archivedOrderId)
    );
    
    const processesSnapshot = await getDocs(archivedProcessesQuery);
    
    // Move each process back to active
    processesSnapshot.forEach(processDoc => {
      const processData = processDoc.data();
      
      // Remove archive-specific fields
      const { archivedAt, ...activeProcessData } = processData;
      
      // Create in active processes
      const processRef = doc(db, "processes", processDoc.id);
      batch.set(processRef, activeProcessData);
      
      // Remove from archived processes
      const archivedProcessRef = doc(db, "archivedProcesses", processDoc.id);
      batch.delete(archivedProcessRef);
    });
    
    // Commit all operations
    await batch.commit();
    
    return { 
      success: true, 
      message: `Order ${archivedOrderId} restored successfully with ${processesSnapshot.size} related processes` 
    };
  } catch (error) {
    console.error(`Error restoring order ${archivedOrderId}:`, error);
    return { 
      success: false, 
      message: `Failed to restore order: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
};