import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, doc } from "firebase/firestore";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
dayjs.extend(isoWeek);

const firebaseConfig = {};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migratePlannedWeekStartDates() {
  const ordersRef = collection(db, "orders");
  const snapshot = await getDocs(ordersRef);

  for (const orderDoc of snapshot.docs) {
    const data = orderDoc.data();
    if (data.plannedWeekStartDate) {
      const monday = dayjs(data.plannedWeekStartDate).startOf("isoWeek").format("YYYY-MM-DD");
      if (monday !== data.plannedWeekStartDate) {
        await updateDoc(doc(db, "orders", orderDoc.id), {
          plannedWeekStartDate: monday,
        });
        console.log(`Order ${orderDoc.id} updated to ${monday}`);
      }
    }
  }
  console.log("Migration complete.");
}

migratePlannedWeekStartDates();
