import { useState, useEffect, useCallback, useRef } from 'react';
import { useApi } from './useApi';
import type { ReminderResponse, ListResponse, OwnerResponse, UpdateReminderRequest } from '@/types/api';

interface ReminderCache {
  [filter: string]: {
    data: ReminderResponse[];
    timestamp: number;
  };
}

const CACHE_TTL = 30000;

export function useReminderData() {
  const {
    getReminders,
    getRemindersByList,
    getLists,
    getOwners,
    createReminder,
    updateReminder,
    deleteReminder,
    toggleReminderCompleted,
    createList,
    deleteList,
    isLoading,
  } = useApi();

  const [reminders, setReminders] = useState<ReminderResponse[]>([]);
  const [lists, setLists] = useState<ListResponse[]>([]);
  const [owners, setOwners] = useState<OwnerResponse[]>([]);
  const [activeFilter, setActiveFilter] = useState('today');
  const [cache, setCache] = useState<ReminderCache>({});
  const cacheRef = useRef(cache);

  useEffect(() => {
    cacheRef.current = cache;
  }, [cache]);

  const getCachedReminders = useCallback((filter: string): ReminderResponse[] | null => {
    const cached = cacheRef.current[filter];
    if (!cached) return null;
    if (Date.now() - cached.timestamp > CACHE_TTL) return null;
    return cached.data;
  }, []);

  const setCachedReminders = useCallback((filter: string, data: ReminderResponse[]) => {
    setCache(prev => ({
      ...prev,
      [filter]: { data, timestamp: Date.now() },
    }));
  }, []);

  const loadReminders = useCallback(async (filter: string) => {
    const cached = getCachedReminders(filter);
    if (cached) {
      setReminders(cached);
      return;
    }

    try {
      let data: ReminderResponse[] | null;
      if (filter.startsWith('list:')) {
        const listId = filter.split(':')[1];
        data = await getRemindersByList(listId);
      } else {
        data = await getReminders(filter);
      }
      
      if (data) {
        setReminders(data);
        setCachedReminders(filter, data);
      }
    } catch {
      console.error(`Failed to load reminders for filter: ${filter}`);
    }
  }, [getReminders, getRemindersByList, getCachedReminders, setCachedReminders]);

  const loadLists = useCallback(async () => {
    const data = await getLists();
    if (data) setLists(data);
  }, [getLists]);

  const loadOwners = useCallback(async () => {
    const data = await getOwners();
    if (data) setOwners(data);
  }, [getOwners]);

  useEffect(() => {
    loadLists();
    loadOwners();
  }, [loadLists, loadOwners]);

  useEffect(() => {
    loadReminders(activeFilter);
  }, [activeFilter, loadReminders]);

  const handleFilterChange = useCallback((filter: string) => {
    setActiveFilter(filter);
  }, []);

  const handleToggleCompleted = useCallback(async (id: string) => {
    const result = await toggleReminderCompleted(id);
    if (result) {
      setReminders(prev => prev.map(r => (r.id === id ? result : r)));
      setCache(prev => {
        const newCache = { ...prev };
        Object.keys(newCache).forEach(key => {
          newCache[key] = {
            ...newCache[key],
            data: newCache[key].data.map(r => (r.id === id ? result : r)),
          };
        });
        return newCache;
      });
    }
  }, [toggleReminderCompleted]);

  const handleUpdateReminder = useCallback(async (id: string, updates: Partial<ReminderResponse>) => {
    const request: UpdateReminderRequest = { id, ...updates };
    const result = await updateReminder(request);
    if (result) {
      setReminders(prev => prev.map(r => (r.id === id ? result : r)));
      setCache(prev => {
        const newCache = { ...prev };
        Object.keys(newCache).forEach(key => {
          newCache[key] = {
            ...newCache[key],
            data: newCache[key].data.map(r => (r.id === id ? result : r)),
          };
        });
        return newCache;
      });
    }
  }, [updateReminder]);

  const handleDeleteReminder = useCallback(async (id: string) => {
    const success = await deleteReminder(id);
    if (success) {
      setReminders(prev => prev.filter(r => r.id !== id));
      setCache(prev => {
        const newCache = { ...prev };
        Object.keys(newCache).forEach(key => {
          newCache[key] = {
            ...newCache[key],
            data: newCache[key].data.filter(r => r.id !== id),
          };
        });
        return newCache;
      });
    }
  }, [deleteReminder]);

  const handleCreateReminder = useCallback(async (data: {
    title: string;
    description?: string | null;
    due_date?: string | null;
    due_time?: string | null;
    list_id?: string | null;
  }) => {
    const result = await createReminder(data);
    if (result) {
      setReminders(prev => [result, ...prev]);
      setCache(prev => {
        const newCache = { ...prev };
        const filterKey = data.list_id ? `list:${data.list_id}` : 'all';
        if (newCache[filterKey]) {
          newCache[filterKey] = {
            ...newCache[filterKey],
            data: [result, ...newCache[filterKey].data],
          };
        }
        if (newCache['today'] && result.due_date) {
          const today = new Date();
          const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
          if (result.due_date === todayStr) {
            newCache['today'] = {
              ...newCache['today'],
              data: [result, ...newCache['today'].data],
            };
          }
        }
        return newCache;
      });
    }
    return result;
  }, [createReminder]);

  const handleAddList = useCallback(async (name: string) => {
    const result = await createList({ name });
    if (result) {
      setLists(prev => [...prev, result]);
    }
    return result;
  }, [createList]);

  const handleDeleteList = useCallback(async (id: string) => {
    const success = await deleteList(id);
    if (success) {
      setLists(prev => prev.filter(l => l.id !== id));
      setCache(prev => {
        const newCache = { ...prev };
        delete newCache[`list:${id}`];
        return newCache;
      });
      if (activeFilter === `list:${id}`) {
        setActiveFilter('all');
      }
    }
    return success;
  }, [deleteList, activeFilter]);

  const refreshData = useCallback(async () => {
    setCache({});
    await loadLists();
    await loadOwners();
    await loadReminders(activeFilter);
  }, [loadLists, loadOwners, loadReminders, activeFilter]);

  const getFilterCounts = useCallback(() => {
    const allReminders = cacheRef.current['all']?.data || reminders;
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    return {
      all: allReminders.length,
      today: allReminders.filter(r => !r.is_completed && r.due_date === todayStr).length,
      planned: allReminders.filter(r => !r.is_completed && r.due_date).length,
      completed: allReminders.filter(r => r.is_completed).length,
      lists: lists.map(list => ({
        id: list.id,
        count: allReminders.filter(r => r.list_id === list.id).length,
      })),
    };
  }, [lists, reminders]);

  return {
    reminders,
    lists,
    owners,
    activeFilter,
    isLoading,
    handleFilterChange,
    handleToggleCompleted,
    handleUpdateReminder,
    handleDeleteReminder,
    handleCreateReminder,
    handleAddList,
    handleDeleteList,
    refreshData,
    getFilterCounts,
  };
}