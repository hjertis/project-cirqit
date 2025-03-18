// src/scripts/migrateFinishedOrders.ts
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
  Timestamp 
} from "firebase/firestore";
import { db } from "../config/firebase";

/**
 * Script to migrate finished orders to an 'archivedOrders' collection
 * Run this once to move existing finished orders
 */
export const migrateFinishedOrders = async () => {
  try {
    console.log("Starting migration of finished orders...");
    
    // Track progress and results
    let totalProcessed = 0;
    let totalMigrated = 0;
    let totalErrors = 0;
    
    // Get all finished orders
    const finishedOrdersQuery = query(
      collection(db, "orders"),
      where("status", "in", ["Finished", "Done"]),
      limit(500) // Process in batches of 500
    );
    
    // Get the orders to migrate
    const snapshot = await getDocs(finishedOrdersQuery);
    const totalToMigrate = snapshot.size;
    
    console.log(`Found ${totalToMigrate} orders to migrate`);
    
    if (totalToMigrate === 0) {
      console.log("No orders to migrate. Finished.");
      return {
        success: true,
        message: "No orders to migrate",
        totalProcessed: 0,
        totalMigrated: 0,
        totalErrors: 0
      };
    }
    
    // Process in smaller batches to avoid Firestore limits
    const batchSize = 100; // Firestore allows max 500 operations per batch
    const orderDocs = snapshot.docs;
    
    for (let i = 0; i < orderDocs.length; i += batchSize) {
      const batch = writeBatch(db);
      const currentBatch = orderDocs.slice(i, i + batchSize);
      
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(orderDocs.length/batchSize)}`);
      
      for (const orderDoc of currentBatch) {
        try {
          const orderData = orderDoc.data();
          
          // Add archival information
          const archivedOrder = {
            ...orderData,
            archivedAt: Timestamp.fromDate(new Date()),
            originalId: orderDoc.id,
          };
          
          // 1. Write to archivedOrders collection
          const archivedOrderRef = doc(collection(db, "archivedOrders"), orderDoc.id);
          batch.set(archivedOrderRef, archivedOrder);
          
          // 2. Delete from orders collection
          const orderRef = doc(db, "orders", orderDoc.id);
          batch.delete(orderRef);
          
          totalMigrated++;
        } catch (error) {
          console.error(`Error preparing order ${orderDoc.id} for migration:`, error);
          totalErrors++;
        }
        
        totalProcessed++;
      }
      
      // Commit the batch
      try {
        await batch.commit();
        console.log(`Committed batch ${Math.floor(i/batchSize) + 1}`);
      } catch (error) {
        console.error("Error committing batch:", error);
        totalErrors += currentBatch.length;
      }
    }
    
    console.log("Migration complete!");
    console.log(`Total processed: ${totalProcessed}`);
    console.log(`Total migrated: ${totalMigrated}`);
    console.log(`Total errors: ${totalErrors}`);
    
    return {
      success: totalErrors === 0,
      message: "Migration completed",
      totalProcessed,
      totalMigrated,
      totalErrors
    };
  } catch (error) {
    console.error("Error during migration:", error);
    return {
      success: false,
      message: `Migration failed: ${error instanceof Error ? error.message : String(error)}`,
      totalProcessed: 0,
      totalMigrated: 0,
      totalErrors: 1
    };
  }
};

// Migrate related processes too
export const migrateRelatedProcesses = async () => {
  try {
    console.log("Starting migration of processes for archived orders...");
    
    // First get all archived order IDs
    const archivedOrdersQuery = query(
      collection(db, "archivedOrders"),
      limit(1000)
    );
    
    const archivedOrdersSnapshot = await getDocs(archivedOrdersQuery);
    const archivedOrderIds = archivedOrdersSnapshot.docs.map(doc => doc.id);
    
    console.log(`Found ${archivedOrderIds.length} archived orders`);
    
    if (archivedOrderIds.length === 0) {
      return { success: true, message: "No archived orders found" };
    }
    
    let totalProcessed = 0;
    let totalMigrated = 0;
    let totalErrors = 0;
    
    // Process order IDs in chunks due to Firestore 'in' clause limitations
    const chunkSize = 30; // Firestore 'in' query supports up to 30 values
    
    for (let i = 0; i < archivedOrderIds.length; i += chunkSize) {
      const orderIdChunk = archivedOrderIds.slice(i, i + chunkSize);
      
      // Get processes for this chunk of order IDs
      const processesQuery = query(
        collection(db, "processes"),
        where("workOrderId", "in", orderIdChunk)
      );
      
      const processesSnapshot = await getDocs(processesQuery);
      console.log(`Found ${processesSnapshot.size} processes for chunk ${Math.floor(i/chunkSize) + 1}`);
      
      if (processesSnapshot.size === 0) continue;
      
      // Batch write operations
      const batch = writeBatch(db);
      
      processesSnapshot.forEach(processDoc => {
        try {
          const processData = processDoc.data();
          
          // 1. Write to archivedProcesses collection
          const archivedProcessRef = doc(collection(db, "archivedProcesses"), processDoc.id);
          batch.set(archivedProcessRef, {
            ...processData,
            archivedAt: Timestamp.fromDate(new Date()),
            originalId: processDoc.id
          });
          
          // 2. Delete from processes collection
          const processRef = doc(db, "processes", processDoc.id);
          batch.delete(processRef);
          
          totalMigrated++;
        } catch (error) {
          console.error(`Error preparing process ${processDoc.id} for migration:`, error);
          totalErrors++;
        }
        
        totalProcessed++;
      });
      
      // Commit the batch
      try {
        await batch.commit();
        console.log(`Committed processes batch ${Math.floor(i/chunkSize) + 1}`);
      } catch (error) {
        console.error("Error committing processes batch:", error);
        totalErrors += processesSnapshot.size;
      }
    }
    
    console.log("Process migration complete!");
    console.log(`Total processed: ${totalProcessed}`);
    console.log(`Total migrated: ${totalMigrated}`);
    console.log(`Total errors: ${totalErrors}`);
    
    return {
      success: totalErrors === 0,
      message: "Process migration completed",
      totalProcessed,
      totalMigrated,
      totalErrors
    };
  } catch (error) {
    console.error("Error during process migration:", error);
    return {
      success: false,
      message: `Process migration failed: ${error instanceof Error ? error.message : String(error)}`,
      totalProcessed: 0,
      totalMigrated: 0,
      totalErrors: 1
    };
  }
};