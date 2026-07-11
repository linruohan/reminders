import { useState, useRef, useEffect, useCallback, memo } from 'react';
import type { ReminderResponse, ListResponse, OwnerResponse } from '@/types/api';
import { formatDate, formatTime, getDateColor } from '@/utils/dateUtils';
import { DatePickerChip } from './DatePickerChip';
import { TimePickerChip } from './TimePickerChip';
import { ReminderDetailModal } from './ReminderDetailModal';
import { ContextMenu } from './ContextMenu';

/**
 * 比较原始提醒与编辑值，生成需要更新的字段
 * 用于统一编辑保存与点击外部保存的逻辑，避免两处实现不一致
 */
function buildUpdates(
  reminder: ReminderResponse,
  values: Partial<ReminderResponse>,
): Partial<ReminderResponse> {
  const updates: Partial<ReminderResponse> = {};
  if (values.title !== undefined && values.title !== reminder.title) {
    updates.title = values.title;
  }
  if (values.description !== reminder.description) {
    updates.description = values.description ?? null;
  }
  if (values.due_date !== reminder.due_date) {
    updates.due_date = values.due_date ?? null;
  }
  if (values.due_time !== reminder.due_time) {
    updates.due_time = values.due_time ?? null;
  }
  return updates;
}

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
}

interface ReminderItemProps {
  reminder: ReminderResponse;
  lists: ListResponse[];
  owners: OwnerResponse[];
  isEditing: boolean;
  onToggleCompleted: (id: string) => void;
  onDelete: (id: string) => void;
  onStartEditing: (id: string) => void;
  onSaveAndStopEditing: (id: string, updates: Partial<ReminderResponse>) => void;
  onCancelEditing: () => void;
  onChange: (updates: Partial<ReminderResponse>) => void;
}

