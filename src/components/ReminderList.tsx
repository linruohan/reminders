import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { ReminderResponse, ListResponse, OwnerResponse } from '@/types/api';
import { ReminderItem } from './ReminderItem';

interface ReminderListProps {
  reminders: ReminderResponse[];
  lists: ListResponse[];
  owners: OwnerResponse[];
  activeFilter: string;
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
}

export function ReminderList({
  reminders,
  lists,
  owners,
  activeFilter,
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
}: ReminderListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const editingValuesRef = useRef<Partial<ReminderResponse>>({});
  const remindersRef = useRef(reminders);
  const onUpdateReminderRef = useRef(onUpdateReminder);

  useEffect(() => {
    remindersRef.current = reminders;
  }, [reminders]);

  useEffect(() => {
    onUpdateReminderRef.current = onUpdateReminder;
  }, [onUpdateReminder]);

  useEffect(() => {
    if (editingId !== null) {
      onEditStart();
    } else {
      onEditEnd();
    }
  }, [editingId, onEditStart, onEditEnd]);
  
  const getTitle = () => {
    if (activeFilter.startsWith('list:')) {
      const listId = activeFilter.split(':')[1];
      return lists.find(l => l.id === listId)?.name || '提醒事项';
    }
    const filterMap: Record<string, string> = {
      today: '今天',
      planned: '计划',
      overdue: '已逾期',
      all: '全部',
      completed: '已完成',
    };
    return filterMap[activeFilter] || '全部';
  };
  
  // 使用 useMemo 缓存 completedCount 计算，避免每次渲染都重新计算
  const completedCount = useMemo(() => reminders.filter(r => r.is_completed).length, [reminders]);
  
  const handleStartEditing = useCallback((id: string) => {
    setEditingId(id);
    editingValuesRef.current = {};
  }, []);

  const handleChangeEditing = useCallback((updates: Partial<ReminderResponse>) => {
    editingValuesRef.current = updates;
  }, []);

  const handleSaveAndStopEditing = useCallback((id: string, updates: Partial<ReminderResponse>) => {
    onUpdateReminder(id, updates);
    setEditingId(null);
    editingValuesRef.current = {};
  }, [onUpdateReminder]);

  const handleCancelEditing = useCallback(() => {
    setEditingId(null);
    editingValuesRef.current = {};
  }, []);
  
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isInsideReminderItem = target.closest('.reminder-item');
      const isInsideDatePicker = target.closest('.date-picker-chip');
      const isInsideTimePicker = target.closest('.time-picker-chip');
      if (!isInsideReminderItem && !isInsideDatePicker && !isInsideTimePicker) {
        const currentEditingId = editingId;
        if (currentEditingId) {
          const currentValues = editingValuesRef.current;
          const currentReminders = remindersRef.current;
          const currentUpdateFn = onUpdateReminderRef.current;

          const reminder = currentReminders.find(r => r.id === currentEditingId);
          if (reminder) {
            const updates: Partial<ReminderResponse> = {};
            if (currentValues.title !== undefined && currentValues.title !== reminder.title) {
              updates.title = currentValues.title;
            }
            if (currentValues.description !== reminder.description) {
              updates.description = currentValues.description ?? null;
            }
            if (currentValues.due_date !== reminder.due_date) {
              updates.due_date = currentValues.due_date ?? null;
            }
            if (currentValues.due_time !== reminder.due_time) {
              updates.due_time = currentValues.due_time ?? null;
            }
            if (Object.keys(updates).length > 0) {
              currentUpdateFn(currentEditingId, updates);
            }
          }
        }
        setEditingId(null);
        editingValuesRef.current = {};
      }
    };
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancelEditing();
      }
    };
    
    if (editingId) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [editingId, handleCancelEditing]);
  
  return (
    <main className="flex-1 h-full flex flex-col relative">
      <div className="flex items-start justify-between px-8 pt-6 pb-5">
        <div>
          <h1 className="text-32 font-bold text-gray-900 tracking-tight text-title">{getTitle()}</h1>
          {completedCount > 0 && (
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
          <span className="text-36 font-bold text-apple-orange tracking-tight">{reminders.length}</span>
          <span className="text-sm text-apple-gray mt-2">项</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto px-6 pb-24">
          {reminders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-apple-gray">
              <div className="w-16 h-16 rounded-[24px] bg-[#F2F2F7] flex items-center justify-center mb-4">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <line x1="9" y1="3" x2="9" y2="21"/>
                  <line x1="15" y1="3" x2="15" y2="21"/>
                </svg>
              </div>
              <span className="text-base font-medium">没有提醒事项</span>
            </div>
          ) : (
            <div className="space-y-1">
              {reminders
                .filter(r => showCompleted || !r.is_completed)
                .map((reminder, index) => (
              <div key={reminder.id} className="animate-fade-in-up" style={{ animationDelay: `${index * 30}ms` }}>
                <ReminderItem
                  key={reminder.id}
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
                />
              </div>
                ))}
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
