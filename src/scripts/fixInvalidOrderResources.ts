import { getResources } from "../services/resourceService";
import { db } from "../config/firebase";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";

async function fixInvalidOrderResources() {
  // 1. Get all valid resource IDs
  const resources = await getResources(false);
  const validResourceIds = new Set(resources.map(r => r.id));

  // 2. Get all orders
  const ordersSnapshot = await getDocs(collection(db, "orders"));
  let fixedCount = 0;

  for (const orderDoc of ordersSnapshot.docs) {
    const order = orderDoc.data();
    const assignedResourceId = order.assignedResourceId;
    if (assignedResourceId && !validResourceIds.has(assignedResourceId)) {
      // 3. Update order: set assignedResourceId to null
      await updateDoc(doc(db, "orders", orderDoc.id), {
        assignedResourceId: null,
      });
      fixedCount++;
    }
  }
}

fixInvalidOrderResources().catch(e => {
  console.error("Error running fixInvalidOrderResources:", e);
  process.exit(1);
});
