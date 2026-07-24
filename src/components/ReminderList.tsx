import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { ReminderResponse, ListResponse, OwnerResponse } from '@/types/api';
import { buildUpdates } from '@/utils/reminderUpdates';
import { useVirtualList } from '@/hooks/useVirtualList';
import { ReminderItem } from './ReminderItem';

interface ReminderListProps {
  reminders: ReminderResponse[];
  lists: ListResponse[];
  owners: OwnerResponse[];
  activeFilter: string;
  searchQuery?: string;
  onToggleCompleted: (id: string) => void;
  onUpdateReminder: (id: string, updates: Partial<ReminderResponse>) => void;
  onDeleteReminder: (id: string) => void;
  onCreateReminder: () => void;
  onEditStart: () => void;
  onEditEnd: () => void;
  onCut: (reminder: ReminderResponse) => void;
  onCopy: (reminder: ReminderResponse) => void;
  onPaste: (listId: string | null) => void;
  canPaste: boolean;
  showToast?: (type: 'success' | 'error' | 'info', message: string) => void;
}

function isEventInsideEditingUi(e: MouseEvent): boolean {
  const path = typeof e.composedPath === 'function' ? e.composedPath() : [];
  for (const node of path) {
    if (!(node instanceof HTMLElement)) continue;
    if (
      node.classList.contains('reminder-item-editing') ||
      node.classList.contains('reminder-edit-dropdown') ||
      node.classList.contains('date-picker-chip') ||
      node.classList.contains('time-picker-chip')
    ) {
      return true;
    }
  }

  const target = e.target;
  if (target instanceof Element) {
    return Boolean(
      target.closest('.reminder-item-editing') ||
      target.closest('.reminder-edit-dropdown') ||
      target.closest('.date-picker-chip') ||
      target.closest('.time-picker-chip')
    );
  }
  return false;
}

export function ReminderList({
  reminders,
  lists,
  owners,
  activeFilter,
  searchQuery = '',
  onToggleCompleted,
  onUpdateReminder,
  onDeleteReminder,
  onCreateReminder,
  onEditStart,
  onEditEnd,
  onCut,
  onCopy,
  onPaste,
  canPaste,
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
      overdue: '已逾期',
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
  const visibleReminders = useMemo(
    () =>
      reminders.filter(r => isCompletedFilter || showCompleted || !r.is_completed),
    [reminders, isCompletedFilter, showCompleted],
  );

  const { containerRef, shouldVirtualize, start, end, offsetY, totalHeight } = useVirtualList(
    visibleReminders.length,
    editingId === null,
  );
  const renderedReminders = shouldVirtualize
    ? visibleReminders.slice(start, end)
    : visibleReminders;

  const commitEditing = useCallback((id: string | null) => {
    if (!id) return;
    const reminder = remindersRef.current.find(r => r.id === id);
    if (reminder) {
      const updates = buildUpdates(reminder, editingValuesRef.current);
      if (Object.keys(updates).length > 0) {
        onUpdateReminderRef.current(id, updates);
      }
    }
    editingValuesRef.current = {};
  }, []);

  const handleStartEditing = useCallback((id: string) => {
    const prev = editingIdRef.current;
    if (prev && prev !== id) {
      commitEditing(prev);
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
    setEditingId(null);
    editingValuesRef.current = {};
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

      commitEditing(editingIdRef.current);
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
  }, [editingId, handleCancelEditing, commitEditing]);

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

      <div ref={containerRef} className="flex-1 overflow-y-auto px-6 pb-24">
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
        ) : (
          <div
            className="relative"
            style={shouldVirtualize ? { height: totalHeight } : undefined}
          >
            <div
              className="space-y-1"
              style={shouldVirtualize ? { transform: `translateY(${offsetY}px)` } : undefined}
            >
              {renderedReminders.map((reminder, index) => {
                const absoluteIndex = shouldVirtualize ? start + index : index;
                return (
                  <div
                    key={reminder.id}
                    className="animate-fade-in-up"
                    style={
                      shouldVirtualize
                        ? undefined
                        : { animationDelay: `${Math.min(absoluteIndex, 20) * 30}ms` }
                    }
                  >
                    <ReminderItem
                      reminder={reminder}
                      lists={lists}
                      owners={owners}
                      isEditing={editingId === reminder.id}
                      onToggleCompleted={onToggleCompleted}
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
                  showToast={showToast}
                />
                  </div>
                );
              })}
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
