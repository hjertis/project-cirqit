// src/services/resourceService.ts
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";

// Define resource types
export interface Resource {
  id: string;
  name: string;
  type: "person" | "machine" | "tool" | "area";
  email?: string;
  department?: string;
  capacity?: number; // Capacity in hours per day
  color?: string;
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Fetch all resources
 */
export const getResources = async (activeOnly = true): Promise<Resource[]> => {
  try {
    const resourcesRef = collection(db, "resources");
    let queryConstraints = [];

    if (activeOnly) {
      queryConstraints.push(where("active", "==", true));
    }

    queryConstraints.push(orderBy("name", "asc"));

    const resourcesQuery = query(resourcesRef, ...queryConstraints);
    const snapshot = await getDocs(resourcesQuery);

    return snapshot.docs.map(
      doc =>
        ({
          id: doc.id,
          ...doc.data(),
        }) as Resource
    );
  } catch (error) {
    console.error("Error fetching resources:", error);
    throw error;
  }
};

/**
 * Get a single resource by ID
 */
export const getResourceById = async (resourceId: string): Promise<Resource | null> => {
  try {
    const resourceRef = doc(db, "resources", resourceId);
    const resourceDoc = await getDoc(resourceRef);

    if (!resourceDoc.exists()) {
      return null;
    }

    return {
      id: resourceDoc.id,
      ...resourceDoc.data(),
    } as Resource;
  } catch (error) {
    console.error(`Error fetching resource with ID ${resourceId}:`, error);
    throw error;
  }
};

/**
 * Create a new resource
 */
export const createResource = async (
  resource: Omit<Resource, "id" | "createdAt" | "updatedAt">
): Promise<Resource> => {
  try {
    const resourceData = {
      ...resource,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, "resources"), resourceData);

    return {
      id: docRef.id,
      ...resourceData,
    } as Resource;
  } catch (error) {
    console.error("Error creating resource:", error);
    throw error;
  }
};

/**
 * Update an existing resource
 */
export const updateResource = async (
  resourceId: string,
  updates: Partial<Resource>
): Promise<void> => {
  try {
    const resourceRef = doc(db, "resources", resourceId);

    // Add updated timestamp
    const updatedData = {
      ...updates,
      updatedAt: Timestamp.now(),
    };

    await updateDoc(resourceRef, updatedData);
  } catch (error) {
    console.error(`Error updating resource with ID ${resourceId}:`, error);
    throw error;
  }
};

/**
 * Delete a resource
 */
export const deleteResource = async (resourceId: string): Promise<void> => {
  try {
    const resourceRef = doc(db, "resources", resourceId);
    await deleteDoc(resourceRef);
  } catch (error) {
    console.error(`Error deleting resource with ID ${resourceId}:`, error);
    throw error;
  }
};

/**
 * Get resources of a specific type
 */
export const getResourcesByType = async (type: Resource["type"]): Promise<Resource[]> => {
  try {
    const resourcesRef = collection(db, "resources");
    const resourcesQuery = query(
      resourcesRef,
      where("type", "==", type),
      where("active", "==", true),
      orderBy("name", "asc")
    );

    const snapshot = await getDocs(resourcesQuery);

    return snapshot.docs.map(
      doc =>
        ({
          id: doc.id,
          ...doc.data(),
        }) as Resource
    );
  } catch (error) {
    console.error(`Error fetching resources of type ${type}:`, error);
    throw error;
  }
};

/**
 * Get resources by department
 */
export const getResourcesByDepartment = async (department: string): Promise<Resource[]> => {
  try {
    const resourcesRef = collection(db, "resources");
    const resourcesQuery = query(
      resourcesRef,
      where("department", "==", department),
      where("active", "==", true),
      orderBy("name", "asc")
    );

    const snapshot = await getDocs(resourcesQuery);

    return snapshot.docs.map(
      doc =>
        ({
          id: doc.id,
          ...doc.data(),
        }) as Resource
    );
  } catch (error) {
    console.error(`Error fetching resources in department ${department}:`, error);
    throw error;
  }
};

/**
 * Set a resource as inactive instead of deleting it
 */
export const deactivateResource = async (resourceId: string): Promise<void> => {
  try {
    const resourceRef = doc(db, "resources", resourceId);
    await updateDoc(resourceRef, {
      active: false,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error(`Error deactivating resource with ID ${resourceId}:`, error);
    throw error;
  }
};

/**
 * Reactivate a previously deactivated resource
 */
export const reactivateResource = async (resourceId: string): Promise<void> => {
  try {
    const resourceRef = doc(db, "resources", resourceId);
    await updateDoc(resourceRef, {
      active: true,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error(`Error reactivating resource with ID ${resourceId}:`, error);
    throw error;
  }
};
