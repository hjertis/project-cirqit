import * as dotenv from "dotenv";
dotenv.config();
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, writeBatch, doc } from "firebase/firestore";
import { STANDARD_PROCESS_NAMES } from "../constants/constants";

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const BATCH_SIZE = 400;

function matchStandardProcessName(name: string): string | null {
  if (!name) return null;
  const cleaned = name
    .replace(/^WO-\d+\s*/i, "")
    .trim()
    .toLowerCase();
  for (const std of STANDARD_PROCESS_NAMES) {
    if (cleaned === std.toLowerCase()) return std;

    if (cleaned.replace(/[^\w]/g, "") === std.toLowerCase().replace(/[^\w]/g, "")) return std;
  }
  return null;
}

async function standardizeOrderProcessNames() {
  console.log("Starting order process name standardization...");
  const ordersRef = collection(db, "orders");
  const querySnapshot = await getDocs(ordersRef);
  let totalProcessed = 0;
  let totalUpdated = 0;
  let batch = writeBatch(db);
  let operationsInBatch = 0;

  for (const orderDoc of querySnapshot.docs) {
    const orderData = orderDoc.data();
    let updated = false;

    if (Array.isArray(orderData.processes)) {
      const newProcesses = orderData.processes.map((proc: any) => {
        const matched = matchStandardProcessName(proc.name);
        if (matched && proc.name !== matched) {
          updated = true;
          return { ...proc, name: matched };
        }
        return proc;
      });

      if (updated) {
        const docRef = doc(db, "orders", orderDoc.id);
        batch.update(docRef, { processes: newProcesses });
        operationsInBatch++;
        totalUpdated++;
      }
    }

    totalProcessed++;
    if (operationsInBatch >= BATCH_SIZE) {
      await batch.commit();
      console.log(`Committed batch of ${operationsInBatch} updates...`);
      batch = writeBatch(db);
      operationsInBatch = 0;
    }
    if (totalProcessed % 100 === 0) {
      console.log(`Checked ${totalProcessed}/${querySnapshot.size} orders...`);
    }
  }

  if (operationsInBatch > 0) {
    await batch.commit();
    console.log(`Committed final batch of ${operationsInBatch} updates...`);
  }

  console.log(`\n--- Standardization Complete ---`);
  console.log(`Total orders checked: ${totalProcessed}`);
  console.log(`Total orders updated: ${totalUpdated}`);
}

standardizeOrderProcessNames()
  .then(() => {
    console.log("Script finished.");
    process.exit(0);
  })
  .catch(error => {
    console.error("Script failed with an error:", error);
    process.exit(1);
  });
