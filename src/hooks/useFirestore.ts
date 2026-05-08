import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  orderBy,
  QueryConstraint
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

export function useFirestore<T>(collectionName: string, constraints: QueryConstraint[] = []) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, collectionName),
      where('createdBy', '==', auth.currentUser.uid),
      ...constraints
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const results: T[] = [];
        snapshot.forEach((doc) => {
          results.push({ id: doc.id, ...doc.data() } as T);
        });
        setData(results);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [collectionName, JSON.stringify(constraints)]);

  const add = async (newData: Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => {
    if (!auth.currentUser) throw new Error('User not authenticated');
    return addDoc(collection(db, collectionName), {
      ...newData,
      createdBy: auth.currentUser.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  };

  const update = async (id: string, updateData: Partial<T>) => {
    const docRef = doc(db, collectionName, id);
    return updateDoc(docRef, {
      ...updateData,
      updatedAt: serverTimestamp()
    });
  };

  const remove = async (id: string) => {
    return deleteDoc(doc(db, collectionName, id));
  };

  return { data, loading, error, add, update, remove };
}
