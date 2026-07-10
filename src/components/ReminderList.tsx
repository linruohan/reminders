import { useState, useRef, useEffect, useCallback } from 'react';
import type { ReminderResponse, ListResponse, OwnerResponse } from '@/types/api';

interface ReminderListProps {
  reminders: ReminderResponse[];
  lists: ListResponse[];
  owners: OwnerResponse[];
  activeFilter: string;
  onToggleCompleted: (id: string) => void;
  onUpdateReminder: (id: string, updates: Partial<ReminderResponse>) => void;
  onDeleteReminder: (id: string) => void;
  onCreateReminder: () => void;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  
  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return '今天';
  if (diffDays === 1) return '明天';
  
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}月${day}日`;
}

function formatTime(timeStr: string | null): string {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  const hour = parseInt(parts[0]);
  const minute = parseInt(parts[1]);
  const mm = minute.toString().padStart(2, '0');
  
  if (hour < 12) {
    return `上午 ${hour === 0 ? 12 : hour}:${mm}`;
  } else if (hour === 12) {
    return `下午 12:${mm}`;
  } else {
    return `下午 ${hour - 12}:${mm}`;
  }
}

function getDateColor(dateStr: string | null): string {
  if (!dateStr) return 'text-apple-gray';
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  
  if (date < today) return 'text-apple-red';
  return 'text-apple-orange';
}

const suggestedTimes = [
  { value: '09:00', label: '上午 9:00', period: '上午' },
  { value: '12:00', label: '下午 12:00', period: '中午' },
  { value: '15:00', label: '下午 3:00', period: '下午' },
  { value: '18:00', label: '下午 6:00', period: '晚上' },
  { value: '21:00', label: '下午 9:00', period: '夜间' },
];

interface ReminderItemProps {
  reminder: ReminderResponse;
  lists: ListResponse[];
  owners: OwnerResponse[];
  isEditing: boolean;
  onToggleCompleted: () => void;
  onUpdate: (updates: Partial<ReminderResponse>) => void;
  onDelete: () => void;
  onStartEditing: () => void;
  onStopEditing: () => void;
}

function ReminderItem({ reminder, lists, owners, isEditing, onToggleCompleted, onUpdate, onDelete, onStartEditing, onStopEditing }: ReminderItemProps) {
  const [editTitle, setEditTitle] = useState(reminder.title);
  const [editNotes, setEditNotes] = useState(reminder.description || '');
  const [editDate, setEditDate] = useState(reminder.due_date || '');
  const [editTime, setEditTime] = useState(reminder.due_time || '');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timeInputValue, setTimeInputValue] = useState('');
  const [showDetail, setShowDetail] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const timeInputRef = useRef<HTMLInputElement>(null);
  const itemRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (isEditing && titleInputRef.current) {
      titleInputRef.current.focus();
    }
    if (!isEditing) {
      setShowDatePicker(false);
      setShowTimePicker(false);
    }
  }, [isEditing]);
  
  useEffect(() => {
    setEditTitle(reminder.title);
    setEditNotes(reminder.description || '');
    setEditDate(reminder.due_date || '');
    setEditTime(reminder.due_time || '');
  }, [reminder]);

  useEffect(() => {
    if (showTimePicker && timeInputRef.current) {
      timeInputRef.current.focus();
      timeInputRef.current.select();
    }
  }, [showTimePicker]);
  
  const listName = reminder.list_id
    ? lists.find(l => l.id === reminder.list_id)?.name || '提醒事项'
    : '提醒事项';
  
  const ownerName = reminder.owner_id
    ? owners.find(o => o.id === reminder.owner_id)?.name
    : null;
  
  const handleSave = useCallback(() => {
    onUpdate({ 
      title: editTitle, 
      description: editNotes || null,
      due_date: editDate || null,
      due_time: editTime || null,
    });
    setShowDatePicker(false);
    setShowTimePicker(false);
    onStopEditing();
  }, [onUpdate, onStopEditing, editTitle, editNotes, editDate, editTime]);
  
  const handleCancel = useCallback(() => {
    setEditTitle(reminder.title);
    setEditNotes(reminder.description || '');
    setEditDate(reminder.due_date || '');
    setEditTime(reminder.due_time || '');
    setShowDatePicker(false);
    setShowTimePicker(false);
    onStopEditing();
  }, [reminder, onStopEditing]);
  
  const handleTitleChange = useCallback((value: string) => {
    setEditTitle(value);
    onUpdate({ title: value });
  }, [onUpdate]);
  
  const handleNotesChange = useCallback((value: string) => {
    setEditNotes(value);
    onUpdate({ description: value || null });
  }, [onUpdate]);
  
  const handleDateChange = useCallback((value: string) => {
    setEditDate(value);
    if (!value) {
      setEditTime('');
      onUpdate({ due_date: null, due_time: null });
    } else {
      onUpdate({ due_date: value });
    }
  }, [onUpdate]);
  
  const handleClearDate = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditDate('');
    setEditTime('');
    setShowDatePicker(false);
    setShowTimePicker(false);
    onUpdate({ due_date: null, due_time: null });
  }, [onUpdate]);
  
  const handleClearTime = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditTime('');
    setShowTimePicker(false);
    onUpdate({ due_time: null });
  }, [onUpdate]);
  
  const handleTimeChange = useCallback((value: string) => {
    setEditTime(value);
    setShowTimePicker(false);
    onUpdate({ due_time: value || null });
  }, [onUpdate]);

  const openTimePicker = useCallback(() => {
    setShowDatePicker(false);
    setTimeInputValue(editTime ? formatTime(editTime) : '');
    setShowTimePicker(true);
    if (!editDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];
      setEditDate(todayStr);
      onUpdate({ due_date: todayStr });
    }
  }, [editTime, editDate, onUpdate]);

  const openDatePicker = useCallback(() => {
    setShowTimePicker(false);
    setShowDatePicker((v) => !v);
  }, []);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  
  const weekend = new Date(today);
  const dayOfWeek = today.getDay();
  const daysUntilWeekend = dayOfWeek === 0 ? 0 : (7 - dayOfWeek);
  weekend.setDate(today.getDate() + daysUntilWeekend);
  const weekendStr = weekend.toISOString().split('T')[0];
  
  const nextMonday = new Date(today);
  const daysUntilMonday = dayOfWeek === 1 ? 7 : (8 - dayOfWeek);
  nextMonday.setDate(today.getDate() + daysUntilMonday);
  const nextMondayStr = nextMonday.toISOString().split('T')[0];

  const dateLabel = editDate === todayStr
    ? '今天'
    : editDate === tomorrowStr
      ? '明天'
      : editDate === weekendStr
        ? '本周末'
        : editDate === nextMondayStr
          ? '下周一'
          : formatDate(editDate);
  
  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const chipBase =
    'inline-flex items-center gap-1.5 h-8 pl-2.5 pr-1.5 bg-[#F2F2F7] rounded-[10px] text-[13px] font-medium text-gray-900 hover:bg-[#E5E5EA] transition-colors';
  
  if (isEditing) {
    return (
      <>
      <div 
        ref={itemRef}
        className={`px-6 py-3 border-b border-apple-divider transition-colors ${
          reminder.is_completed ? 'bg-gray-50/30' : 'bg-white'
        }`}
        onClick={handleSave}
      >
        <div className="flex items-start gap-3" onClick={stopPropagation}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleCompleted();
            }}
            className={`w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
              reminder.is_completed
                ? 'bg-apple-blue border-apple-blue'
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
                  onChange={(e) => handleTitleChange(e.target.value)}
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
                  onChange={(e) => handleNotesChange(e.target.value)}
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
                className="w-[22px] h-[22px] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-apple-blue text-white hover:bg-blue-600 transition-colors"
                aria-label="详情"
              >
                <span className="text-[12px] font-bold leading-none italic" style={{ fontFamily: 'Georgia, serif' }}>i</span>
              </button>
            </div>

            <div className="border-t border-apple-divider mt-2.5 mb-2.5" />
            
            <div className="flex items-center gap-2 flex-wrap" onClick={stopPropagation}>
              {/* 日期 chip */}
              <div className="relative">
                <div
                  className={`${chipBase} cursor-pointer ${showDatePicker ? 'ring-2 ring-apple-blue/30' : ''}`}
                  onClick={openDatePicker}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-700 flex-shrink-0">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  <span className={editDate ? 'text-gray-900' : 'text-apple-gray'}>
                    {editDate ? dateLabel : '添加日期'}
                  </span>
                  {editDate && (
                    <button
                      type="button"
                      onClick={handleClearDate}
                      className="ml-0.5 w-4 h-4 rounded-full flex items-center justify-center text-apple-gray hover:text-gray-700 hover:bg-black/5"
                      aria-label="清除日期"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  )}
                </div>
                
                {showDatePicker && (
                  <div
                    onClick={stopPropagation}
                    className="absolute top-full left-0 mt-1.5 bg-white rounded-[12px] shadow-apple-lg border border-apple-divider z-30 min-w-[200px] animate-scale-in overflow-hidden"
                  >
                    <div className="p-1">
                      {[
                        { value: todayStr, label: '今天' },
                        { value: tomorrowStr, label: '明天' },
                        { value: weekendStr, label: '本周末' },
                        { value: nextMondayStr, label: '下周一' },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDateChange(opt.value);
                            setShowDatePicker(false);
                          }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-[8px] text-[13px] font-medium transition-colors ${
                            editDate === opt.value
                              ? 'bg-apple-blue text-white'
                              : 'text-gray-900 hover:bg-gray-100'
                          }`}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                            <line x1="3" y1="10" x2="21" y2="10"/>
                          </svg>
                          {opt.label}
                        </button>
                      ))}
                      <div className="border-t border-apple-divider my-1" />
                      <div className="px-3 py-2">
                        <input
                          onClick={stopPropagation}
                          type="date"
                          value={editDate}
                          onChange={(e) => {
                            handleDateChange(e.target.value);
                            setShowDatePicker(false);
                          }}
                          className="w-full px-2.5 py-1.5 bg-[#F2F2F7] rounded-[8px] text-[13px] text-gray-900 outline-none focus:ring-2 focus:ring-apple-blue/40"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* 时间 chip */}
              <div className="relative">
                <div
                  className={`${chipBase} cursor-pointer ${showTimePicker ? 'ring-2 ring-apple-blue/30' : ''}`}
                  onClick={openTimePicker}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-700 flex-shrink-0">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                  {showTimePicker ? (
                    <input
                      ref={timeInputRef}
                      type="text"
                      value={timeInputValue}
                      onChange={(e) => setTimeInputValue(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Escape') setShowTimePicker(false);
                        if (e.key === 'Enter') {
                          const match = suggestedTimes.find(
                            (t) => t.label === timeInputValue.trim() || t.value === timeInputValue.trim()
                          );
                          if (match) handleTimeChange(match.value);
                          else setShowTimePicker(false);
                        }
                      }}
                      className="w-[72px] bg-[#B3D7FF] text-gray-900 text-[13px] font-medium outline-none rounded-[4px] px-0.5 selection:bg-[#007AFF] selection:text-white"
                    />
                  ) : (
                    <span className={editTime ? 'text-gray-900' : 'text-apple-gray'}>
                      {editTime ? formatTime(editTime) : '添加时间'}
                    </span>
                  )}
                  {(editTime || showTimePicker) && (
                    <button
                      type="button"
                      onClick={handleClearTime}
                      className="ml-0.5 w-4 h-4 rounded-full flex items-center justify-center text-apple-gray hover:text-gray-700 hover:bg-black/5"
                      aria-label="清除时间"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  )}
                </div>
                
                {showTimePicker && (
                  <div
                    onClick={stopPropagation}
                    className="absolute top-full left-0 mt-1.5 bg-white rounded-[12px] shadow-apple-lg border border-apple-divider z-30 min-w-[180px] animate-scale-in overflow-hidden"
                  >
                    <div className="px-3.5 pt-2.5 pb-1 text-[12px] font-medium text-apple-gray">
                      建议
                    </div>
                    <div className="p-1 pt-0">
                      {suggestedTimes.map((time) => (
                        <button
                          key={time.value}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTimeChange(time.value);
                          }}
                          className={`group w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-[8px] text-left transition-colors ${
                            editTime === time.value
                              ? 'bg-apple-blue text-white'
                              : 'text-gray-900 hover:bg-apple-blue hover:text-white'
                          }`}
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="flex-shrink-0 opacity-80"
                          >
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                          </svg>
                          <div className="flex flex-col leading-tight">
                            <span className="text-[13px] font-medium">{time.label}</span>
                            <span className={`text-[11px] ${
                              editTime === time.value
                                ? 'text-white/75'
                                : 'text-apple-gray group-hover:text-white/75'
                            }`}>
                              {time.period}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* 位置 chip */}
              <div className={`${chipBase} cursor-default`}>
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
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50" onClick={() => setShowDetail(false)}>
          <div
            className="bg-white rounded-apple-lg shadow-apple-lg w-[320px] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-apple-divider flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#007AFF" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
              <span className="text-sm font-semibold text-gray-900">查看</span>
            </div>
            
            <div className="p-4 max-h-[400px] overflow-y-auto">
              <div className="text-lg text-gray-900 font-medium mb-2">{reminder.title}</div>
              {reminder.description && (
                <div className="text-sm text-apple-gray mt-2">{reminder.description}</div>
              )}
              
              {reminder.due_date || reminder.due_time ? (
                <div className="flex items-center gap-2 mt-4 text-sm text-apple-orange">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                  <span>
                    {formatDate(reminder.due_date)} {formatTime(reminder.due_time)}
                  </span>
                </div>
              ) : null}
              
              {ownerName && (
                <div className="flex items-center gap-2 mt-3 text-sm text-apple-purple">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 16v-4"/>
                    <path d="M12 8h.01"/>
                  </svg>
                  <span>负责人: {ownerName}</span>
                </div>
              )}
              
              <div className="mt-4 pt-4 border-t border-apple-divider">
                <div className="text-xs text-apple-gray">所属分类: {listName}</div>
                <div className="text-xs text-apple-gray mt-1">优先级: {reminder.priority}</div>
              </div>
            </div>
            
            <div className="px-4 py-3 border-t border-apple-divider flex justify-end gap-3">
              <button
                onClick={onDelete}
                className="px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-apple-sm transition-colors"
              >
                删除
              </button>
              <button
                onClick={onToggleCompleted}
                className="px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-apple-sm transition-colors"
              >
                {reminder.is_completed ? '标记未完成' : '完成'}
              </button>
              <button
                onClick={() => setShowDetail(false)}
                className="px-4 py-1.5 text-sm font-medium text-apple-blue hover:bg-blue-50 rounded-apple-sm transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
      </>
    );
  }
  
  return (
    <>
      <div
        className={`px-6 py-2.5 border-b border-apple-divider hover:bg-gray-50/50 transition-colors cursor-pointer group ${
          reminder.is_completed ? 'bg-gray-50/30' : 'bg-white'
        }`}
        onClick={onStartEditing}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleCompleted();
            }}
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
              reminder.is_completed
                ? 'bg-apple-blue border-apple-blue'
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
              setShowDetail(true);
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
      
      {showDetail && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50" onClick={() => setShowDetail(false)}>
          <div
            className="bg-white rounded-apple-lg shadow-apple-lg w-[320px] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-apple-divider flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#007AFF" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
              <span className="text-sm font-semibold text-gray-900">查看</span>
            </div>
            
            <div className="p-4 max-h-[400px] overflow-y-auto">
              <div className="text-lg text-gray-900 font-medium mb-2">{reminder.title}</div>
              {reminder.description && (
                <div className="text-sm text-apple-gray mt-2">{reminder.description}</div>
              )}
              
              {reminder.due_date || reminder.due_time ? (
                <div className="flex items-center gap-2 mt-4 text-sm text-apple-orange">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                  <span>
                    {formatDate(reminder.due_date)} {formatTime(reminder.due_time)}
                  </span>
                </div>
              ) : null}
              
              {ownerName && (
                <div className="flex items-center gap-2 mt-3 text-sm text-apple-purple">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 16v-4"/>
                    <path d="M12 8h.01"/>
                  </svg>
                  <span>负责人: {ownerName}</span>
                </div>
              )}
              
              <div className="mt-4 pt-4 border-t border-apple-divider">
                <div className="text-xs text-apple-gray">所属分类: {listName}</div>
                <div className="text-xs text-apple-gray mt-1">优先级: {reminder.priority}</div>
              </div>
            </div>
            
            <div className="px-4 py-3 border-t border-apple-divider flex justify-end gap-3">
              <button
                onClick={onDelete}
                className="px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-apple-sm transition-colors"
              >
                删除
              </button>
              <button
                onClick={onToggleCompleted}
                className="px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-apple-sm transition-colors"
              >
                {reminder.is_completed ? '标记未完成' : '完成'}
              </button>
              <button
                onClick={() => {
                  setShowDetail(false);
                  onStartEditing();
                }}
                className="px-4 py-1.5 text-sm font-medium text-apple-blue hover:bg-blue-50 rounded-apple-sm transition-colors"
              >
                编辑
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
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
}: ReminderListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  
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
  }, []);
  
  const handleStopEditing = useCallback(() => {
    setEditingId(null);
  }, []);
  
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (listRef.current && !listRef.current.contains(e.target as Node)) {
        setEditingId(null);
      }
    };
    
    if (editingId) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [editingId]);
  
  return (
    <main className="flex-1 h-full flex flex-col bg-white">
      <div className="flex items-start justify-between px-6 pt-6 pb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{getTitle()}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-apple-gray">{completedCount}项已完成</span>
            <span className="text-sm text-apple-orange font-medium">显示</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-apple-orange">{reminders.length}</span>
          <button
            onClick={onCreateReminder}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>
      </div>
      
      <div ref={listRef} className="flex-1 overflow-y-auto">
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
          reminders.map((reminder) => (
            <ReminderItem
              key={reminder.id}
              reminder={reminder}
              lists={lists}
              owners={owners}
              isEditing={editingId === reminder.id}
              onToggleCompleted={() => onToggleCompleted(reminder.id)}
              onUpdate={(updates) => onUpdateReminder(reminder.id, updates)}
              onDelete={() => onDeleteReminder(reminder.id)}
              onStartEditing={() => handleStartEditing(reminder.id)}
              onStopEditing={handleStopEditing}
            />
          ))
        )}
      </div>
    </main>
  );
}