// src/hooks/useOrders.ts
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

  // Fetch orders function
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      /* console.log("Fetching orders with filter:", filter); */
      let ordersQuery;

      // For debugging - fetch all orders without filtering first
      if (
        !filter ||
        Object.keys(filter).length === 0 ||
        !filter.status ||
        filter.status.length === 0
      ) {
        // No filter, get all orders
        ordersQuery = query(collection(db, "orders"), orderBy("updated", "desc"), limit(itemLimit));
      } else {
        // Apply status filter
        ordersQuery = query(
          collection(db, "orders"),
          where("status", "in", filter.status),
          limit(itemLimit)
        );
      }

      /* console.log("Executing Firestore query"); */
      const querySnapshot = await getDocs(ordersQuery);
      /* console.log(`Query returned ${querySnapshot.docs.length} results`); */

      const fetchedOrders: FirebaseOrder[] = [];
      querySnapshot.forEach(doc => {
        const data = doc.data();
        /* console.log(`Order ${doc.id} status: ${data.status}`); */
        fetchedOrders.push({
          id: doc.id,
          ...data,
        } as FirebaseOrder);
      });

      setOrders(fetchedOrders);

      // Client-side filtering if needed for complex cases
      if (filter && filter.status && filter.status.length > 0) {
        /* console.log(`Filtering client-side for status: ${filter.status.join(", ")}`); */
        const filteredOrders = fetchedOrders.filter(order => filter.status!.includes(order.status));
        /* console.log(`Client-side filtering returned ${filteredOrders.length} results`); */
        setOrders(filteredOrders);
      }
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
    fetchOrders();
  }, [fetchOrders]);

  // Function to update filters
  const updateFilter = useCallback((newFilter: OrderFilter) => {
    /* console.log("Updating filter to:", newFilter); */
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
