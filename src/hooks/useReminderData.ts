import { useState, useEffect, useCallback, useMemo } from 'react';
import * as api from '@/api';
import type {
  ReminderResponse,
  ListResponse,
  OwnerResponse,
  TagResponse,
  CreateReminderRequest,
  SubtaskResponse,
  SubtaskHandlers,
} from '@/types/api';
import { getTodayStr } from '@/utils/dateUtils';
import { matchesFilter, matchesSearch } from '@/utils/reminderDates';
import { normalizeUpdateRequest } from '@/utils/normalizeUpdateRequest';

function maySpawnNext(r: ReminderResponse): boolean {
  return Boolean(r.is_completed && r.recurrence_frequency);
}

function mergeTagsInto(prev: TagResponse[], incoming: TagResponse[]): TagResponse[] {
  if (incoming.length === 0) return prev;
  const byId = new Map(prev.map(t => [t.id, t]));
  let changed = false;
  for (const t of incoming) {
    const existing = byId.get(t.id);
    if (!existing || existing.name !== t.name) {
      byId.set(t.id, t);
      changed = true;
    }
  }
  if (!changed) return prev;
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'zh'));
}

export function useReminderData(showToast?: (type: 'success' | 'error' | 'info', message: string) => void) {
  const [allReminders, setAllReminders] = useState<ReminderResponse[]>([]);
  const [lists, setLists] = useState<ListResponse[]>([]);
  const [owners, setOwners] = useState<OwnerResponse[]>([]);
  const [tags, setTags] = useState<TagResponse[]>([]);
  const [activeFilter, setActiveFilter] = useState('today');
  const [allDataLoaded, setAllDataLoaded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [clipboard, setClipboard] = useState<{ action: 'cut' | 'copy'; reminder: ReminderResponse } | null>(null);
  const [dayKey, setDayKey] = useState(getTodayStr);

  const upsertReminder = useCallback((reminder: ReminderResponse) => {
    setAllReminders(prev => {
      const idx = prev.findIndex(r => r.id === reminder.id);
      if (idx >= 0) {
        return prev.map((r, i) =>
          i === idx ? { ...reminder, subtasks: reminder.subtasks ?? r.subtasks } : r,
        );
      }
      return [reminder, ...prev];
    });
  }, []);

  const removeReminder = useCallback((id: string) => {
    setAllReminders(prev => {
      const drop = new Set<string>([id]);
      let grew = true;
      while (grew) {
        grew = false;
        for (const r of prev) {
          if (r.parent_id && drop.has(r.parent_id) && !drop.has(r.id)) {
            drop.add(r.id);
            grew = true;
          }
        }
      }
      return prev.filter(r => !drop.has(r.id));
    });
  }, []);

  const loadAllReminders = useCallback(async () => {
    const data = await api.getAllReminders();
    if (data) {
      setAllReminders(data);
    } else {
      showToast?.('error', '加载提醒失败');
    }
    setAllDataLoaded(true);
  }, [showToast]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const loadLists = useCallback(async () => {
    const data = await api.getLists();
    if (data) setLists(data);
  }, []);

  const loadOwners = useCallback(async () => {
    const data = await api.getOwners();
    if (data) setOwners(data);
  }, []);

  const loadTags = useCallback(async () => {
    const data = await api.getAllTags();
    if (data) setTags(data);
  }, []);

  useEffect(() => {
    void Promise.all([loadLists(), loadOwners(), loadTags(), loadAllReminders()]);
  }, [loadLists, loadOwners, loadTags, loadAllReminders]);

  const handleFilterChange = useCallback((filter: string) => {
    setActiveFilter(filter);
  }, []);

  const handleToggleCompleted = useCallback(async (id: string) => {
    const result = await api.toggleReminderCompleted(id);
    if (result) {
      upsertReminder(result);
      if (maySpawnNext(result)) {
        await loadAllReminders();
      }
    } else {
      showToast?.('error', '更新提醒状态失败');
    }
  }, [upsertReminder, loadAllReminders, showToast]);

  const handleUpdateReminder = useCallback(async (id: string, updates: Partial<ReminderResponse>) => {
    const request = normalizeUpdateRequest(id, updates);
    const result = await api.updateReminder(request);
    if (result) {
      upsertReminder(result);
      if (updates.tags) {
        setTags(prev => mergeTagsInto(prev, result.tags ?? []));
      }
      if (maySpawnNext(result)) {
        await loadAllReminders();
      }
    } else {
      showToast?.('error', '更新提醒失败');
    }
  }, [upsertReminder, loadAllReminders, showToast]);

  const handleAddList = useCallback(async (name: string, icon?: string, color?: string) => {
    const result = await api.createList({ name, icon: icon || 'list', color });
    if (result) {
      setLists(prev => [...prev, result].sort((a, b) => a.name.localeCompare(b.name, 'zh')));
    }
    return result;
  }, []);

  const handleDeleteReminder = useCallback(async (id: string) => {
    const success = await api.deleteReminder(id);
    if (success) {
      removeReminder(id);
      showToast?.('success', '提醒已删除');
    } else {
      showToast?.('error', '删除提醒失败');
    }
    return success;
  }, [removeReminder, showToast]);

  const handleCreateReminder = useCallback(async (data: CreateReminderRequest) => {
    const result = await api.createReminder(data);
    if (result.data) {
      const created = result.data;
      upsertReminder(created);
      if (created.tags.length > 0) {
        setTags(prev => mergeTagsInto(prev, created.tags));
      }
    }
    return result;
  }, [upsertReminder]);

  const handleDeleteList = useCallback(async (id: string) => {
    const success = await api.deleteList(id);
    if (success) {
      setLists(prev => prev.filter(l => l.id !== id));
      setAllReminders(prev => prev.map(r => (r.list_id === id ? { ...r, list_id: null } : r)));
      if (activeFilter === `list:${id}`) {
        setActiveFilter('today');
      }
    } else {
      showToast?.('error', '删除列表失败');
    }
    return success;
  }, [activeFilter, showToast]);

  const handleUpdateList = useCallback(async (id: string, updates: Partial<ListResponse>) => {
    const result = await api.updateList({ id, ...updates });
    if (result) {
      setLists(prev => prev.map(l => (l.id === id ? result : l)));
    } else {
      showToast?.('error', '更新列表失败');
    }
    return result;
  }, [showToast]);

  const handleUpdateOwner = useCallback(async (id: string, updates: Partial<OwnerResponse>) => {
    const result = await api.updateOwner({ id, ...updates });
    if (result) {
      setOwners(prev => prev.map(o => (o.id === id ? result : o)));
    } else {
      showToast?.('error', '更新所有者失败');
    }
    return result;
  }, [showToast]);

  const handleAddOwner = useCallback(async (name: string) => {
    const result = await api.createOwner({ name });
    if (result) {
      setOwners(prev => [...prev, result].sort((a, b) => a.name.localeCompare(b.name, 'zh')));
    } else {
      showToast?.('error', '创建所有者失败');
    }
    return result;
  }, [showToast]);

  const handleDeleteOwner = useCallback(async (id: string) => {
    const success = await api.deleteOwner(id);
    if (success) {
      setOwners(prev => prev.filter(o => o.id !== id));
      setAllReminders(prev => prev.map(r => (r.owner_id === id ? { ...r, owner_id: null } : r)));
      if (activeFilter === `owner:${id}`) {
        setActiveFilter('today');
      }
    } else {
      showToast?.('error', '删除所有者失败');
    }
    return success;
  }, [showToast, activeFilter]);

  const handleRenameTag = useCallback(async (id: string, name: string) => {
    const result = await api.renameTag(id, name);
    if (result) {
      const oldTag = tags.find(t => t.id === id);
      setTags(prev => prev.map(t => (t.id === id ? result : t)));
      setAllReminders(prev =>
        prev.map(r => ({
          ...r,
          tags: (r.tags ?? []).map(t => (t.id === id ? result : t)),
        })),
      );
      if (oldTag && activeFilter === `tag:${encodeURIComponent(oldTag.name)}`) {
        setActiveFilter(`tag:${encodeURIComponent(result.name)}`);
      }
    } else {
      showToast?.('error', '重命名标签失败');
    }
    return result;
  }, [tags, activeFilter, showToast]);

  const handleDeleteTag = useCallback(async (id: string) => {
    const tag = tags.find(t => t.id === id);
    const success = await api.deleteTag(id);
    if (success) {
      setTags(prev => prev.filter(t => t.id !== id));
      setAllReminders(prev =>
        prev.map(r => ({
          ...r,
          tags: (r.tags ?? []).filter(t => t.id !== id),
        })),
      );
      if (tag && activeFilter === `tag:${encodeURIComponent(tag.name)}`) {
        setActiveFilter('today');
      }
    } else {
      showToast?.('error', '删除标签失败');
    }
    return success;
  }, [tags, activeFilter, showToast]);

  const patchSubtasks = useCallback((reminderId: string, fn: (subs: SubtaskResponse[]) => SubtaskResponse[]) => {
    setAllReminders(prev =>
      prev.map(r => (r.id === reminderId ? { ...r, subtasks: fn(r.subtasks ?? []) } : r)),
    );
  }, []);

  const createSubtask = useCallback(async (reminderId: string, title: string) => {
    const created = await api.createSubtask({ reminder_id: reminderId, title });
    if (created) patchSubtasks(reminderId, subs => [...subs, created]);
    return created;
  }, [patchSubtasks]);

  const updateSubtask = useCallback(async (id: string, patch: { title?: string; is_completed?: boolean }) => {
    const updated = await api.updateSubtask({ id, ...patch });
    if (updated) {
      patchSubtasks(updated.reminder_id, subs =>
        subs.map(s => (s.id === id ? updated : s)),
      );
    }
    return updated;
  }, [patchSubtasks]);

  const deleteSubtask = useCallback(async (id: string) => {
    const ok = await api.deleteSubtask(id);
    if (ok) {
      setAllReminders(prev =>
        prev.map(r =>
          r.subtasks?.some(s => s.id === id)
            ? { ...r, subtasks: r.subtasks.filter(s => s.id !== id) }
            : r,
        ),
      );
    }
    return ok;
  }, []);

  const subtaskHandlers = useMemo<SubtaskHandlers>(
    () => ({ create: createSubtask, update: updateSubtask, remove: deleteSubtask }),
    [createSubtask, updateSubtask, deleteSubtask],
  );

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

    const source = clipboard.reminder;
    const listId = targetListId ?? source.list_id;

    if (clipboard.action === 'cut') {
      const ids = new Set<string>([source.id]);
      let grew = true;
      while (grew) {
        grew = false;
        for (const r of allReminders) {
          if (r.parent_id && ids.has(r.parent_id) && !ids.has(r.id)) {
            ids.add(r.id);
            grew = true;
          }
        }
      }
      let failed = false;
      for (const id of ids) {
        const current = allReminders.find(r => r.id === id);
        if (current && current.list_id === listId) continue;
        const result = await api.updateReminder(normalizeUpdateRequest(id, { list_id: listId }));
        if (result) {
          upsertReminder(result);
        } else {
          failed = true;
        }
      }
      if (failed) {
        showToast?.('error', '移动提醒失败');
      } else {
        showToast?.('success', '提醒已移动');
      }
      setClipboard(null);
      return;
    }

    const result = await api.createReminder({
      title: source.title,
      description: source.description,
      url: source.url,
      end_date: source.end_date,
      end_time: source.end_time,
      list_id: listId,
      owner_id: source.owner_id,
      is_all_day: source.is_all_day,
      is_flagged: source.is_flagged,
      priority: source.priority,
      recurrence_frequency: source.recurrence_frequency,
      recurrence_interval: source.recurrence_interval,
      custom_recurrence_unit: source.custom_recurrence_unit,
      recurrence_end_date: source.recurrence_end_date,
      remind_before_value: source.remind_before_value,
      remind_before_unit: source.remind_before_unit,
      tags: source.tags?.map(t => t.name) ?? [],
      parent_id: source.parent_id,
    });
    if (result.data) {
      let created = result.data;
      const cloned: SubtaskResponse[] = [];
      for (const sub of source.subtasks ?? []) {
        const item = await api.createSubtask({ reminder_id: created.id, title: sub.title });
        if (!item) continue;
        let next = item;
        if (sub.is_completed) {
          next = await api.updateSubtask({ id: item.id, is_completed: true }) ?? item;
        }
        cloned.push(next);
      }
      if (cloned.length > 0) {
        created = { ...created, subtasks: cloned };
      }
      upsertReminder(created);
      showToast?.('success', '提醒已粘贴');
    } else {
      showToast?.('error', result.error || '粘贴提醒失败');
    }

    setClipboard(null);
    return result.data;
  }, [clipboard, allReminders, upsertReminder, showToast]);

  const refreshData = useCallback(() => {
    setDayKey(getTodayStr());
  }, []);

  const filterCounts = useMemo(() => {
    const today = dayKey;
    const listCount = new Map<string, number>();
    const ownerCount = new Map<string, number>();
    const tagCount = new Map<string, number>();
    let todayN = 0;
    let plannedN = 0;
    let completedN = 0;
    let urgentN = 0;
    let flaggedN = 0;

    for (const r of allReminders) {
      if (r.is_completed) {
        completedN++;
        continue;
      }
      if (r.end_date) {
        if (r.end_date <= today) todayN++;
        else plannedN++;
      }
      if (r.priority === 'high') urgentN++;
      if (r.is_flagged) flaggedN++;
      if (r.list_id) listCount.set(r.list_id, (listCount.get(r.list_id) ?? 0) + 1);
      if (r.owner_id) ownerCount.set(r.owner_id, (ownerCount.get(r.owner_id) ?? 0) + 1);
      for (const t of r.tags ?? []) {
        tagCount.set(t.name, (tagCount.get(t.name) ?? 0) + 1);
      }
    }

    return {
      all: allReminders.length,
      today: todayN,
      planned: plannedN,
      completed: completedN,
      urgent: urgentN,
      flagged: flaggedN,
      lists: lists.map(list => ({
        id: list.id,
        count: listCount.get(list.id) ?? 0,
      })),
      owners: owners.map(owner => ({
        id: owner.id,
        count: ownerCount.get(owner.id) ?? 0,
      })),
      tags: tags.map(tag => ({
        id: tag.id,
        name: tag.name,
        count: tagCount.get(tag.name) ?? 0,
      })),
    };
  }, [allReminders, lists, owners, tags, dayKey]);

  const viewReminders = useMemo(() => {
    const q = searchQuery.trim();
    if (q) return allReminders.filter(r => matchesSearch(r, q));
    return allReminders.filter(r => matchesFilter(r, activeFilter, dayKey));
  }, [searchQuery, allReminders, activeFilter, dayKey]);

  const isInitialLoading = !allDataLoaded && viewReminders.length === 0;
  const isCalendarLoading = !allDataLoaded;

  return {
    reminders: viewReminders,
    allReminders,
    lists,
    owners,
    tags,
    activeFilter,
    searchQuery,
    clipboard,
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
    handleRenameTag,
    handleDeleteTag,
    handleCutReminder,
    handleCopyReminder,
    handlePasteReminder,
    subtaskHandlers,
    refreshData,
  };
}
