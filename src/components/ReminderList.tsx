import { useState, useRef, useEffect, useCallback } from 'react';
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
  
  const completedCount = reminders.filter(r => r.is_completed).length;
  
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
    <main className="flex-1 h-full flex flex-col bg-white">
      <div className="flex items-start justify-between px-6 pt-6 pb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{getTitle()}</h1>
          {completedCount > 0 && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-apple-gray">{completedCount}项已完成</span>
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className={`text-sm font-medium cursor-pointer transition-colors ${
                  showCompleted ? 'text-apple-blue hover:text-blue-600' : 'text-apple-orange hover:text-orange-600'
                }`}
              >
                {showCompleted ? '隐藏' : '显示'}
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-apple-orange tracking-tight">{reminders.length}</span>
          <button
            onClick={onCreateReminder}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100/80 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {reminders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-apple-gray">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <line x1="9" y1="3" x2="9" y2="21"/>
              <line x1="15" y1="3" x2="15" y2="21"/>
            </svg>
            <span className="mt-4 text-base">没有提醒事项</span>
          </div>
        ) : (
          reminders
            .filter(r => showCompleted || !r.is_completed)
            .map((reminder) => (
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
          ))
        )}
      </div>
    </main>
  );
}