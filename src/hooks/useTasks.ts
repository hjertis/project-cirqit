import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  where,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../config/firebase";

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  userId: string; // To associate tasks with specific users
  dueDate?: string; // Optional due date in ISO format
  priority?: "high" | "medium" | "low"; // Optional priority level
}

const TASKS_COLLECTION = "tasks";
const PINNED_ORDERS_COLLECTION = "pinnedOrders";

export const useTasks = (userId: string) => {
  const queryClient = useQueryClient();
  // Fetch all tasks for the current user
  const fetchTasks = async (): Promise<Task[]> => {
    try {
      const tasksQuery = query(
        collection(db, TASKS_COLLECTION),
        where("userId", "==", userId),
        orderBy("createdAt", "desc")
      );

      const querySnapshot = await getDocs(tasksQuery);
      const tasks: Task[] = [];
      querySnapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        // Defensive: Ensure required fields exist
        if (
          typeof data.text === "string" &&
          typeof data.completed === "boolean" &&
          typeof data.createdAt === "number" &&
          typeof data.userId === "string"
        ) {
          tasks.push({
            id: docSnap.id,
            text: data.text,
            completed: data.completed,
            createdAt: data.createdAt,
            userId: data.userId,
            dueDate: data.dueDate,
            priority: data.priority,
          });
        } else {
          // Log any anomalies for debugging
          console.warn("Task with missing/invalid fields:", docSnap.id, data);
        }
      });
      return tasks;
    } catch (err) {
      console.error("Error fetching tasks:", err);
      return [];
    }
  };

  // Query to fetch tasks - UPDATED to v5 syntax
  const tasksQuery = useQuery({
    queryKey: ["tasks", userId],
    queryFn: fetchTasks,
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  // Add a new task - UPDATED to v5 syntax
  const addTask = useMutation({
    mutationFn: async (taskData: {
      text: string;
      dueDate?: string;
      priority?: "high" | "medium" | "low";
    }) => {
      const newTask = {
        text: taskData.text,
        completed: false,
        createdAt: Date.now(),
        userId,
        ...(taskData.dueDate && { dueDate: taskData.dueDate }),
        ...(taskData.priority && { priority: taskData.priority }),
      };

      const docRef = await addDoc(collection(db, TASKS_COLLECTION), newTask);
      return { id: docRef.id, ...newTask };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", userId] });
    },
  });

  // Toggle task completion - UPDATED to v5 syntax
  const toggleTaskCompletion = useMutation({
    mutationFn: async ({ taskId, completed }: { taskId: string; completed: boolean }) => {
      const taskRef = doc(db, TASKS_COLLECTION, taskId);
      await updateDoc(taskRef, { completed });
      return { taskId, completed };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", userId] });
    },
  });

  // Remove a task - UPDATED to v5 syntax
  const removeTask = useMutation({
    mutationFn: async (taskId: string) => {
      const taskRef = doc(db, TASKS_COLLECTION, taskId);
      await deleteDoc(taskRef);
      return taskId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", userId] });
    },
  });
  // Fetch all pinned orders for the current user
  const fetchPinnedOrders = async (): Promise<number[]> => {
    const docSnapshot = await getDocs(
      query(collection(db, PINNED_ORDERS_COLLECTION), where("userId", "==", userId))
    );

    if (docSnapshot.empty) {
      return [];
    }

    return docSnapshot.docs[0].data().orderIds || [];
  };

  // Query to fetch pinned orders - UPDATED to v5 syntax
  const pinnedOrdersQuery = useQuery({
    queryKey: ["pinnedOrders", userId],
    queryFn: fetchPinnedOrders,
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Update pinned orders - UPDATED to v5 syntax
  const updatePinnedOrders = useMutation({
    mutationFn: async (orderIds: number[]) => {
      const pinnedOrdersRef = collection(db, PINNED_ORDERS_COLLECTION);

      // Try to find an existing doc for this user
      const userPinnedOrdersQuery = query(pinnedOrdersRef, where("userId", "==", userId));

      const querySnapshot = await getDocs(userPinnedOrdersQuery);

      if (querySnapshot.empty) {
        // Create new document if none exists
        await addDoc(pinnedOrdersRef, {
          userId,
          orderIds,
        });
      } else {
        // Update existing document
        const docRef = querySnapshot.docs[0].ref;
        await updateDoc(docRef, { orderIds });
      }

      return orderIds;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pinnedOrders", userId] });
    },
  });

  return {
    // Tasks
    tasks: tasksQuery.data || [],
    isLoadingTasks: tasksQuery.isLoading,
    isErrorTasks: tasksQuery.isError,
    addTask,
    toggleTaskCompletion,
    removeTask,

    // Pinned Orders
    pinnedOrders: pinnedOrdersQuery.data || [],
    isLoadingPinnedOrders: pinnedOrdersQuery.isLoading,
    isErrorPinnedOrders: pinnedOrdersQuery.isError,
    updatePinnedOrders,
  };
};
