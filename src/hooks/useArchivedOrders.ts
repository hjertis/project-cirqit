// src/hooks/useArchivedOrders.ts
import { useState, useEffect, useCallback } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp,
  QueryConstraint,
} from "firebase/firestore";
import { db } from "../config/firebase";

export interface ArchivedOrder {
  id: string;
  orderNumber: string;
  description: string;
  partNo: string;
  quantity: number;
  status: string;
  start: Timestamp;
  end: Timestamp;
  customer?: string;
  priority?: string;
  notes?: string;
  updated?: Timestamp;
  archivedAt: Timestamp;
  originalId: string;
}

export interface ArchiveFilter {
  dateRange?: {
    start: Date;
    end: Date;
  };
  searchTerm?: string;
}

export const useArchivedOrders = (initialFilter?: ArchiveFilter, initialLimit = 50) => {
  const [archivedOrders, setArchivedOrders] = useState<ArchivedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ArchiveFilter | undefined>(initialFilter);
  const [itemLimit, setItemLimit] = useState(initialLimit);

  // Fetch archived orders
  const fetchArchivedOrders = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      console.log("Fetching archived orders with filter:", filter);
      let ordersQuery;

      // Create a base query
      const baseQuery = collection(db, "archivedOrders");
      
      // Add query constraints
      const queryConstraints: QueryConstraint[] = [
        orderBy("archivedAt", "desc"),
        limit(itemLimit)
      ];
      
      // Apply date range filter if present
      if (filter?.dateRange) {
        const { start, end } = filter.dateRange;
        queryConstraints.push(
          where("archivedAt", ">=", Timestamp.fromDate(start)),
          where("archivedAt", "<=", Timestamp.fromDate(end))
        );
      }
      
      // Build and execute the query
      ordersQuery = query(baseQuery, ...queryConstraints);
      
      console.log("Executing Firestore query for archived orders");
      const querySnapshot = await getDocs(ordersQuery);
      console.log(`Query returned ${querySnapshot.docs.length} results`);

      const fetchedOrders: ArchivedOrder[] = [];
      
      querySnapshot.forEach(doc => {
        fetchedOrders.push({
          id: doc.id,
          ...doc.data(),
        } as ArchivedOrder);
      });
      
      setArchivedOrders(fetchedOrders);

    } catch (err) {
      console.error("Error fetching archived orders:", err);
      setError(`Failed to load archived orders: ${err instanceof Error ? err.message : String(err)}`);
      setArchivedOrders([]); // Clear orders on error
    } finally {
      setLoading(false);
    }
  }, [filter, itemLimit]);

  // Fetch orders when filter or limit changes
  useEffect(() => {
    fetchArchivedOrders();
  }, [fetchArchivedOrders]);

  // Function to update filters
  const updateFilter = useCallback((newFilter: ArchiveFilter) => {
    console.log("Updating archive filter to:", newFilter);
    setFilter(newFilter);
  }, []);

  // Function to update limit
  const updateLimit = useCallback((newLimit: number) => {
    setItemLimit(newLimit);
  }, []);

  // Helper function to format date from Timestamp
  const formatDate = useCallback((timestamp: Timestamp | undefined) => {
    if (!timestamp || !timestamp.toDate) return "N/A";
    const date = timestamp.toDate();
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }, []);

  return {
    archivedOrders,
    loading,
    error,
    updateFilter,
    updateLimit,
    formatDate,
    refreshArchivedOrders: fetchArchivedOrders,
  };
};

export default useArchivedOrders;