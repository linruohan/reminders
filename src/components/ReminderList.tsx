import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { ReminderResponse, ListResponse, OwnerResponse, SubtaskHandlers, TagResponse } from '@/types/api';
import { buildUpdates } from '@/utils/reminderUpdates';
import { validateReminderFields } from '@/utils/reminderForm';
import { formatDate } from '@/utils/dateUtils';
import { isOverdue } from '@/utils/reminderDates';
import { useVirtualList } from '@/hooks/useVirtualList';
import { ReminderItem } from './ReminderItem';

type VisibleEntry = { reminder: ReminderResponse; depth: number };
type DateGroup = { date: string; label: string; entries: VisibleEntry[] };

interface ReminderListProps {
  reminders: ReminderResponse[];
  lists: ListResponse[];
  owners: OwnerResponse[];
  knownTags: TagResponse[];
  activeFilter: string;
  searchQuery?: string;
  onToggleCompleted: (id: string) => void;
  onUpdateReminder: (id: string, updates: Partial<ReminderResponse>) => void;
  onDeleteReminder: (id: string) => void;
  onCreateReminder: () => void;
  onAddChildReminder?: (parent: {
    id: string;
    title: string;
    listId: string | null;
    endDate: string | null;
    endTime: string | null;
    isAllDay: boolean;
  }) => void;
  onEditStart: () => void;
  onEditEnd: () => void;
  onCut: (reminder: ReminderResponse) => void;
  onCopy: (reminder: ReminderResponse) => void;
  onPaste: (listId: string | null) => void;
  canPaste: boolean;
  subtaskHandlers: SubtaskHandlers;
  showToast?: (type: 'success' | 'error' | 'info', message: string) => void;
}

function isEventInsideEditingUi(e: MouseEvent): boolean {
  const el = e.target instanceof Element
    ? e.target
    : e.target instanceof Node
      ? e.target.parentElement
      : null;
  return Boolean(el?.closest('.reminder-item-editing, .reminder-edit-dropdown'));
}

