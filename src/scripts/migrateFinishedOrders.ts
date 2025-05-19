import {
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  doc,
  setDoc,
  deleteDoc,
  limit,
  Timestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";

export const migrateFinishedOrders = async () => {
  try {
    let totalProcessed = 0;
    let totalMigrated = 0;
    let totalErrors = 0;

    const finishedOrdersQuery = query(
      collection(db, "orders"),
      where("status", "in", ["Finished", "Done"]),
      limit(500)
    );

    const snapshot = await getDocs(finishedOrdersQuery);
    const totalToMigrate = snapshot.size;

    if (totalToMigrate === 0) {
      return {
        success: true,
        message: "No orders to migrate",
        totalProcessed: 0,
        totalMigrated: 0,
        totalErrors: 0,
      };
    }

    const batchSize = 100;
    const orderDocs = snapshot.docs;

    for (let i = 0; i < orderDocs.length; i += batchSize) {
      const batch = writeBatch(db);
      const currentBatch = orderDocs.slice(i, i + batchSize);

      for (const orderDoc of currentBatch) {
        try {
          const orderData = orderDoc.data();

          const archivedOrder = {
            ...orderData,
            archivedAt: Timestamp.fromDate(new Date()),
            originalId: orderDoc.id,
          };

          const archivedOrderRef = doc(collection(db, "archivedOrders"), orderDoc.id);
          batch.set(archivedOrderRef, archivedOrder);

          const orderRef = doc(db, "orders", orderDoc.id);
          batch.delete(orderRef);

          totalMigrated++;
        } catch (error) {
          console.error(`Error preparing order ${orderDoc.id} for migration:`, error);
          totalErrors++;
        }

        totalProcessed++;
      }

      try {
        await batch.commit();
      } catch (error) {
        console.error("Error committing batch:", error);
        totalErrors += currentBatch.length;
      }
    }

    return {
      success: totalErrors === 0,
      message: "Migration completed",
      totalProcessed,
      totalMigrated,
      totalErrors,
    };
  } catch (error) {
    console.error("Error during migration:", error);
    return {
      success: false,
      message: `Migration failed: ${error instanceof Error ? error.message : String(error)}`,
      totalProcessed: 0,
      totalMigrated: 0,
      totalErrors: 1,
    };
  }
};

export const migrateRelatedProcesses = async () => {
  try {
    const archivedOrdersQuery = query(collection(db, "archivedOrders"), limit(1000));

    const archivedOrdersSnapshot = await getDocs(archivedOrdersQuery);
    const archivedOrderIds = archivedOrdersSnapshot.docs.map(doc => doc.id);

    if (archivedOrderIds.length === 0) {
      return { success: true, message: "No archived orders found" };
    }

    let totalProcessed = 0;
    let totalMigrated = 0;
    let totalErrors = 0;

    const chunkSize = 30;

    for (let i = 0; i < archivedOrderIds.length; i += chunkSize) {
      const orderIdChunk = archivedOrderIds.slice(i, i + chunkSize);

      const processesQuery = query(
        collection(db, "processes"),
        where("workOrderId", "in", orderIdChunk)
      );

      const processesSnapshot = await getDocs(processesQuery);

      if (processesSnapshot.size === 0) continue;

      const batch = writeBatch(db);

      processesSnapshot.forEach(processDoc => {
        try {
          const processData = processDoc.data();

          const archivedProcessRef = doc(collection(db, "archivedProcesses"), processDoc.id);
          batch.set(archivedProcessRef, {
            ...processData,
            archivedAt: Timestamp.fromDate(new Date()),
            originalId: processDoc.id,
          });

          const processRef = doc(db, "processes", processDoc.id);
          batch.delete(processRef);

          totalMigrated++;
        } catch (error) {
          console.error(`Error preparing process ${processDoc.id} for migration:`, error);
          totalErrors++;
        }

        totalProcessed++;
      });

      try {
        await batch.commit();
      } catch (error) {
        console.error("Error committing processes batch:", error);
        totalErrors += processesSnapshot.size;
      }
    }

    return {
      success: totalErrors === 0,
      message: "Process migration completed",
      totalProcessed,
      totalMigrated,
      totalErrors,
    };
  } catch (error) {
    console.error("Error during process migration:", error);
    return {
      success: false,
      message: `Process migration failed: ${error instanceof Error ? error.message : String(error)}`,
      totalProcessed: 0,
      totalMigrated: 0,
      totalErrors: 1,
    };
  }
};
