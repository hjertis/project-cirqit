// src/services/timeTrackingService.ts
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
  DocumentReference,
  DocumentData,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";

/**
 * Interface for time entry data
 */
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
  pausedDuration?: number; // Total time spent paused in seconds
  duration?: number; // Total duration in seconds (for completed entries)
  notes?: string;
  status: "active" | "paused" | "completed";
  paused?: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Check if user has any active time entries
 */
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

/**
 * Get user's active time entry for a specific order
 */
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

/**
 * Get all active time entries
 */
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

/**
 * Start a new time entry
 */
export const startTimeEntry = async (
  userId: string,
  orderId: string,
  orderNumber: string,
  processId?: string,
  notes?: string
): Promise<TimeEntry> => {
  // Check if user already has an active time entry for this order
  const existingEntry = await getActiveTimeEntry(userId, orderId);

  if (existingEntry) {
    throw new Error("You already have an active time entry for this order");
  }

  // Get user display name
  const userRef = doc(db, "users", userId);
  const userDoc = await getDoc(userRef);
  const userDisplayName = userDoc.exists() ? userDoc.data().displayName : null;

  // Create new time entry
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

/**
 * Stop an active time entry
 */
export const stopTimeEntry = async (timeEntryId: string, notes?: string): Promise<TimeEntry> => {
  const timeEntryRef = doc(db, "timeEntries", timeEntryId);
  const timeEntryDoc = await getDoc(timeEntryRef);

  if (!timeEntryDoc.exists()) {
    throw new Error("Time entry not found");
  }

  const timeEntryData = timeEntryDoc.data() as TimeEntry;

  if (timeEntryData.status === "completed") {
    throw new Error("This time entry is already completed");
  }

  const endTime = Timestamp.now();
  const startTime = timeEntryData.startTime.toDate();

  // Calculate total duration in seconds, accounting for paused time
  let totalDuration = Math.floor((endTime.toDate().getTime() - startTime.getTime()) / 1000);

  // Subtract paused duration if any
  if (timeEntryData.pausedDuration) {
    totalDuration -= timeEntryData.pausedDuration;
  }

  // If currently paused, add the current pause duration
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

/**
 * Pause an active time entry
 */
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

/**
 * Resume a paused time entry
 */
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

  // Calculate paused duration
  if (timeEntryData.pausedTime) {
    const pausedDuration = Math.floor(
      (resumeTime.toDate().getTime() - timeEntryData.pausedTime.toDate().getTime()) / 1000
    );

    // Add to total paused duration
    const totalPausedDuration = (timeEntryData.pausedDuration || 0) + pausedDuration;

    // Store resumed times for reference
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

/**
 * Get time entries for a specific order
 */
export const getTimeEntriesForOrder = async (orderId: string): Promise<TimeEntry[]> => {
  if (!orderId) {
    console.error("No orderId provided");
    return [];
  }

  try {
    const timeEntriesRef = collection(db, "timeEntries");
    // Simpler query without orderBy
    const q = query(
      timeEntriesRef,
      where("orderId", "==", orderId)
      // Removed orderBy for now
    );

    const querySnapshot = await getDocs(q);

    // We can sort the results client-side instead
    const entries = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as TimeEntry[];

    // Sort by startTime in descending order
    return entries.sort((a, b) => b.startTime.toMillis() - a.startTime.toMillis());
  } catch (err) {
    console.error(`Error fetching time entries for order ${orderId}:`, err);
    return [];
  }
};

/**
 * Get time entries for a specific user
 */
export const getTimeEntriesForUser = async (
  userId: string,
  limitCount = 50,
  startAfter?: Timestamp
): Promise<TimeEntry[]> => {
  try {
    const timeEntriesRef = collection(db, "timeEntries");

    // Create the query constraints
    const constraints: QueryConstraint[] = [
      where("userId", "==", userId),
      orderBy("startTime", "desc"),
      limit(limitCount),
    ];

    // Build the query with the array of constraints
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

/**
 * Calculate total time spent on an order
 */
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

/**
 * Calculate total time spent by a user
 */
export const calculateTotalTimeForUser = async (
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<number> => {
  try {
    const timeEntriesRef = collection(db, "timeEntries");

    // Start with basic constraints
    const constraints: QueryConstraint[] = [
      where("userId", "==", userId),
      where("status", "==", "completed"),
    ];

    // Add date constraints if provided
    if (startDate) {
      constraints.push(where("startTime", ">=", Timestamp.fromDate(startDate)));
    }

    if (endDate) {
      constraints.push(where("startTime", "<=", Timestamp.fromDate(endDate)));
    }

    // Build the query
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
    return 0; // Return 0 instead of throwing when calculating totals
  }
};
