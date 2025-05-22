import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  getDoc,
} from "firebase/firestore";
import { db } from "../config/firebase";

export interface TimeEntry {
  id?: string;
  userId: string;
  userDisplayName?: string;
  orderId: string;
  orderNumber: string;
  processId?: string;
  startTime: Timestamp;
  endTime?: Timestamp;
  pausedTime?: Timestamp;
  resumedTimes?: Timestamp[];
  pausedDuration?: number;
  duration?: number;
  notes?: string;
  status: "active" | "paused" | "completed";
  paused?: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export const hasActiveTimeEntry = async (userId: string): Promise<boolean> => {
  const timeEntriesRef = collection(db, "timeEntries");
  const q = query(
    timeEntriesRef,
    where("userId", "==", userId),
    where("status", "in", ["active", "paused"]),
    limit(1)
  );

  const querySnapshot = await getDocs(q);
  return !querySnapshot.empty;
};

export const getActiveTimeEntry = async (
  userId: string,
  orderId: string
): Promise<TimeEntry | null> => {
  const timeEntriesRef = collection(db, "timeEntries");
  const q = query(
    timeEntriesRef,
    where("userId", "==", userId),
    where("orderId", "==", orderId),
    where("status", "in", ["active", "paused"]),
    limit(1)
  );

  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    return null;
  }

  const doc = querySnapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
  } as TimeEntry;
};

