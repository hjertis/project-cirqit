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

  const fetchArchivedOrders = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let ordersQuery;

      const baseQuery = collection(db, "archivedOrders");

      const queryConstraints: QueryConstraint[] = [orderBy("archivedAt", "desc"), limit(itemLimit)];

      if (filter?.dateRange) {
        const { start, end } = filter.dateRange;
        queryConstraints.push(
          where("archivedAt", ">=", Timestamp.fromDate(start)),
          where("archivedAt", "<=", Timestamp.fromDate(end))
        );
      }

      ordersQuery = query(baseQuery, ...queryConstraints);

      const querySnapshot = await getDocs(ordersQuery);

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
      setError(
        `Failed to load archived orders: ${err instanceof Error ? err.message : String(err)}`
      );
      setArchivedOrders([]);
    } finally {
      setLoading(false);
    }
  }, [filter, itemLimit]);

  useEffect(() => {
    fetchArchivedOrders();
  }, [fetchArchivedOrders]);

  const updateFilter = useCallback((newFilter: ArchiveFilter) => {
    setFilter(newFilter);
  }, []);

  const updateLimit = useCallback((newLimit: number) => {
    setItemLimit(newLimit);
  }, []);

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
