import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from "firebase/firestore";
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
  removedDate?: Timestamp;
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
  const [filter, setFilter] = useState<OrderFilter | undefined>(initialFilter);
  const [itemLimit, setItemLimit] = useState(initialLimit);

  const fetchOrders = async () => {
    let ordersQuery;
    if (filter && filter.status && Array.isArray(filter.status) && filter.status.length > 0) {
      ordersQuery = query(
        collection(db, "orders"),
        where("status", "in", filter.status),
        limit(itemLimit)
      );
    } else {
      ordersQuery = query(collection(db, "orders"), orderBy("updated", "desc"), limit(itemLimit));
    }
    const querySnapshot = await getDocs(ordersQuery);
    const fetchedOrders: FirebaseOrder[] = [];
    querySnapshot.forEach(doc => {
      const data = doc.data();
      fetchedOrders.push({
        id: doc.id,
        ...data,
      } as FirebaseOrder);
    });
    return fetchedOrders;
  };
  const {
    data: orders = [],
    isLoading: loading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["orders", filter ? JSON.stringify(filter) : "", itemLimit],
    queryFn: fetchOrders,
    staleTime: 30000, // Data remains fresh for 30 seconds
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });

  const updateFilter = (newFilter: OrderFilter) => {
    setFilter(newFilter);
  };

  const updateLimit = (newLimit: number) => {
    setItemLimit(newLimit);
  };

  const formatDate = (timestamp: Timestamp | undefined) => {
    if (!timestamp || !timestamp.toDate) return "N/A";
    const date = timestamp.toDate();
    return date.toLocaleDateString("da-DK", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  return {
    orders,
    loading,
    error: isError ? (error instanceof Error ? error.message : String(error)) : null,
    updateFilter,
    updateLimit,
    formatDate,
    refreshOrders: refetch,
  };
};

export default useOrders;
