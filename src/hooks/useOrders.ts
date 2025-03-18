// src/hooks/useOrders.ts - with enhanced debugging
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

export interface FirebaseOrder {
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
  state?: string;
}

export interface OrderFilter {
  status?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  searchTerm?: string;
}

export const useOrders = (initialFilter?: OrderFilter, initialLimit = 50) => {
  const [orders, setOrders] = useState<FirebaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<OrderFilter | undefined>(initialFilter);
  const [itemLimit, setItemLimit] = useState(initialLimit);

  // DEBUG: Add this function to log filter and query details
  const logDebugInfo = (message: string, data: any) => {
    console.log(`[useOrders DEBUG] ${message}:`, data);
  };

  // Fetch orders function
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);

    logDebugInfo("Current filter object", filter);
    logDebugInfo("Filter type", typeof filter);
    if (filter) {
      logDebugInfo("Filter has keys", Object.keys(filter));
      if (filter.status) {
        logDebugInfo("Status filter", filter.status);
        logDebugInfo("Status filter type", typeof filter.status);
        logDebugInfo("Status filter length", filter.status.length);
      } else {
        logDebugInfo("No status property in filter", null);
      }
    }

    try {
      let ordersQuery;
      let queryDescription = "";

      // Create the appropriate query based on filter
      if (filter && filter.status && Array.isArray(filter.status) && filter.status.length > 0) {
        // Has status filter with values
        queryDescription = `Filtering by status: ${filter.status.join(", ")}`;
        logDebugInfo(queryDescription, null);
        
        ordersQuery = query(
          collection(db, "orders"),
          where("status", "in", filter.status),
          limit(itemLimit)
        );
      } else {
        // No filter or empty filter - get all orders
        queryDescription = "No filter - getting all orders";
        logDebugInfo(queryDescription, null);
        
        ordersQuery = query(
          collection(db, "orders"), 
          orderBy("updated", "desc"), 
          limit(itemLimit)
        );
      }

      logDebugInfo("Executing query", queryDescription);
      const querySnapshot = await getDocs(ordersQuery);
      logDebugInfo(`Query returned ${querySnapshot.docs.length} results`, null);

      const fetchedOrders: FirebaseOrder[] = [];
      const statusCounts: Record<string, number> = {};

      querySnapshot.forEach(doc => {
        const data = doc.data();
        const status = data.status || "unknown";
        
        // Count each status type for debugging
        statusCounts[status] = (statusCounts[status] || 0) + 1;
        
        fetchedOrders.push({
          id: doc.id,
          ...data,
        } as FirebaseOrder);
      });

      logDebugInfo("Status counts in results", statusCounts);
      logDebugInfo("Setting orders state with count", fetchedOrders.length);
      
      setOrders(fetchedOrders);
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError(`Failed to load orders: ${err instanceof Error ? err.message : String(err)}`);
      setOrders([]); // Clear orders on error
    } finally {
      setLoading(false);
    }
  }, [filter, itemLimit]);

  // Fetch orders when filter or limit changes
  useEffect(() => {
    logDebugInfo("Effect triggered - fetching orders", { filter, itemLimit });
    fetchOrders();
  }, [fetchOrders]);

  // Function to update filters
  const updateFilter = useCallback((newFilter: OrderFilter) => {
    logDebugInfo("Updating filter to", newFilter);
    setFilter(newFilter);
  }, []);

  // Function to update limit
  const updateLimit = useCallback((newLimit: number) => {
    logDebugInfo("Updating item limit to", newLimit);
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
    orders,
    loading,
    error,
    updateFilter,
    updateLimit,
    formatDate,
    refreshOrders: fetchOrders,
  };
};

export default useOrders;