const ReminderItemViewMode = memo(function ReminderItemViewMode({ 
  reminder, 
  onToggleCompleted, 
  onStartEditing, 
  onShowDetail 
}: {
  reminder: ReminderResponse;
  onToggleCompleted: (id: string) => void;
  onStartEditing: (id: string) => void;
  onShowDetail: () => void;
}) {
  return (
    <div
      className={`reminder-item px-6 py-2.5 border-b border-apple-divider hover:bg-gray-50/60 transition-colors cursor-pointer group ${
        reminder.is_completed ? 'bg-gray-50/30' : 'bg-white'
      }`}
      onClick={() => onStartEditing(reminder.id)}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleCompleted(reminder.id);
          }}
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
            reminder.is_completed
              ? 'bg-apple-blue border-apple-blue shadow-[0_1px_3px_rgba(0,122,255,0.3)]'
              : 'border-apple-gray-dark hover:border-apple-blue'
          }`}
        >
          {reminder.is_completed && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          )}
        </button>
        
        <div className="flex-1 min-w-0">
          <div className={`text-base font-medium truncate ${
            reminder.is_completed
              ? 'text-apple-gray line-through'
              : 'text-gray-900'
          }`}>
            {reminder.title}
          </div>
          
          {(reminder.description || reminder.due_date || reminder.due_time) && (
            <div className="flex items-center gap-2 mt-1">
              {reminder.description && (
                <span className="text-xs text-apple-gray truncate max-w-[200px]">
                  {reminder.description}
                </span>
              )}
              {reminder.due_date && (
                <span className={`text-xs font-medium flex items-center gap-0.5 ${getDateColor(reminder.due_date)}`}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  {formatDate(reminder.due_date)}
                </span>
              )}
              {reminder.due_time && (
                <span className="text-xs font-medium text-apple-orange flex items-center gap-0.5">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                  {formatTime(reminder.due_time)}
                </span>
              )}
            </div>
          )}
        </div>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            onShowDetail();
          }}
          className="w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-gray-100 transition-all text-apple-gray"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
        </button>
      </div>
    </div>
  );
});

const ReminderItemEditMode = memo(function ReminderItemEditMode({
  reminder,
  lists,
  owners,
  onToggleCompleted,
  onSaveAndStopEditing,
  onCancelEditing,
  onChange
}: {
  reminder: ReminderResponse;
  lists: ListResponse[];
  owners: OwnerResponse[];
  onToggleCompleted: (id: string) => void;
  onSaveAndStopEditing: (id: string, updates: Partial<ReminderResponse>) => void;
  onCancelEditing: () => void;
  onChange: (updates: Partial<ReminderResponse>) => void;
}) {
  const [editTitle, setEditTitle] = useState(reminder.title);
  const [editNotes, setEditNotes] = useState(reminder.description || '');
  const [editDate, setEditDate] = useState(reminder.due_date || '');
  const [editTime, setEditTime] = useState(reminder.due_time || '');
  const [showDetail, setShowDetail] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onChange({
      title: editTitle,
      description: editNotes || null,
      due_date: editDate || null,
      due_time: editTime || null,
    });
  }, [editTitle, editNotes, editDate, editTime, onChange]);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }, 50);
    return () => clearTimeout(timer);
  }, []);
  
  const handleSave = useCallback(() => {
    const values: Partial<ReminderResponse> = {
      title: editTitle,
      description: editNotes || null,
      due_date: editDate || null,
      due_time: editTime || null,
    };
    const updates = buildUpdates(reminder, values);
    onSaveAndStopEditing(reminder.id, updates);
  }, [onSaveAndStopEditing, editTitle, editNotes, editDate, editTime, reminder]);
  
  const handleCancel = useCallback(() => {
    onCancelEditing();
  }, [onCancelEditing]);
  
  const handleDateChange = useCallback((value: string) => {
    setEditDate(value);
    if (!value) {
      setEditTime('');
    }
  }, []);
  
  const handleClearDate = useCallback(() => {
    setEditDate('');
    setEditTime('');
  }, []);
  
  const handleClearTime = useCallback(() => {
    setEditTime('');
  }, []);
  
  const handleTimeChange = useCallback((value: string) => {
    setEditTime(value);
  }, []);
  
  const handleDateRequired = useCallback(() => {
    if (!editDate) {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      setEditDate(todayStr);
    }
  }, [editDate]);
  
  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const chipBase =
    'inline-flex items-center gap-1.5 h-8 pl-2.5 pr-1.5 bg-[#F2F2F7] rounded-[10px] text-[13px] font-medium text-gray-900 hover:bg-[#E5E5EA] transition-colors cursor-pointer';

  return (
    <>
      <div 
        className={`reminder-item px-6 py-3 border-b border-apple-divider transition-all duration-200 animate-slide-down ${
          reminder.is_completed ? 'bg-gray-50/40' : 'bg-blue-50/60'
        }`}
        onClick={handleSave}
      >
        <div className="flex items-start gap-3" onClick={stopPropagation}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleCompleted(reminder.id);
            }}
            className={`w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
              reminder.is_completed
                ? 'bg-apple-blue border-apple-blue shadow-[0_1px_3px_rgba(0,122,255,0.3)]'
                : 'border-apple-gray-dark hover:border-apple-blue'
            }`}
          >
            {reminder.is_completed && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            )}
          </button>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <input
                  ref={titleInputRef}
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave();
                    if (e.key === 'Escape') handleCancel();
                  }}
                  className={`w-full text-[17px] font-semibold leading-snug bg-transparent border-none outline-none placeholder-apple-gray ${
                    reminder.is_completed ? 'text-apple-gray' : 'text-gray-900'
                  }`}
                  placeholder="新提醒事项"
                />
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') handleCancel();
                  }}
                  className="w-full mt-0.5 text-[13px] leading-snug text-apple-gray bg-transparent border-none outline-none placeholder-apple-gray"
                  placeholder="备注"
                />
              </div>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDetail(true);
                }}
                className="w-[22px] h-[22px] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-apple-blue text-white hover:bg-blue-600 transition-colors shadow-sm"
                aria-label="详情"
              >
                <span className="text-[12px] font-bold leading-none italic" style={{ fontFamily: 'Georgia, serif' }}>i</span>
              </button>
            </div>

            <div className="border-t border-apple-divider mt-2.5 mb-2.5" />
            
            <div className="flex items-center gap-2 flex-wrap" onClick={stopPropagation}>
              <DatePickerChip
                value={editDate || null}
                onChange={handleDateChange}
                onClear={handleClearDate}
              />
              
              <TimePickerChip
                value={editTime || null}
                onChange={handleTimeChange}
                onClear={handleClearTime}
                onDateRequired={handleDateRequired}
              />
              
              <div className={`${chipBase} cursor-default opacity-60`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-700 flex-shrink-0">
                  <polygon points="3 11 22 2 13 21 11 13 3 11"/>
                </svg>
                <span className="text-apple-gray pr-1">添加位置</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showDetail && (
        <ReminderDetailModal
          reminder={reminder}
          lists={lists}
          owners={owners}
          isOpen={showDetail}
          onClose={() => setShowDetail(false)}
          onDelete={() => { setShowDetail(false); onCancelEditing(); }}
          onToggleCompleted={() => onToggleCompleted(reminder.id)}
          onEdit={() => { setShowDetail(false); }}
        />
      )}
    </>
  );
});

const ReminderItem = memo(function ReminderItem({ 
  reminder, 
  lists, 
  owners,
  isEditing, 
  onToggleCompleted, 
  onDelete, 
  onStartEditing, 
  onSaveAndStopEditing, 
  onCancelEditing,
  onChange,
  onUpdateReminder
}: ReminderItemProps & { onUpdateReminder: (id: string, updates: Partial<ReminderResponse>) => void }) {
  const [showDetail, setShowDetail] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ isOpen: boolean; x: number; y: number }>({ isOpen: false, x: 0, y: 0 });

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ isOpen: true, x: e.clientX, y: e.clientY });
  };

  const handleCloseContextMenu = () => {
    setContextMenu({ isOpen: false, x: 0, y: 0 });
  };

  const handleSetPriority = (priority: string) => {
    onUpdateReminder(reminder.id, { priority });
  };

  const handleMoveToList = (listId: string) => {
    onUpdateReminder(reminder.id, { list_id: listId });
  };

  if (isEditing) {
    return (
      <ReminderItemEditMode
        reminder={reminder}
        lists={lists}
        owners={owners}
        onToggleCompleted={onToggleCompleted}
        onSaveAndStopEditing={onSaveAndStopEditing}
        onCancelEditing={onCancelEditing}
        onChange={onChange}
      />
    );
  }

  return (
    <>
      <div onContextMenu={handleContextMenu}>
        <ReminderItemViewMode
          reminder={reminder}
          onToggleCompleted={onToggleCompleted}
          onStartEditing={onStartEditing}
          onShowDetail={() => setShowDetail(true)}
        />
      </div>
      
      <ReminderDetailModal
        reminder={reminder}
        lists={lists}
        owners={owners}
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        onDelete={onDelete}
        onToggleCompleted={onToggleCompleted}
        onEdit={onStartEditing}
      />

      <ContextMenu
        isOpen={contextMenu.isOpen}
        x={contextMenu.x}
        y={contextMenu.y}
        onClose={handleCloseContextMenu}
        onToggleCompleted={() => onToggleCompleted(reminder.id)}
        onShowDetail={() => setShowDetail(true)}
        onDelete={() => onDelete(reminder.id)}
        onSetPriority={handleSetPriority}
        onMoveToList={handleMoveToList}
        lists={lists}
        currentPriority={reminder.priority}
        isCompleted={reminder.is_completed}
      />
    </>
  );
});

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
            const updates = buildUpdates(reminder, currentValues);
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
            />
          ))
        )}
      </div>
    </main>
  );
}