export const getAllActiveTimeEntries = async (): Promise<TimeEntry[]> => {
  const timeEntriesRef = collection(db, "timeEntries");
  const q = query(
    timeEntriesRef,
    where("status", "in", ["active", "paused"]),
    orderBy("startTime", "desc")
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as TimeEntry[];
};

export const startTimeEntry = async (
  userId: string,
  orderId: string,
  orderNumber: string,
  processId?: string,
  notes?: string
): Promise<TimeEntry> => {
  const existingEntry = await getActiveTimeEntry(userId, orderId);

  if (existingEntry) {
    throw new Error("You already have an active time entry for this order");
  }

  const userRef = doc(db, "users", userId);
  const userDoc = await getDoc(userRef);
  const userDisplayName = userDoc.exists() ? userDoc.data().displayName : null;

  const timeEntriesRef = collection(db, "timeEntries");

  const timeEntryData: Omit<TimeEntry, "id"> = {
    userId,
    userDisplayName,
    orderId,
    orderNumber,
    processId: processId || null,
    startTime: Timestamp.now(),
    notes: notes || "",
    status: "active",
    paused: false,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  const docRef = await addDoc(timeEntriesRef, timeEntryData);

  return {
    id: docRef.id,
    ...timeEntryData,
  };
};

export const stopTimeEntry = async (
  timeEntryId: string,
  notes?: string,
  customEndTime?: Date
): Promise<TimeEntry> => {
  const timeEntryRef = doc(db, "timeEntries", timeEntryId);
  const timeEntryDoc = await getDoc(timeEntryRef);

  if (!timeEntryDoc.exists()) {
    throw new Error("Time entry not found");
  }

  const timeEntryData = timeEntryDoc.data() as TimeEntry;

  if (timeEntryData.status === "completed") {
    throw new Error("This time entry is already completed");
  }

  const endTime = customEndTime ? Timestamp.fromDate(customEndTime) : Timestamp.now();
  const startTime = timeEntryData.startTime.toDate();

  let totalDuration = Math.floor((endTime.toDate().getTime() - startTime.getTime()) / 1000);

  if (timeEntryData.pausedDuration) {
    totalDuration -= timeEntryData.pausedDuration;
  }

  if (timeEntryData.paused && timeEntryData.pausedTime) {
    const pauseDuration = Math.floor(
      (endTime.toDate().getTime() - timeEntryData.pausedTime.toDate().getTime()) / 1000
    );
    totalDuration -= pauseDuration;
  }

  const updates: Partial<TimeEntry> = {
    endTime,
    duration: totalDuration,
    status: "completed",
    updatedAt: Timestamp.now(),
  };

  if (notes) {
    updates.notes = notes;
  }

  await updateDoc(timeEntryRef, updates);

  return {
    id: timeEntryId,
    ...timeEntryData,
    ...updates,
  };
};

export const pauseTimeEntry = async (timeEntryId: string): Promise<TimeEntry> => {
  const timeEntryRef = doc(db, "timeEntries", timeEntryId);
  const timeEntryDoc = await getDoc(timeEntryRef);

  if (!timeEntryDoc.exists()) {
    throw new Error("Time entry not found");
  }

  const timeEntryData = timeEntryDoc.data() as TimeEntry;

  if (timeEntryData.status !== "active") {
    throw new Error("Time entry is not active");
  }

  const pausedTime = Timestamp.now();

  const updates: Partial<TimeEntry> = {
    pausedTime,
    paused: true,
    status: "paused",
    updatedAt: Timestamp.now(),
  };

  await updateDoc(timeEntryRef, updates);

  return {
    id: timeEntryId,
    ...timeEntryData,
    ...updates,
  };
};

export const resumeTimeEntry = async (timeEntryId: string): Promise<TimeEntry> => {
  const timeEntryRef = doc(db, "timeEntries", timeEntryId);
  const timeEntryDoc = await getDoc(timeEntryRef);

  if (!timeEntryDoc.exists()) {
    throw new Error("Time entry not found");
  }

  const timeEntryData = timeEntryDoc.data() as TimeEntry;

  if (timeEntryData.status !== "paused") {
    throw new Error("Time entry is not paused");
  }

  const resumeTime = Timestamp.now();

  if (timeEntryData.pausedTime) {
    const pausedDuration = Math.floor(
      (resumeTime.toDate().getTime() - timeEntryData.pausedTime.toDate().getTime()) / 1000
    );

    const totalPausedDuration = (timeEntryData.pausedDuration || 0) + pausedDuration;

    const resumedTimes = timeEntryData.resumedTimes || [];
    resumedTimes.push(resumeTime);

    const updates: Partial<TimeEntry> = {
      pausedTime: null,
      pausedDuration: totalPausedDuration,
      resumedTimes,
      paused: false,
      status: "active",
      updatedAt: Timestamp.now(),
    };

    await updateDoc(timeEntryRef, updates);

    return {
      id: timeEntryId,
      ...timeEntryData,
      ...updates,
    };
  } else {
    throw new Error("Cannot resume: no pause time recorded");
  }
};

export const getTimeEntriesForOrder = async (orderId: string): Promise<TimeEntry[]> => {
  if (!orderId) {
    console.error("No orderId provided");
    return [];
  }

  try {
    const timeEntriesRef = collection(db, "timeEntries");

    const q = query(timeEntriesRef, where("orderId", "==", orderId));

    const querySnapshot = await getDocs(q);

    const entries = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as TimeEntry[];

    return entries.sort((a, b) => b.startTime.toMillis() - a.startTime.toMillis());
  } catch (err) {
    console.error(`Error fetching time entries for order ${orderId}:`, err);
    return [];
  }
};

export const getTimeEntriesForUser = async (
  userId: string,
  limitCount = 50,
  startAfter?: Timestamp
): Promise<TimeEntry[]> => {
  try {
    const timeEntriesRef = collection(db, "timeEntries");

    const constraints: QueryConstraint[] = [
      where("userId", "==", userId),
      orderBy("startTime", "desc"),
      limit(limitCount),
    ];

    const q = query(timeEntriesRef, ...constraints);

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as TimeEntry[];
  } catch (err) {
    console.error(`Error in getTimeEntriesForUser for userId ${userId}:`, err);
    throw err;
  }
};

export const calculateTotalTimeForOrder = async (orderId: string): Promise<number> => {
  const timeEntries = await getTimeEntriesForOrder(orderId);

  let totalSeconds = 0;

  timeEntries.forEach(entry => {
    if (entry.status === "completed" && entry.duration) {
      totalSeconds += entry.duration;
    }
  });

  return totalSeconds;
};

export const calculateTotalTimeForUser = async (
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<number> => {
  try {
    const timeEntriesRef = collection(db, "timeEntries");

    const constraints: QueryConstraint[] = [
      where("userId", "==", userId),
      where("status", "==", "completed"),
    ];

    if (startDate) {
      constraints.push(where("startTime", ">=", Timestamp.fromDate(startDate)));
    }

    if (endDate) {
      constraints.push(where("startTime", "<=", Timestamp.fromDate(endDate)));
    }

    const q = query(timeEntriesRef, ...constraints);

    const querySnapshot = await getDocs(q);

    let totalSeconds = 0;

    querySnapshot.forEach(doc => {
      const entry = doc.data() as TimeEntry;
      if (entry.duration) {
        totalSeconds += entry.duration;
      }
    });

    return totalSeconds;
  } catch (err) {
    console.error(`Error in calculateTotalTimeForUser for userId ${userId}:`, err);
    return 0;
  }
};

export const updateTimeEntry = async (
  timeEntryId: string,
  updates: Partial<TimeEntry>
): Promise<TimeEntry> => {
  const timeEntryRef = doc(db, "timeEntries", timeEntryId);
  const timeEntryDoc = await getDoc(timeEntryRef);

  if (!timeEntryDoc.exists()) {
    throw new Error("Time entry not found");
  }

  updates.updatedAt = Timestamp.now();
  await updateDoc(timeEntryRef, updates);

  return {
    id: timeEntryId,
    ...timeEntryDoc.data(),
    ...updates,
  } as TimeEntry;
};

export const addTimeEntry = async (
  entry: Omit<TimeEntry, "id" | "createdAt" | "updatedAt">
): Promise<TimeEntry> => {
  const timeEntriesRef = collection(db, "timeEntries");
  const now = Timestamp.now();
  const docRef = await addDoc(timeEntriesRef, {
    ...entry,
    createdAt: now,
    updatedAt: now,
  });
  return {
    id: docRef.id,
    ...entry,
    createdAt: now,
    updatedAt: now,
  };
};
