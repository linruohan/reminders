import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useApi } from './useApi';
import type { ReminderResponse, ListResponse, OwnerResponse, UpdateReminderRequest } from '@/types/api';
import { getTodayStr } from '@/utils/dateUtils';

interface ReminderCache {
  [filter: string]: {
    data: ReminderResponse[];
    timestamp: number;
  };
}

/** 缓存 TTL，与自动刷新间隔对齐，避免缓存过期但未刷新的空窗期 */
const CACHE_TTL = 60000;

/**
 * 判断提醒是否匹配指定过滤器
 * 用于缓存更新时决定该提醒应被加入、保留还是移除
 */
function doesReminderMatchFilter(reminder: ReminderResponse, filter: string): boolean {
  if (filter.startsWith('list:')) {
    const listId = filter.split(':')[1];
    return reminder.list_id === listId;
  }
  const todayStr = getTodayStr();
  switch (filter) {
    case 'today':
      return !reminder.is_completed && reminder.due_date === todayStr;
    case 'planned':
      return !reminder.is_completed && reminder.due_date !== null;
    case 'overdue':
      return !reminder.is_completed && reminder.due_date !== null && reminder.due_date < todayStr;
    case 'completed':
      return reminder.is_completed;
    case 'all':
      return true;
    default:
      return true;
  }
}

/**
 * 将一个提醒应用到列表中（按过滤器语义增删替换）
 * - 匹配且存在：替换
 * - 匹配且不存在：添加到开头
 * - 不匹配：移除
 */
function applyReminderToList(
  list: ReminderResponse[],
  reminder: ReminderResponse,
  filter: string,
): ReminderResponse[] {
  if (doesReminderMatchFilter(reminder, filter)) {
    const existed = list.some(r => r.id === reminder.id);
    if (existed) {
      return list.map(r => (r.id === reminder.id ? reminder : r));
    }
    return [reminder, ...list];
  }
  return list.filter(r => r.id !== reminder.id);
}

