import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  QueryConstraint,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { useQuery } from "@tanstack/react-query";

export function useCollection<T>(collectionName: string, constraints: QueryConstraint[] = []) {
  const {
    data = [],
    isLoading: loading,
    isError,
    error,
  } = useQuery({
    queryKey: ["firestore-collection", collectionName, constraints],
    queryFn: async () => {
      const q = query(collection(db, collectionName), ...constraints);
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as T[];
    },
  });
  return { data, loading, error: isError ? error : null };
}

export function useDocument<T>(collectionName: string, documentId: string) {
  const {
    data = null,
    isLoading: loading,
    isError,
    error,
  } = useQuery({
    queryKey: ["firestore-document", collectionName, documentId],
    queryFn: async () => {
      if (!documentId) return null;
      const docRef = doc(db, collectionName, documentId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as T;
      } else {
        return null;
      }
    },
    enabled: !!documentId,
  });
  return { data, loading, error: isError ? error : null };
}
