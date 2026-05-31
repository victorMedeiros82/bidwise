import { useState, useEffect, useCallback } from 'react';
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
  QueryConstraint
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { supabase } from '../lib/supabase';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Database Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function useFirestore<T>(collectionName: string, constraints: QueryConstraint[] = []) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hasSupabase = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

  // Manual fetch function for Supabase to support instant local state update on change
  const fetchSupabaseData = useCallback(async () => {
    if (!auth.currentUser) return;
    try {
      const { data: records, error: fetchErr } = await supabase
        .from(collectionName)
        .select('*')
        .eq('createdBy', auth.currentUser.uid);

      if (fetchErr) {
        throw fetchErr;
      }

      setData((records || []) as unknown as T[]);
      setError(null);
    } catch (err: any) {
      console.warn(`Supabase fetch failed for table "${collectionName}". Falling back or continuing...`, err);
      // Ensure we don't block the screen entirely if there's a temporary table/permission issue
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [collectionName]);

  useEffect(() => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }

    if (hasSupabase) {
      setLoading(true);
      fetchSupabaseData();

      // Setup a real-time subscription for table updates
      const channel = supabase
        .channel(`public:${collectionName}-changes`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: collectionName },
          (payload) => {
            console.log(`Realtime postgres change on ${collectionName}:`, payload);
            fetchSupabaseData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      // Standard Firebase Firestore realtime listener
      setLoading(true);
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
          setError(null);
          setLoading(false);
        },
        (err) => {
          handleFirestoreError(err, OperationType.LIST, collectionName);
          setError(err.message);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    }
  }, [collectionName, JSON.stringify(constraints), auth.currentUser?.uid, hasSupabase, fetchSupabaseData]);

  const add = async (newData: Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => {
    if (!auth.currentUser) throw new Error('User not authenticated');

    if (hasSupabase) {
      try {
        const payload = {
          ...newData,
          createdBy: auth.currentUser.uid,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const { data: inserted, error: insertErr } = await supabase
          .from(collectionName)
          .insert(payload)
          .select();

        if (insertErr) throw insertErr;

        // Fetch again to sync instantly
        fetchSupabaseData();

        if (inserted && inserted[0]) {
          return { id: inserted[0].id, ...inserted[0] };
        }
        return null;
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, collectionName);
      }
    } else {
      try {
        const docRef = await addDoc(collection(db, collectionName), {
          ...newData,
          createdBy: auth.currentUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        return { id: docRef.id, ...newData } as any;
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, collectionName);
      }
    }
  };

  const update = async (id: string, updateData: Partial<T>) => {
    if (hasSupabase) {
      try {
        const cleanData = { ...updateData };
        delete (cleanData as any).id; // Delete keys that shouldn't be overridden

        const { data: updated, error: updateErr } = await supabase
          .from(collectionName)
          .update({
            ...cleanData,
            updatedAt: new Date().toISOString()
          })
          .eq('id', id)
          .select();

        if (updateErr) throw updateErr;

        // Fetch again to sync instantly
        fetchSupabaseData();

        if (updated && updated[0]) {
          return { id: updated[0].id, ...updated[0] };
        }
        return null;
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `${collectionName}/${id}`);
      }
    } else {
      const docRef = doc(db, collectionName, id);
      try {
        await updateDoc(docRef, {
          ...updateData,
          updatedAt: serverTimestamp()
        });
        return { id, ...updateData } as any;
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `${collectionName}/${id}`);
      }
    }
  };

  const remove = async (id: string) => {
    if (hasSupabase) {
      try {
        const { error: deleteErr } = await supabase
          .from(collectionName)
          .delete()
          .eq('id', id);

        if (deleteErr) throw deleteErr;

        // Fetch again to sync instantly
        fetchSupabaseData();
        return true;
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `${collectionName}/${id}`);
      }
    } else {
      try {
        await deleteDoc(doc(db, collectionName, id));
        return true;
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `${collectionName}/${id}`);
      }
    }
  };

  return { data, loading, error, add, update, remove };
}