export function ReminderList({
  reminders,
  lists,
  owners,
  knownTags,
  activeFilter,
  searchQuery = '',
  onToggleCompleted,
  onUpdateReminder,
  onDeleteReminder,
  onCreateReminder,
  onAddChildReminder,
  onEditStart,
  onEditEnd,
  onCut,
  onCopy,
  onPaste,
  canPaste,
  subtaskHandlers,
  showToast,
}: ReminderListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const editingValuesRef = useRef<Partial<ReminderResponse>>({});
  const remindersRef = useRef(reminders);
  const onUpdateReminderRef = useRef(onUpdateReminder);
  const editingIdRef = useRef(editingId);
  const onEditStartRef = useRef(onEditStart);
  const onEditEndRef = useRef(onEditEnd);

  editingIdRef.current = editingId;
  onEditStartRef.current = onEditStart;
  onEditEndRef.current = onEditEnd;

  useEffect(() => {
    remindersRef.current = reminders;
  }, [reminders]);

  useEffect(() => {
    onUpdateReminderRef.current = onUpdateReminder;
  }, [onUpdateReminder]);

  useEffect(() => {
    if (editingId !== null) {
      onEditStartRef.current();
    } else {
      onEditEndRef.current();
    }
  }, [editingId]);

  const getTitle = () => {
    if (activeFilter.startsWith('list:')) {
      const listId = activeFilter.slice('list:'.length);
      return lists.find(l => l.id === listId)?.name || '提醒事项';
    }
    if (activeFilter.startsWith('owner:')) {
      const ownerId = activeFilter.slice('owner:'.length);
      return owners.find(o => o.id === ownerId)?.name || '负责人';
    }
    if (activeFilter.startsWith('tag:')) {
      return `#${decodeURIComponent(activeFilter.slice('tag:'.length))}`;
    }
    const filterMap: Record<string, string> = {
      today: '今天',
      planned: '计划',
      all: '全部',
      flagged: '旗标',
      urgent: '紧急',
      completed: '完成',
    };
    return filterMap[activeFilter] || '全部';
  };

  const completedCount = useMemo(() => reminders.filter(r => r.is_completed).length, [reminders]);
  /** 「完成」筛选本身全是已完成项，不能再被「隐藏已完成」滤掉 */
  const isCompletedFilter = activeFilter === 'completed';
  const visibleReminders = useMemo(() => {
    const filtered = reminders.filter(r => isCompletedFilter || showCompleted || !r.is_completed);
    const ids = new Set(filtered.map(r => r.id));
    const children = new Map<string, ReminderResponse[]>();
    const roots: ReminderResponse[] = [];
    for (const r of filtered) {
      if (r.parent_id && ids.has(r.parent_id)) {
        const list = children.get(r.parent_id) ?? [];
        list.push(r);
        children.set(r.parent_id, list);
      } else {
        roots.push(r);
      }
    }
    const ordered: VisibleEntry[] = [];
    const walk = (r: ReminderResponse, depth: number) => {
      ordered.push({ reminder: r, depth });
      for (const c of children.get(r.id) ?? []) walk(c, depth + 1);
    };
    for (const r of roots) walk(r, 0);
    return ordered;
  }, [reminders, isCompletedFilter, showCompleted]);

  /** 今天视图：按根任务拆成已过期 / 未过期两组 */
  const todayGroups = useMemo(() => {
    if (activeFilter !== 'today') return null;
    const overdue: VisibleEntry[] = [];
    const due: VisibleEntry[] = [];
    let bucket = due;
    for (const entry of visibleReminders) {
      if (entry.depth === 0) {
        bucket = isOverdue(entry.reminder) ? overdue : due;
      }
      bucket.push(entry);
    }
    return { overdue, due };
  }, [activeFilter, visibleReminders]);

  /** 计划视图：按截止日期分组，仅显示有提醒的日期 */
  const plannedGroups = useMemo((): DateGroup[] | null => {
    if (activeFilter !== 'planned') return null;
    const map = new Map<string, VisibleEntry[]>();
    let currentDate: string | null = null;
    for (const entry of visibleReminders) {
      if (entry.depth === 0) {
        currentDate = entry.reminder.end_date;
        if (!currentDate) continue;
        if (!map.has(currentDate)) map.set(currentDate, []);
      }
      if (!currentDate) continue;
      map.get(currentDate)?.push(entry);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, entries]) => ({
        date,
        label: formatDate(date),
        entries,
      }));
  }, [activeFilter, visibleReminders]);

  const useGroupedList = todayGroups !== null || plannedGroups !== null;
  const { containerRef, shouldVirtualize, start, end, offsetY, totalHeight } = useVirtualList(
    visibleReminders.length,
    editingId === null && !useGroupedList,
  );
  const renderedReminders = shouldVirtualize
    ? visibleReminders.slice(start, end)
    : visibleReminders;

  /** 提交当前编辑草稿；校验失败返回 false 并保持编辑态 */
  const commitEditing = useCallback((id: string | null): boolean => {
    if (!id) return true;
    const reminder = remindersRef.current.find(r => r.id === id);
    if (reminder) {
      const draft = editingValuesRef.current;
      const fieldError = validateReminderFields({
        title: draft.title ?? reminder.title,
        url: draft.url ?? reminder.url,
      });
      if (fieldError) {
        showToast?.('error', fieldError);
        return false;
      }
      const updates = buildUpdates(reminder, {
        ...draft,
        title: (draft.title ?? reminder.title).trim(),
      });
      if (Object.keys(updates).length > 0) {
        onUpdateReminderRef.current(id, updates);
      }
    }
    editingValuesRef.current = {};
    return true;
  }, [showToast]);

  const commitEditingRef = useRef(commitEditing);
  commitEditingRef.current = commitEditing;

  const handleStartEditing = useCallback((id: string) => {
    const prev = editingIdRef.current;
    if (prev && prev !== id) {
      if (!commitEditing(prev)) return;
    }
    setEditingId(id);
    editingValuesRef.current = {};
  }, [commitEditing]);

  const handleChangeEditing = useCallback((updates: Partial<ReminderResponse>) => {
    editingValuesRef.current = updates;
  }, []);

  const handleSaveAndStopEditing = useCallback((id: string, updates: Partial<ReminderResponse>) => {
    if (Object.keys(updates).length > 0) {
      onUpdateReminder(id, updates);
    }
    setEditingId(null);
    editingValuesRef.current = {};
  }, [onUpdateReminder]);

  const handleCancelEditing = useCallback(() => {
    editingIdRef.current = null;
    setEditingId(null);
    editingValuesRef.current = {};
  }, []);

  /** 完成勾选时丢弃编辑草稿，避免与完成/重复生成抢写截止时间 */
  const handleToggleCompleted = useCallback((id: string) => {
    if (editingIdRef.current === id) {
      editingIdRef.current = null;
      setEditingId(null);
      editingValuesRef.current = {};
    }
    onToggleCompleted(id);
  }, [onToggleCompleted]);

  const handleAddChildReminder = useCallback((parent: ReminderResponse) => {
    const id = editingIdRef.current;
    if (id) {
      if (!commitEditing(id)) return;
      setEditingId(null);
    }
    onAddChildReminder?.({
      id: parent.id,
      title: parent.title,
      listId: parent.list_id,
      endDate: parent.end_date,
      endTime: parent.end_time,
      isAllDay: parent.is_all_day ?? false,
    });
  }, [commitEditing, onAddChildReminder]);

  // 切换筛选时提交草稿，避免丢失修改并卡住 isEditing
  const prevFilterRef = useRef(activeFilter);
  useEffect(() => {
    if (prevFilterRef.current === activeFilter) return;
    prevFilterRef.current = activeFilter;
    const id = editingIdRef.current;
    if (!id) return;
    commitEditingRef.current(id);
    setEditingId(null);
  }, [activeFilter]);

  // 勾选完成后项从当前视图消失时，清掉编辑态，避免卸载后又用旧草稿写回截止时间
  useEffect(() => {
    if (!editingId) return;
    if (reminders.some(r => r.id === editingId)) return;
    setEditingId(null);
    editingValuesRef.current = {};
  }, [reminders, editingId]);

  // 仅在真正卸载（如切到日历）时提交草稿，不用依赖 commitEditing 以免误触发
  useEffect(() => {
    return () => {
      const id = editingIdRef.current;
      if (id) {
        commitEditingRef.current(id);
      }
    };
  }, []);

  useEffect(() => {
    if (!editingId) return;

    // 用 click（而非 mousedown）：等选项 onClick 先更新草稿，再判断是否点在外面
    // 跳过进入编辑的那一次点击，避免立刻退出
    let armed = false;
    const armTimer = window.setTimeout(() => {
      armed = true;
    }, 0);

    const handleClickOutside = (e: MouseEvent) => {
      if (!armed) return;
      if (isEventInsideEditingUi(e)) return;

      if (!commitEditingRef.current(editingIdRef.current)) return;
      setEditingId(null);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancelEditing();
      }
    };

    document.addEventListener('click', handleClickOutside, true);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.clearTimeout(armTimer);
      document.removeEventListener('click', handleClickOutside, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [editingId, handleCancelEditing]);

  // 底部行进入编辑后，滚动列表使编辑区完整可见
  useEffect(() => {
    if (!editingId) return;
    const timer = window.setTimeout(() => {
      const container = containerRef.current;
      const editingEl = container?.querySelector('.reminder-item-editing');
      if (!container || !(editingEl instanceof HTMLElement)) return;
      const cRect = container.getBoundingClientRect();
      const eRect = editingEl.getBoundingClientRect();
      const bottomGap = 96; // 预留 FAB / 边距
      if (eRect.bottom > cRect.bottom - bottomGap) {
        container.scrollBy({
          top: eRect.bottom - cRect.bottom + bottomGap,
          behavior: 'smooth',
        });
      } else if (eRect.top < cRect.top + 8) {
        container.scrollBy({
          top: eRect.top - cRect.top - 8,
          behavior: 'smooth',
        });
      }
    }, 80);
    return () => window.clearTimeout(timer);
  }, [editingId, containerRef]);

  const renderReminderEntry = (entry: VisibleEntry, index: number, animate = true) => (
    <div
      key={entry.reminder.id}
      className={animate ? 'animate-fade-in-up' : undefined}
      style={{
        ...(animate ? { animationDelay: `${Math.min(index, 20) * 30}ms` } : {}),
        ...(entry.depth > 0 ? { paddingLeft: `${entry.depth * 24}px` } : {}),
      }}
    >
      <ReminderItem
        reminder={entry.reminder}
        lists={lists}
        owners={owners}
        knownTags={knownTags}
        isEditing={editingId === entry.reminder.id}
        onToggleCompleted={handleToggleCompleted}
        onDelete={onDeleteReminder}
        onStartEditing={handleStartEditing}
        onSaveAndStopEditing={handleSaveAndStopEditing}
        onCancelEditing={handleCancelEditing}
        onChange={handleChangeEditing}
        onUpdateReminder={onUpdateReminder}
        onCut={onCut}
        onCopy={onCopy}
        onPaste={onPaste}
        canPaste={canPaste}
        onAddChildReminder={handleAddChildReminder}
        subtaskHandlers={subtaskHandlers}
        showToast={showToast}
      />
    </div>
  );

  return (
    <main className="flex-1 h-full flex flex-col relative">
      <div className="flex items-start justify-between px-8 pt-6 pb-5">
        <div>
          <h1 className="text-32 font-bold text-gray-900 tracking-tight text-title">{getTitle()}</h1>
          {completedCount > 0 && !isCompletedFilter && (
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-sm text-apple-gray">{completedCount}项已完成</span>
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className={`text-sm font-semibold cursor-pointer transition-all duration-200 spring-transition ${
                  showCompleted ? 'text-apple-blue hover:text-[#0066CC]' : 'text-apple-orange hover:text-orange-600'
                }`}
              >
                {showCompleted ? '隐藏' : '显示'}
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-36 font-bold text-apple-orange tracking-tight">{visibleReminders.length}</span>
          <span className="text-sm text-apple-gray mt-2">项</span>
        </div>
      </div>

      <div
        ref={containerRef}
        className={`flex-1 overflow-y-auto px-6 ${editingId ? 'pb-72' : 'pb-24'}`}
      >
        {visibleReminders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-apple-gray">
            <div className="w-16 h-16 rounded-[24px] bg-[#F2F2F7] flex items-center justify-center mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="9" y1="3" x2="9" y2="21"/>
                <line x1="15" y1="3" x2="15" y2="21"/>
              </svg>
            </div>
            <span className="text-base font-medium">
              {searchQuery.trim()
                ? `未找到「${searchQuery.trim()}」相关提醒`
                : reminders.length > 0 && !isCompletedFilter
                  ? '没有未完成的提醒事项'
                  : '没有提醒事项'}
            </span>
          </div>
        ) : todayGroups ? (
          <div className="space-y-4">
            {todayGroups.overdue.length > 0 && (
              <fieldset className="m-0 min-w-0 rounded-[12px] border border-apple-divider px-2 pb-2 pt-0">
                <legend className="ml-1 px-1.5 text-[12px] font-medium leading-none text-apple-red">
                  已过期
                </legend>
                <div className="space-y-1">
                  {todayGroups.overdue.map((entry, index) => renderReminderEntry(entry, index))}
                </div>
              </fieldset>
            )}
            {todayGroups.due.length > 0 && (
              <div>
                <div className="px-1 mb-1.5 text-[12px] font-medium text-apple-gray">未过期</div>
                <div className="space-y-1">
                  {todayGroups.due.map((entry, index) => renderReminderEntry(entry, index))}
                </div>
              </div>
            )}
          </div>
        ) : plannedGroups ? (
          <div className="space-y-4">
            {plannedGroups.map((group) => (
              <div key={group.date}>
                <div className="px-1 mb-1.5 text-[13px] font-semibold text-gray-800">
                  {group.label}
                </div>
                <div className="space-y-1">
                  {group.entries.map((entry, index) => renderReminderEntry(entry, index))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            className="relative"
            style={shouldVirtualize ? { height: totalHeight } : undefined}
          >
            <div
              className="space-y-1"
              style={shouldVirtualize ? { transform: `translateY(${offsetY}px)` } : undefined}
            >
              {renderedReminders.map((entry, index) =>
                renderReminderEntry(entry, shouldVirtualize ? start + index : index, !shouldVirtualize),
              )}
            </div>
          </div>
        )}
      </div>

      <button
        onClick={onCreateReminder}
        className="absolute bottom-8 right-8 w-14 h-14 rounded-full flex items-center justify-center bg-apple-blue text-white hover:bg-[#0066CC] hover:brightness-105 transition-all duration-300 spring-transition shadow-[0_4px_16px_rgba(0,122,255,0.4)] hover:shadow-[0_6px_24px_rgba(0,122,255,0.5)] hover:scale-[1.05] active:scale-[0.95]"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
    </main>
  );
}
