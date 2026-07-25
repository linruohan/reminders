import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useApi } from './useApi';
import type { ReminderResponse, ListResponse, OwnerResponse, TagResponse, CreateReminderRequest, SubtaskResponse } from '@/types/api';
import { isDueToday, isOverdue, isPlanned } from '@/utils/reminderDates';
import { normalizeUpdateRequest } from '@/utils/normalizeUpdateRequest';

interface ReminderCache {
  [filter: string]: {
    data: ReminderResponse[];
    timestamp: number;
  };
}

/** 缓存 TTL，略大于自动刷新间隔（60s），确保在自动刷新前缓存不会过期 */
const CACHE_TTL = 65000;

export function useReminderData(showToast?: (type: 'success' | 'error' | 'info', message: string) => void) {
  const {
    getReminders,
    getRemindersByList,
    getRemindersByOwner,
    getRemindersByTag,
    searchReminders,
    getLists,
    getOwners,
    getAllTags,
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
    createSubtask,
    updateSubtask,
    deleteSubtask,
    isLoading,
    error,
  } = useApi();

  const [reminders, setReminders] = useState<ReminderResponse[]>([]);
  const [lists, setLists] = useState<ListResponse[]>([]);
  const [owners, setOwners] = useState<OwnerResponse[]>([]);
  const [tags, setTags] = useState<TagResponse[]>([]);
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
        const listId = filter.slice('list:'.length);
        data = await getRemindersByList(listId);
      } else if (filter.startsWith('owner:')) {
        const ownerId = filter.slice('owner:'.length);
        data = await getRemindersByOwner(ownerId);
      } else if (filter.startsWith('tag:')) {
        const tagName = decodeURIComponent(filter.slice('tag:'.length));
        data = await getRemindersByTag(tagName);
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
      showToast?.('error', '加载提醒失败');
    } finally {
      if (filter === 'all') {
        setAllDataLoaded(true);
      } else {
        setActiveFilterLoaded(true);
      }
    }
  }, [getReminders, getRemindersByList, getRemindersByOwner, getRemindersByTag, getCachedReminders, setCachedReminders, showToast]);

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
      showToast?.('error', '搜索失败');
    }
  }, [searchReminders, activeFilter, loadReminders, showToast]);

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

  const loadTags = useCallback(async () => {
    const data = await getAllTags();
    if (data) setTags(data);
  }, [getAllTags]);

  // 初始加载 lists / owners / tags
  useEffect(() => {
    loadLists();
    loadOwners();
    loadTags();
  }, [loadLists, loadOwners, loadTags]);

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

  /** mutation 后统一失效并重取：搜索态重跑搜索，否则并发重取 all + 当前过滤器 */
  const syncAfterMutation = useCallback(async () => {
    if (searchQuery.trim()) {
      await handleSearch(searchQuery);
      return;
    }
    // 并发加载 all 和当前过滤器数据，提升响应速度
    if (activeFilter === 'all') {
      await loadReminders('all', true);
    } else {
      await Promise.all([
        loadReminders('all', true, true),
        loadReminders(activeFilter, true)
      ]);
    }
  }, [searchQuery, handleSearch, loadReminders, activeFilter]);

  const handleToggleCompleted = useCallback(async (id: string) => {
    const result = await toggleReminderCompleted(id);
    if (result) {
      await syncAfterMutation();
    } else {
      const errorMsg = error[`toggle_reminder_${id}`] || '更新提醒状态失败';
      showToast?.('error', errorMsg);
    }
  }, [toggleReminderCompleted, syncAfterMutation, showToast, error]);

  const handleUpdateReminder = useCallback(async (id: string, updates: Partial<ReminderResponse>) => {
    // 将前端 null 清空转为后端哨兵（'' / -1），避免 Option::None = 不更新
    const request = normalizeUpdateRequest(id, updates);
    const result = await updateReminder(request);
    if (result) {
      await syncAfterMutation();
      await loadTags();
    } else {
      const errorMsg = error[`update_reminder_${id}`] || '更新提醒失败';
      showToast?.('error', errorMsg);
    }
  }, [updateReminder, syncAfterMutation, showToast, error, loadTags]);

  const handleAddList = useCallback(async (name: string, icon?: string, color?: string) => {
    const result = await createList({ name, icon: icon || 'list', color });
    if (result) {
      await loadLists();
    }
    return result;
  }, [createList, loadLists]);

  const handleDeleteReminder = useCallback(async (id: string) => {
    const success = await deleteReminder(id);
    if (success) {
      await syncAfterMutation();
      showToast?.('success', '提醒已删除');
    } else {
      const errorMsg = error[`delete_reminder_${id}`] || '删除提醒失败';
      showToast?.('error', errorMsg);
    }
    return success;
  }, [deleteReminder, syncAfterMutation, showToast, error]);

  const handleCreateReminder = useCallback(async (data: CreateReminderRequest) => {
    const result = await createReminder(data);
    if (result.data) {
      await syncAfterMutation();
      await loadTags();
    }
    return result;
  }, [createReminder, syncAfterMutation, loadTags]);

  const handleDeleteList = useCallback(async (id: string) => {
    const success = await deleteList(id);
    if (success) {
      await loadLists();
      if (activeFilter === `list:${id}`) {
        setActiveFilter('all');
      }
    } else {
      const errorMsg = error[`delete_list_${id}`] || '删除列表失败';
      showToast?.('error', errorMsg);
    }
    return success;
  }, [deleteList, activeFilter, loadLists, showToast, error]);

  const handleUpdateList = useCallback(async (id: string, updates: Partial<ListResponse>) => {
    const result = await updateList({ id, ...updates });
    if (result) {
      await loadLists();
    } else {
      const errorMsg = error[`update_list_${id}`] || '更新列表失败';
      showToast?.('error', errorMsg);
    }
    return result;
  }, [updateList, loadLists, showToast, error]);

  const handleUpdateOwner = useCallback(async (id: string, updates: Partial<OwnerResponse>) => {
    const result = await updateOwner({ id, ...updates });
    if (result) {
      await loadOwners();
    } else {
      const errorMsg = error[`update_owner_${id}`] || '更新所有者失败';
      showToast?.('error', errorMsg);
    }
    return result;
  }, [updateOwner, loadOwners, showToast, error]);

  const handleAddOwner = useCallback(async (name: string) => {
    const result = await createOwner({ name });
    if (result) {
      await loadOwners();
    } else {
      const errorMsg = error['create_owner'] || '创建所有者失败';
      showToast?.('error', errorMsg);
    }
    return result;
  }, [createOwner, loadOwners, showToast, error]);

  const handleDeleteOwner = useCallback(async (id: string) => {
    const success = await deleteOwner(id);
    if (success) {
      await loadOwners();
      if (activeFilter === `owner:${id}`) {
        setActiveFilter('all');
      }
    } else {
      const errorMsg = error[`delete_owner_${id}`] || '删除所有者失败';
      showToast?.('error', errorMsg);
    }
    return success;
  }, [deleteOwner, loadOwners, showToast, error, activeFilter]);

  const handleCutReminder = useCallback((reminder: ReminderResponse) => {
    setClipboard({ action: 'cut', reminder });
    showToast?.('info', '已剪切');
  }, [showToast]);

  const handleCopyReminder = useCallback((reminder: ReminderResponse) => {
    setClipboard({ action: 'copy', reminder });
    showToast?.('info', '已复制');
  }, [showToast]);

  const handlePasteReminder = useCallback(async (targetListId: string | null) => {
    if (!clipboard) return;
    
    const newReminderData: Parameters<typeof handleCreateReminder>[0] = {
      title: clipboard.reminder.title,
      description: clipboard.reminder.description,
      url: clipboard.reminder.url,
      end_date: clipboard.reminder.end_date,
      end_time: clipboard.reminder.end_time,
      list_id: targetListId ?? clipboard.reminder.list_id,
      owner_id: clipboard.reminder.owner_id,
      is_all_day: clipboard.reminder.is_all_day,
      is_flagged: clipboard.reminder.is_flagged,
      priority: clipboard.reminder.priority,
      recurrence_frequency: clipboard.reminder.recurrence_frequency,
      recurrence_interval: clipboard.reminder.recurrence_interval,
      custom_recurrence_unit: clipboard.reminder.custom_recurrence_unit,
      recurrence_end_date: clipboard.reminder.recurrence_end_date,
      remind_before_value: clipboard.reminder.remind_before_value,
      remind_before_unit: clipboard.reminder.remind_before_unit,
      tags: clipboard.reminder.tags?.map(t => t.name) ?? [],
    };
    
    const result = await createReminder(newReminderData);
    if (result.data) {
      if (clipboard.action === 'cut') {
        await deleteReminder(clipboard.reminder.id);
        showToast?.('success', '提醒已移动');
      } else {
        showToast?.('success', '提醒已粘贴');
      }
      await syncAfterMutation();
      await loadTags();
    } else {
      showToast?.('error', result.error || '粘贴提醒失败');
    }
    
    setClipboard(null);
    return result.data;
  }, [clipboard, createReminder, deleteReminder, syncAfterMutation, showToast, loadTags]);

  const patchSubtasksInCaches = useCallback((
    reminderId: string,
    updater: (subs: SubtaskResponse[]) => SubtaskResponse[],
  ) => {
    const patchList = (list: ReminderResponse[]) =>
      list.map(r =>
        r.id === reminderId ? { ...r, subtasks: updater(r.subtasks ?? []) } : r,
      );
    setReminders(prev => patchList(prev));
    setCache(prev => {
      const next: ReminderCache = { ...prev };
      for (const key of Object.keys(next)) {
        next[key] = { ...next[key], data: patchList(next[key].data) };
      }
      return next;
    });
  }, []);

  const handleCreateSubtask = useCallback(async (reminderId: string, title: string) => {
    const result = await createSubtask({ reminder_id: reminderId, title });
    if (result) {
      patchSubtasksInCaches(reminderId, subs => [...subs, result]);
    } else {
      showToast?.('error', '添加子任务失败');
    }
    return result;
  }, [createSubtask, patchSubtasksInCaches, showToast]);

  const handleUpdateSubtask = useCallback(async (
    id: string,
    patch: { title?: string; is_completed?: boolean },
  ) => {
    const result = await updateSubtask({ id, ...patch });
    if (result) {
      patchSubtasksInCaches(result.reminder_id, subs =>
        subs.map(s => (s.id === id ? result : s)),
      );
    } else {
      showToast?.('error', '更新子任务失败');
    }
    return result;
  }, [updateSubtask, patchSubtasksInCaches, showToast]);

  const handleDeleteSubtask = useCallback(async (id: string) => {
    let reminderId: string | null = null;
    for (const r of reminders) {
      if ((r.subtasks ?? []).some(s => s.id === id)) {
        reminderId = r.id;
        break;
      }
    }
    if (!reminderId) {
      for (const entry of Object.values(cacheRef.current)) {
        const found = entry.data.find(r => (r.subtasks ?? []).some(s => s.id === id));
        if (found) {
          reminderId = found.id;
          break;
        }
      }
    }
    const ok = await deleteSubtask(id);
    if (ok && reminderId) {
      patchSubtasksInCaches(reminderId, subs => subs.filter(s => s.id !== id));
    } else if (!ok) {
      showToast?.('error', '删除子任务失败');
    }
    return ok;
  }, [deleteSubtask, reminders, patchSubtasksInCaches, showToast]);

  /** 强制刷新列表、所有者与提醒（all + 当前过滤器） */
  const refreshData = useCallback(async () => {
    await loadLists();
    await loadOwners();
    await loadTags();
    await loadReminders('all', true, true);
    if (activeFilter !== 'all') {
      await loadReminders(activeFilter, true);
    } else {
      await loadReminders('all', true);
    }
  }, [loadLists, loadOwners, loadTags, loadReminders, activeFilter]);

  /** 基于全量数据计算各过滤器计数，避免用当前过滤器数据误算 */
  const filterCounts = useMemo(() => {
    const incomplete = allReminders.filter(r => !r.is_completed);
    const tagCountMap = new Map<string, number>();
    for (const r of incomplete) {
      for (const t of r.tags ?? []) {
        tagCountMap.set(t.name, (tagCountMap.get(t.name) ?? 0) + 1);
      }
    }
    return {
      all: allReminders.length,
      today: allReminders.filter(isDueToday).length,
      planned: allReminders.filter(isPlanned).length,
      overdue: allReminders.filter(isOverdue).length,
      completed: allReminders.filter(r => r.is_completed).length,
      urgent: incomplete.filter(r => r.priority === 'high').length,
      flagged: incomplete.filter(r => r.is_flagged).length,
      lists: lists.map(list => ({
        id: list.id,
        count: incomplete.filter(r => r.list_id === list.id).length,
      })),
      owners: owners.map(owner => ({
        id: owner.id,
        count: incomplete.filter(r => r.owner_id === owner.id).length,
      })),
      tags: tags.map(tag => ({
        name: tag.name,
        count: tagCountMap.get(tag.name) ?? 0,
      })),
    };
  }, [allReminders, lists, owners, tags]);

  const isInitialLoading = 
    (activeFilterLoaded === false || allDataLoaded === false) && reminders.length === 0;

  const isCalendarLoading = !allDataLoaded;

  return {
    reminders,
    allReminders,
    lists,
    owners,
    tags,
    activeFilter,
    searchQuery,
    clipboard,
    isLoading,
    isInitialLoading,
    isCalendarLoading,
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
    handleCreateSubtask,
    handleUpdateSubtask,
    handleDeleteSubtask,
    refreshData,
  };
}
