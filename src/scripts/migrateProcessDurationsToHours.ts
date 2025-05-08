import { collection, getDocs, writeBatch, doc, Timestamp } from "firebase/firestore";
import { db } from "../config/firebase";

const BATCH_SIZE = 400;

export async function migrateProcessDurationsToHours() {
  const processesRef = collection(db, "processes");
  const querySnapshot = await getDocs(processesRef);
  let totalProcessed = 0;
  let totalUpdated = 0;
  let batch = writeBatch(db);
  let operationsInBatch = 0;

  for (const processDoc of querySnapshot.docs) {
    const processData = processDoc.data();
    let needsUpdate = false;
    let newDuration = processData.duration;

    // Only add duration if it does not exist and both startDate and endDate are present
    if (
      (typeof processData.duration !== "number" || isNaN(processData.duration)) &&
      processData.startDate &&
      processData.endDate
    ) {
      const start =
        processData.startDate instanceof Timestamp
          ? processData.startDate.toDate()
          : new Date(processData.startDate);
      const end =
        processData.endDate instanceof Timestamp
          ? processData.endDate.toDate()
          : new Date(processData.endDate);
      newDuration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      if (newDuration > 0) {
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      const docRef = doc(db, "processes", processDoc.id);
      batch.update(docRef, { duration: newDuration });
      operationsInBatch++;
      totalUpdated++;
    }
    totalProcessed++;

    if (operationsInBatch >= BATCH_SIZE) {
      await batch.commit();
      batch = writeBatch(db);
      operationsInBatch = 0;
    }
  }

  if (operationsInBatch > 0) {
    await batch.commit();
  }

  return {
    totalProcessed,
    totalUpdated,
    message: `Migration complete. Processed: ${totalProcessed}, Updated: ${totalUpdated}`,
  };
}
