import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  const [filter, setFilter] = useState<ArchiveFilter | undefined>(initialFilter);
  const [itemLimit, setItemLimit] = useState(initialLimit);
  const queryClient = useQueryClient();

  const fetchArchivedOrders = async () => {
    const baseQuery = collection(db, "archivedOrders");
    const queryConstraints: QueryConstraint[] = [orderBy("archivedAt", "desc"), limit(itemLimit)];
    if (filter?.dateRange) {
      const { start, end } = filter.dateRange;
      queryConstraints.push(
        where("archivedAt", ">=", Timestamp.fromDate(start)),
        where("archivedAt", "<=", Timestamp.fromDate(end))
      );
    }
    const ordersQuery = query(baseQuery, ...queryConstraints);
    const querySnapshot = await getDocs(ordersQuery);
    const fetchedOrders: ArchivedOrder[] = [];
    querySnapshot.forEach(doc => {
      fetchedOrders.push({
        id: doc.id,
        ...doc.data(),
      } as ArchivedOrder);
    });
    return fetchedOrders;
  };

  const {
    data: archivedOrders = [],
    isLoading: loading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["archivedOrders", filter ? JSON.stringify(filter) : "", itemLimit],
    queryFn: fetchArchivedOrders,
    keepPreviousData: true,
  });

  const updateFilter = (newFilter: ArchiveFilter) => {
    setFilter(newFilter);
  };

  const updateLimit = (newLimit: number) => {
    setItemLimit(newLimit);
  };

  const formatDate = (timestamp: Timestamp | undefined) => {
    if (!timestamp || !timestamp.toDate) return "N/A";
    const date = timestamp.toDate();
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  return {
    archivedOrders,
    loading,
    error: isError ? (error instanceof Error ? error.message : String(error)) : null,
    updateFilter,
    updateLimit,
    formatDate,
    refreshArchivedOrders: refetch,
  };
};

export default useArchivedOrders;
