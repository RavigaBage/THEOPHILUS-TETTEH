import { useState, useCallback } from 'react';
import api from '../lib/api';

interface UseCrudOptions {
  endpoint: string;
}

export function useCrud<T extends { _id: string }>({ endpoint }: UseCrudOptions) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pages, setPages] = useState(1);

  const fetchAll = useCallback(
    async (params?: Record<string, any>) => {
      setLoading(true);
      try {
        const res = await api.get(endpoint, { params });
        if (res.data.data && Array.isArray(res.data.data)) {
          setData(res.data.data);
          if (res.data.pages) setPages(res.data.pages);
        } else if (Array.isArray(res.data)) {
          setData(res.data);
        }
      } catch (err) {
        console.error(`Error fetching ${endpoint}:`, err);
      } finally {
        setLoading(false);
      }
    },
    [endpoint]
  );

  const createRecord = async (payload: any) => {
    setSubmitting(true);
    try {
      const res = await api.post(endpoint, payload);
      await fetchAll();
      return res.data;
    } finally {
      setSubmitting(false);
    }
  };

  const updateRecord = async (id: string, payload: any) => {
    setSubmitting(true);
    try {
      const res = await api.put(`${endpoint}/${id}`, payload);
      await fetchAll();
      return res.data;
    } finally {
      setSubmitting(false);
    }
  };

  const deleteRecord = async (id: string) => {
    setSubmitting(true);
    try {
      await api.delete(`${endpoint}/${id}`);
      await fetchAll();
    } finally {
      setSubmitting(false);
    }
  };

  return {
    data,
    loading,
    submitting,
    pages,
    fetchAll,
    createRecord,
    updateRecord,
    deleteRecord,
  };
}