export function useReminderData() {
  const {
    getReminders,
    getRemindersByList,
    searchReminders,
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
  const [activeFilterLoaded, setActiveFilterLoaded] = useState(false);
  const [allDataLoaded, setAllDataLoaded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const cacheRef = useRef(cache);
  const isEditingRef = useRef(isEditing);
  useEffect(() => {
    cacheRef.current = cache;
  }, [cache]);

  useEffect(() => {
    isEditingRef.current = isEditing;
  }, [isEditing]);

  /** 从全量缓存派生，用于计数和日历视图，避免日历只看到当前过滤器的数据 */
  const allReminders = useMemo(() => cache['all']?.data ?? [], [cache]);

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

  /** 加载指定过滤器的提醒数据，force=true 时跳过缓存强制拉取 */
  const loadReminders = useCallback(async (filter: string, force: boolean = false, skipSetReminders: boolean = false) => {
    if (!force) {
      const cached = getCachedReminders(filter);
      if (cached) {
        if (!skipSetReminders) {
          setReminders(cached);
        }
        if (filter === 'all') {
          setAllDataLoaded(true);
        } else {
          setActiveFilterLoaded(true);
        }
        return;
      }
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
        if (!skipSetReminders) {
          setReminders(data);
        }
        setCachedReminders(filter, data);
      }
    } catch {
      console.error(`Failed to load reminders for filter: ${filter}`);
    } finally {
      if (filter === 'all') {
        setAllDataLoaded(true);
      } else {
        setActiveFilterLoaded(true);
      }
    }
  }, [getReminders, getRemindersByList, getCachedReminders, setCachedReminders]);

  /** 处理搜索查询 */
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      loadReminders(activeFilter);
      return;
    }
    try {
      const data = await searchReminders(query.trim());
      if (data) {
        setReminders(data);
      }
    } catch {
      console.error('Failed to search reminders');
    }
  }, [searchReminders, activeFilter, loadReminders]);

  const loadRemindersRef = useRef<typeof loadReminders>(loadReminders);

  useEffect(() => {
    loadRemindersRef.current = loadReminders;
  }, [loadReminders]);

  const loadLists = useCallback(async () => {
    const data = await getLists();
    if (data) setLists(data);
  }, [getLists]);

  const loadOwners = useCallback(async () => {
    const data = await getOwners();
    if (data) setOwners(data);
  }, [getOwners]);

  // 初始加载 lists 与 owners
  useEffect(() => {
    loadLists();
    loadOwners();
  }, [loadLists, loadOwners]);

  // 切换过滤器时加载对应数据
  useEffect(() => {
    loadReminders(activeFilter);
  }, [activeFilter, loadReminders]);

  // 后台加载 all 数据用于计数和日历视图
  useEffect(() => {
    loadRemindersRef.current('all');
  }, []);

  const handleFilterChange = useCallback((filter: string) => {
    setActiveFilter(filter);
    setActiveFilterLoaded(false);
  }, []);

  /** 在所有已缓存过滤器中按语义同步一个提醒（增/改/删） */
  const upsertReminderInCache = useCallback((reminder: ReminderResponse) => {
    setCache(prev => {
      const newCache = { ...prev };
      Object.keys(newCache).forEach(key => {
        newCache[key] = {
          ...newCache[key],
          data: applyReminderToList(newCache[key].data, reminder, key),
        };
      });
      return newCache;
    });
  }, []);

  /** 从所有缓存中移除一个提醒 */
  const removeReminderFromCache = useCallback((id: string) => {
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
  }, []);

  const handleToggleCompleted = useCallback(async (id: string) => {
    const result = await toggleReminderCompleted(id);
    if (result) {
      setReminders(prev => applyReminderToList(prev, result, activeFilter));
      upsertReminderInCache(result);
    }
  }, [toggleReminderCompleted, activeFilter, upsertReminderInCache]);

  const handleUpdateReminder = useCallback(async (id: string, updates: Partial<ReminderResponse>) => {
    const request: UpdateReminderRequest = { id, ...updates };
    const result = await updateReminder(request);
    if (result) {
      setReminders(prev => applyReminderToList(prev, result, activeFilter));
      upsertReminderInCache(result);
    }
  }, [updateReminder, activeFilter, upsertReminderInCache]);

  const handleDeleteReminder = useCallback(async (id: string) => {
    const success = await deleteReminder(id);
    if (success) {
      setReminders(prev => prev.filter(r => r.id !== id));
      removeReminderFromCache(id);
    }
  }, [deleteReminder, removeReminderFromCache]);

  const handleCreateReminder = useCallback(async (data: {
    title: string;
    description?: string | null;
    due_date?: string | null;
    due_time?: string | null;
    list_id?: string | null;
  }) => {
    const result = await createReminder(data);
    if (result) {
      if (doesReminderMatchFilter(result, activeFilter)) {
        setReminders(prev => [result, ...prev]);
      }
      upsertReminderInCache(result);
    }
    return result;
  }, [createReminder, activeFilter, upsertReminderInCache]);

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

  /** 强制刷新所有已缓存过滤器，编辑中跳过 activeFilter 的 setReminders 避免打断编辑 */
  const refreshData = useCallback(async () => {
    await loadLists();
    await loadOwners();
    const filters = Object.keys(cacheRef.current);
    const currentActiveFilter = activeFilter;
    const currentIsEditing = isEditingRef.current;
    await Promise.all(
      filters.map(f => loadReminders(f, true, currentIsEditing && f === currentActiveFilter))
    );
  }, [loadLists, loadOwners, loadReminders, activeFilter]);

  /** 基于全量数据计算各过滤器计数，避免用当前过滤器数据误算 */
  const filterCounts = useMemo(() => {
    const todayStr = getTodayStr();
    return {
      all: allReminders.length,
      today: allReminders.filter(r => !r.is_completed && r.due_date === todayStr).length,
      planned: allReminders.filter(r => !r.is_completed && r.due_date !== null).length,
      completed: allReminders.filter(r => r.is_completed).length,
      lists: lists.map(list => ({
        id: list.id,
        count: allReminders.filter(r => r.list_id === list.id).length,
      })),
    };
  }, [allReminders, lists]);

  const isInitialLoading = activeFilterLoaded === false || allDataLoaded === false;

  return {
    reminders,
    allReminders,
    lists,
    owners,
    activeFilter,
    searchQuery,
    isLoading,
    isInitialLoading,
    isEditing,
    setIsEditing,
    filterCounts,
    handleFilterChange,
    handleSearch,
    handleToggleCompleted,
    handleUpdateReminder,
    handleDeleteReminder,
    handleCreateReminder,
    handleAddList,
    handleDeleteList,
    refreshData,
  };
}
