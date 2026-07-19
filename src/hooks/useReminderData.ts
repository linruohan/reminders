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

export function useReminderData(showToast?: (type: 'success' | 'error' | 'info', message: string) => void) {
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
    updateList,
    deleteList,
    createOwner,
    updateOwner,
    deleteOwner,
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
  const [clipboard, setClipboard] = useState<{ action: 'cut' | 'copy'; reminder: ReminderResponse } | null>(null);
  const cacheRef = useRef(cache);
  useEffect(() => {
    cacheRef.current = cache;
  }, [cache]);

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
    const cached = getCachedReminders(filter);

    if (cached && !skipSetReminders) {
      setReminders(cached);
      if (filter === 'all') {
        setAllDataLoaded(true);
      } else {
        setActiveFilterLoaded(true);
      }
    }

    if (!force && cached) {
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

  // 后台加载 all 数据用于计数和日历视图，skipSetReminders=true 避免覆盖当前过滤器的数据
  useEffect(() => {
    loadRemindersRef.current('all', false, true);
  }, []);

  const handleFilterChange = useCallback((filter: string) => {
    setActiveFilter(filter);
    setActiveFilterLoaded(false);
  }, []);

  /** mutation 后统一失效并重取：搜索态重跑搜索，否则重取 all + 当前过滤器 */
  const syncAfterMutation = useCallback(async () => {
    if (searchQuery.trim()) {
      await handleSearch(searchQuery);
      return;
    }
    if (activeFilter === 'all') {
      await loadReminders('all', true);
    } else {
      await loadReminders('all', true, true);
      await loadReminders(activeFilter, true);
    }
  }, [searchQuery, handleSearch, loadReminders, activeFilter]);

  const handleToggleCompleted = useCallback(async (id: string) => {
    const result = await toggleReminderCompleted(id);
    if (result) {
      await syncAfterMutation();
    } else {
      showToast?.('error', '更新提醒状态失败');
    }
  }, [toggleReminderCompleted, syncAfterMutation, showToast]);

  const handleUpdateReminder = useCallback(async (id: string, updates: Partial<ReminderResponse>) => {
    const { tags: tagObjs, ...rest } = updates;
    const request: UpdateReminderRequest = {
      id,
      ...rest,
      ...(tagObjs ? { tags: tagObjs.map(t => typeof t === 'string' ? t : t.name) } : {}),
    };
    const result = await updateReminder(request);
    if (result) {
      await syncAfterMutation();
    } else {
      showToast?.('error', '更新提醒失败');
    }
  }, [updateReminder, syncAfterMutation, showToast]);

  const handleDeleteReminder = useCallback(async (id: string) => {
    const success = await deleteReminder(id);
    if (success) {
      await syncAfterMutation();
    } else {
      showToast?.('error', '删除提醒失败');
    }
  }, [deleteReminder, syncAfterMutation, showToast]);

  const handleCreateReminder = useCallback(async (data: {
    title: string;
    description?: string | null;
    url?: string | null;
    due_date?: string | null;
    due_time?: string | null;
    end_date?: string | null;
    end_time?: string | null;
    list_id?: string | null;
    is_all_day?: boolean;
    is_flagged?: boolean;
    priority?: string;
    recurrence_frequency?: string | null;
    recurrence_interval?: number | null;
    custom_recurrence_unit?: string | null;
    recurrence_end_date?: string | null;
    remind_before_value?: number | null;
    remind_before_unit?: string | null;
    tags?: string[];
  }) => {
    const result = await createReminder(data);
    if (result.data) {
      await syncAfterMutation();
    }
    return result;
  }, [createReminder, syncAfterMutation]);

  const handleAddList = useCallback(async (name: string) => {
    const result = await createList({ name });
    if (result) {
      await loadLists();
    }
    return result;
  }, [createList, loadLists]);

  const handleDeleteList = useCallback(async (id: string) => {
    const success = await deleteList(id);
    if (success) {
      await loadLists();
      if (activeFilter === `list:${id}`) {
        setActiveFilter('all');
      }
    } else {
      showToast?.('error', '删除列表失败');
    }
    return success;
  }, [deleteList, activeFilter, loadLists, showToast]);

  const handleUpdateList = useCallback(async (id: string, updates: Partial<ListResponse>) => {
    const result = await updateList({ id, ...updates });
    if (result) {
      await loadLists();
    } else {
      showToast?.('error', '更新列表失败');
    }
    return result;
  }, [updateList, loadLists, showToast]);

  const handleUpdateOwner = useCallback(async (id: string, updates: Partial<OwnerResponse>) => {
    const result = await updateOwner({ id, ...updates });
    if (result) {
      await loadOwners();
    } else {
      showToast?.('error', '更新所有者失败');
    }
    return result;
  }, [updateOwner, loadOwners, showToast]);

  const handleAddOwner = useCallback(async (name: string) => {
    const result = await createOwner({ name });
    if (result) {
      await loadOwners();
    } else {
      showToast?.('error', '创建所有者失败');
    }
    return result;
  }, [createOwner, loadOwners, showToast]);

  const handleDeleteOwner = useCallback(async (id: string) => {
    const success = await deleteOwner(id);
    if (success) {
      await loadOwners();
    } else {
      showToast?.('error', '删除所有者失败');
    }
    return success;
  }, [deleteOwner, loadOwners, showToast]);

  const handleCutReminder = useCallback((reminder: ReminderResponse) => {
    setClipboard({ action: 'cut', reminder });
  }, []);

  const handleCopyReminder = useCallback((reminder: ReminderResponse) => {
    setClipboard({ action: 'copy', reminder });
  }, []);

  const handlePasteReminder = useCallback(async (targetListId: string | null) => {
    if (!clipboard) return;
    
    const newReminderData: Parameters<typeof handleCreateReminder>[0] = {
      title: clipboard.reminder.title,
      description: clipboard.reminder.description,
      url: clipboard.reminder.url,
      due_date: clipboard.reminder.due_date,
      due_time: clipboard.reminder.due_time,
      end_date: clipboard.reminder.end_date,
      end_time: clipboard.reminder.end_time,
      list_id: targetListId ?? clipboard.reminder.list_id,
      is_all_day: clipboard.reminder.is_all_day,
      is_flagged: clipboard.reminder.is_flagged,
      priority: clipboard.reminder.priority,
      recurrence_frequency: clipboard.reminder.recurrence_frequency,
      recurrence_interval: clipboard.reminder.recurrence_interval,
      custom_recurrence_unit: clipboard.reminder.custom_recurrence_unit,
      recurrence_end_date: clipboard.reminder.recurrence_end_date,
      remind_before_value: clipboard.reminder.remind_before_value,
      remind_before_unit: clipboard.reminder.remind_before_unit,
    };
    
    const result = await createReminder(newReminderData);
    if (result.data) {
      if (clipboard.action === 'cut') {
        await deleteReminder(clipboard.reminder.id);
      }
      await syncAfterMutation();
    } else {
      showToast?.('error', result.error || '粘贴提醒失败');
    }
    
    setClipboard(null);
    return result.data;
  }, [clipboard, createReminder, deleteReminder, syncAfterMutation, showToast]);

  /** 强制刷新列表、所有者与提醒（all + 当前过滤器） */
  const refreshData = useCallback(async () => {
    await loadLists();
    await loadOwners();
    await loadReminders('all', true, true);
    if (activeFilter !== 'all') {
      await loadReminders(activeFilter, true);
    } else {
      await loadReminders('all', true);
    }
  }, [loadLists, loadOwners, loadReminders, activeFilter]);

  /** 基于全量数据计算各过滤器计数，避免用当前过滤器数据误算 */
  const filterCounts = useMemo(() => {
    const todayStr = getTodayStr();
    return {
      all: allReminders.length,
      today: allReminders.filter(r => !r.is_completed && r.due_date === todayStr).length,
      planned: allReminders.filter(r => !r.is_completed && r.due_date !== null).length,
      completed: allReminders.filter(r => r.is_completed).length,
      urgent: allReminders.filter(r => !r.is_completed && r.priority === 'high').length,
      flagged: allReminders.filter(r => !r.is_completed && (r.is_flagged || r.priority === 'high' || r.priority === 'medium')).length,
      lists: lists.map(list => ({
        id: list.id,
        count: allReminders.filter(r => r.list_id === list.id).length,
      })),
    };
  }, [allReminders, lists]);

  const isInitialLoading = 
    (activeFilterLoaded === false || allDataLoaded === false) && reminders.length === 0;

  return {
    reminders,
    allReminders,
    lists,
    owners,
    activeFilter,
    searchQuery,
    clipboard,
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
    handleUpdateList,
    handleDeleteList,
    handleAddOwner,
    handleUpdateOwner,
    handleDeleteOwner,
    handleCutReminder,
    handleCopyReminder,
    handlePasteReminder,
    refreshData,
  };
}
