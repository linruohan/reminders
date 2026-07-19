import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { invoke } from '@tauri-apps/api/core';
import type { ReminderResponse, ListResponse, OwnerResponse, TagResponse, TimeUnit, Priority, RecurrenceFrequency } from '@/types/api';
import { formatDate, formatTime, getDateColor, getTodayStr, getTomorrowStr, getWeekendStr, getNextMondayStr, groupedTimes } from '@/utils/dateUtils';
import { ReminderDetailModal } from './ReminderDetailModal';
import { ContextMenu } from './ContextMenu';
import { recurrenceOptions, remindOptions } from './reminder/formOptions';

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
  if (values.url !== undefined && values.url !== reminder.url) {
    updates.url = values.url ?? null;
  }
  if (values.due_date !== reminder.due_date) {
    updates.due_date = values.due_date ?? null;
  }
  if (values.due_time !== reminder.due_time) {
    updates.due_time = values.due_time ?? null;
  }
  if (values.is_flagged !== undefined && values.is_flagged !== reminder.is_flagged) {
    updates.is_flagged = values.is_flagged;
  }
  if (values.list_id !== undefined && values.list_id !== reminder.list_id) {
    updates.list_id = values.list_id ?? null;
  }
  if (values.recurrence_frequency !== undefined && values.recurrence_frequency !== reminder.recurrence_frequency) {
    updates.recurrence_frequency = values.recurrence_frequency ?? null;
  }
  if (values.recurrence_interval !== undefined && values.recurrence_interval !== reminder.recurrence_interval) {
    updates.recurrence_interval = values.recurrence_interval ?? null;
  }
  if (values.custom_recurrence_unit !== undefined && values.custom_recurrence_unit !== reminder.custom_recurrence_unit) {
    updates.custom_recurrence_unit = values.custom_recurrence_unit ?? null;
  }
  if (values.recurrence_end_date !== undefined && values.recurrence_end_date !== reminder.recurrence_end_date) {
    updates.recurrence_end_date = values.recurrence_end_date ?? null;
  }
  if (values.remind_before_value !== undefined && values.remind_before_value !== reminder.remind_before_value) {
    updates.remind_before_value = values.remind_before_value ?? null;
  }
  if (values.remind_before_unit !== undefined && values.remind_before_unit !== reminder.remind_before_unit) {
    updates.remind_before_unit = values.remind_before_unit ?? null;
  }
  return updates;
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
  onUpdateReminder: (id: string, updates: Partial<ReminderResponse>) => void;
  onCut: (reminder: ReminderResponse) => void;
  onCopy: (reminder: ReminderResponse) => void;
  onPaste: (listId: string | null) => void;
  canPaste: boolean;
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
      className={`reminder-item px-5 py-3.5 rounded-[16px] hover:bg-white/90 transition-all duration-250 spring-transition cursor-pointer group ${
        reminder.is_completed ? 'bg-gray-50/50' : 'bg-white/60'
      }`}
      onClick={() => onStartEditing(reminder.id)}
    >
      <div className="flex items-center gap-4">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleCompleted(reminder.id);
          }}
          className={`w-[22px] h-[22px] rounded-[6px] border-2 flex items-center justify-center flex-shrink-0 transition-all duration-250 spring-transition ${
            reminder.is_completed
              ? 'bg-apple-blue border-apple-blue shadow-[0_2px_8px_rgba(0,122,255,0.35)]'
              : 'border-apple-gray-dark hover:border-apple-blue hover:shadow-[0_1px_4px_rgba(0,122,255,0.2)]'
          }`}
        >
          {reminder.is_completed && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          )}
        </button>
        
        <div className="flex-1 min-w-0">
          <div className={`text-[17px] font-semibold truncate ${
            reminder.is_completed
              ? 'text-apple-gray line-through'
              : 'text-gray-900'
          }`}>
            {reminder.title}
          </div>
          
          <div className="flex items-center gap-3 mt-1">
            {reminder.description && (
              <span className="text-[13px] text-apple-gray truncate max-w-[220px]">
                {reminder.description}
              </span>
            )}
            {reminder.due_date && (
              <span className={`text-[13px] font-medium flex items-center gap-1 ${getDateColor(reminder.due_date)}`}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                {formatDate(reminder.due_date)}
                {reminder.due_time && <> {formatTime(reminder.due_time)}</>}
                {reminder.end_date && (
                  <> - {formatDate(reminder.end_date)}{reminder.end_time && <> {formatTime(reminder.end_time)}</>}</>
                )}
              </span>
            )}
            {reminder.tags && reminder.tags.length > 0 && (
              <span className="text-[13px] text-apple-blue flex items-center gap-0.5">
                {reminder.tags.map(t => `#${t.name}`).join(' ')}
              </span>
            )}
          </div>
        </div>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            onShowDetail();
          }}
          className="w-9 h-9 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-gray-100/90 transition-all duration-250 spring-transition text-apple-gray"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
  const [editUrl, setEditUrl] = useState(reminder.url || '');
  const [editDate, setEditDate] = useState(reminder.due_date || '');
  const [editTime, setEditTime] = useState(reminder.due_time || '');
  const [editListId, setEditListId] = useState(reminder.list_id || '');
  const [editIsFlagged, setEditIsFlagged] = useState(reminder.is_flagged ?? false);
  const [editRecurrenceFreq, setEditRecurrenceFreq] = useState<string>(reminder.recurrence_frequency ?? '');
  const [editRecurrenceInterval, setEditRecurrenceInterval] = useState(reminder.recurrence_interval ?? 1);
  const [editCustomUnit, setEditCustomUnit] = useState<TimeUnit>(reminder.custom_recurrence_unit ?? 'days');
  const [editRecurrenceEndDate, setEditRecurrenceEndDate] = useState(reminder.recurrence_end_date || '');
  const [editRemindValue, setEditRemindValue] = useState(() => {
    if (reminder.remind_before_value == null) return '';
    const unitMap: Record<string, string> = { day: 'd', week: 'w', month: 'M' };
    const u = unitMap[reminder.remind_before_unit || ''] || '';
    return u ? `${reminder.remind_before_value}${u}` : 'custom';
  });
  const [editTags, setEditTags] = useState<string[]>(reminder.tags?.map(t => t.name) || []);
  const [tagInput, setTagInput] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState<TagResponse[]>([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number } | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const toggleDropdown = useCallback((name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    if (activeDropdown === name) {
      setActiveDropdown(null);
      setDropdownRect(null);
    } else {
      setActiveDropdown(name);
      setDropdownRect({ top: rect.bottom + 4, left: rect.left });
    }
  }, [activeDropdown]);

  useEffect(() => {
    onChange({
      title: editTitle,
      description: editNotes || null,
      url: editUrl || null,
      due_date: editDate || null,
      due_time: editTime || null,
      is_flagged: editIsFlagged !== reminder.is_flagged ? editIsFlagged : undefined,
      list_id: editListId || null,
      recurrence_frequency: (editRecurrenceFreq || null) as RecurrenceFrequency | null,
      recurrence_interval: editRecurrenceFreq === 'custom' ? editRecurrenceInterval : null,
      custom_recurrence_unit: editRecurrenceFreq === 'custom' ? editCustomUnit : null,
      recurrence_end_date: editRecurrenceEndDate || null,
    });
  }, [editTitle, editNotes, editUrl, editDate, editTime, editIsFlagged, editListId, editRecurrenceFreq, editRecurrenceInterval, editCustomUnit, editRecurrenceEndDate, reminder, onChange]);
  
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
      url: editUrl || null,
      due_date: editDate || null,
      due_time: editTime || null,
      is_flagged: editIsFlagged,
      list_id: editListId || null,
      recurrence_frequency: (editRecurrenceFreq || null) as RecurrenceFrequency | null,
      recurrence_interval: editRecurrenceFreq === 'custom' ? editRecurrenceInterval : null,
      custom_recurrence_unit: editRecurrenceFreq === 'custom' ? editCustomUnit : null,
      recurrence_end_date: editRecurrenceEndDate || null,
    };
    if (editRemindValue && editRemindValue !== 'custom') {
      const unit = editRemindValue.slice(-1);
      const num = parseInt(editRemindValue.slice(0, -1));
      const unitMap: Record<string, TimeUnit> = { d: 'days', w: 'weeks', M: 'days' };
      values.remind_before_value = num;
      values.remind_before_unit = unitMap[unit] || null;
    } else if (editRemindValue) {
      values.remind_before_value = 1;
      values.remind_before_unit = 'days';
    }
    const updates = buildUpdates(reminder, values);
    onSaveAndStopEditing(reminder.id, updates);
  }, [onSaveAndStopEditing, editTitle, editNotes, editUrl, editDate, editTime, editIsFlagged, editListId, editRecurrenceFreq, editRecurrenceInterval, editCustomUnit, editRecurrenceEndDate, editRemindValue, reminder]);
  
  const handleCancel = useCallback(() => {
    onCancelEditing();
  }, [onCancelEditing]);
  
  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const searchTagsHandler = useCallback(async (q: string) => {
    if (!q.trim()) { setTagSuggestions([]); setShowTagSuggestions(false); return; }
    try {
      const data = await invoke<TagResponse[]>('search_tags', { query: q.trim() });
      const filtered = data.filter(t => !editTags.includes(t.name));
      setTagSuggestions(filtered);
      setShowTagSuggestions(filtered.length > 0);
    } catch { setTagSuggestions([]); setShowTagSuggestions(false); }
  }, [editTags]);

  const addTag = useCallback((name: string) => {
    const trimmed = name.trim().replace(/^#/, '');
    if (trimmed && !editTags.includes(trimmed)) {
      setEditTags(prev => [...prev, trimmed]);
    }
    setTagInput(''); setTagSuggestions([]); setShowTagSuggestions(false);
  }, [editTags]);

  const removeTag = useCallback((name: string) => {
    setEditTags(prev => prev.filter(t => t !== name));
  }, []);

  return (
    <>
      <div
        className={`reminder-item relative z-50 px-5 py-4 rounded-[20px] transition-all duration-250 animate-slide-down ${
          reminder.is_completed ? 'bg-gray-50/70' : 'bg-white shadow-[0_4px_16px_rgba(0,0,0,0.08)]'
        }`}
        onClick={handleSave}
      >
        <div className="flex items-start gap-4" onClick={stopPropagation}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleCompleted(reminder.id);
            }}
            className={`w-[22px] h-[22px] rounded-[6px] border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all duration-250 spring-transition ${
              reminder.is_completed
                ? 'bg-apple-blue border-apple-blue shadow-[0_2px_8px_rgba(0,122,255,0.35)]'
                : 'border-apple-gray-dark hover:border-apple-blue hover:shadow-[0_1px_4px_rgba(0,122,255,0.2)]'
            }`}
          >
            {reminder.is_completed && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
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
                <input
                  type="url"
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Escape') handleCancel(); }}
                  className="w-full mt-0.5 text-[13px] leading-snug text-apple-blue bg-transparent border-none outline-none placeholder-apple-gray"
                  placeholder="URL"
                />
              </div>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDetail(true);
                }}
                className="w-[24px] h-[24px] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-apple-blue text-white hover:bg-[#0066CC] transition-colors spring-transition shadow-[0_2px_8px_rgba(0,122,255,0.3)]"
                aria-label="详情"
              >
                <span className="text-[12px] font-bold leading-none italic" style={{ fontFamily: 'Georgia, serif' }}>i</span>
              </button>
            </div>

            <div className="border-t border-apple-divider mt-3 mb-3" />

            <div className="flex flex-col gap-2" onClick={stopPropagation}>
              <div className="flex flex-wrap gap-2">
                <button onClick={(e) => toggleDropdown('date', e)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F2F2F7] rounded-[10px] text-[13px] font-medium text-gray-700 hover:bg-[#E5E5EA] transition-all duration-200 spring-transition">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  {editDate ? formatDate(editDate) : '日期'}
                </button>
                <button onClick={(e) => toggleDropdown('time', e)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F2F2F7] rounded-[10px] text-[13px] font-medium text-gray-700 hover:bg-[#E5E5EA] transition-all duration-200 spring-transition">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  {editTime ? formatTime(editTime) : '时间'}
                </button>
                <button onClick={(e) => toggleDropdown('remind', e)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F2F2F7] rounded-[10px] text-[13px] font-medium text-gray-700 hover:bg-[#E5E5EA] transition-all duration-200 spring-transition">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                  {editRemindValue ? (remindOptions.find(o => o.value === editRemindValue)?.label || '自定义') : '提醒'}
                </button>
                <button onClick={(e) => toggleDropdown('tags', e)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F2F2F7] rounded-[10px] text-[13px] font-medium text-gray-700 hover:bg-[#E5E5EA] transition-all duration-200 spring-transition">
                  <span className="text-xs font-bold leading-none">#</span>
                  {editTags.length > 0 ? `${editTags.length}个标签` : '标签'}
                </button>
                <button onClick={() => setEditIsFlagged(!editIsFlagged)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[13px] font-medium transition-all duration-200 spring-transition ${editIsFlagged ? 'bg-orange-100 text-orange-500' : 'bg-[#F2F2F7] text-gray-700 hover:bg-[#E5E5EA]'}`}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill={editIsFlagged ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>
                </button>
                <button onClick={(e) => toggleDropdown('repeat', e)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F2F2F7] rounded-[10px] text-[13px] font-medium text-gray-700 hover:bg-[#E5E5EA] transition-all duration-200 spring-transition">
                  {editRecurrenceFreq ? (recurrenceOptions.find(o => o.value === editRecurrenceFreq)?.label || '自定义') : '重复'}
                </button>
                <button onClick={(e) => toggleDropdown('endRepeat', e)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F2F2F7] rounded-[10px] text-[13px] font-medium text-gray-700 hover:bg-[#E5E5EA] transition-all duration-200 spring-transition">
                  {editRecurrenceEndDate ? `${formatDate(editRecurrenceEndDate)}结束` : '结束重复'}
                </button>
                <button onClick={(e) => toggleDropdown('list', e)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F2F2F7] rounded-[10px] text-[13px] font-medium text-gray-700 hover:bg-[#E5E5EA] transition-all duration-200 spring-transition">
                  {editListId ? (lists.find(l => l.id === editListId)?.name || '列表') : '提醒事项'}
                </button>
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

      {activeDropdown && dropdownRect && createPortal(
        <div className="fixed inset-0 z-[9999]" onClick={() => { setActiveDropdown(null); setDropdownRect(null); }}>
          <div className="absolute" style={{ top: dropdownRect.top, left: dropdownRect.left }} onClick={e => e.stopPropagation()}>
            {/* 日期下拉 */}
            {activeDropdown === 'date' && (
              <div className="w-max min-w-[140px] bg-white rounded-apple-lg shadow-lg border border-apple-divider py-1">
                <button onClick={() => { setEditDate(getTodayStr()); setActiveDropdown(null); setDropdownRect(null); }}
                  className={`block w-full text-left px-4 py-2 text-xs font-medium whitespace-nowrap transition-colors ${editDate === getTodayStr() ? 'bg-apple-blue/10 text-apple-blue' : 'text-gray-700 hover:bg-gray-50'}`}>今天</button>
                <button onClick={() => { setEditDate(getTomorrowStr()); setActiveDropdown(null); setDropdownRect(null); }}
                  className={`block w-full text-left px-4 py-2 text-xs font-medium whitespace-nowrap transition-colors ${editDate === getTomorrowStr() ? 'bg-apple-blue/10 text-apple-blue' : 'text-gray-700 hover:bg-gray-50'}`}>明天</button>
                <button onClick={() => { setEditDate(getWeekendStr()); setActiveDropdown(null); setDropdownRect(null); }}
                  className={`block w-full text-left px-4 py-2 text-xs font-medium whitespace-nowrap transition-colors ${editDate === getWeekendStr() ? 'bg-apple-blue/10 text-apple-blue' : 'text-gray-700 hover:bg-gray-50'}`}>本周末</button>
                <button onClick={() => { setEditDate(getNextMondayStr()); setActiveDropdown(null); setDropdownRect(null); }}
                  className={`block w-full text-left px-4 py-2 text-xs font-medium whitespace-nowrap transition-colors ${editDate === getNextMondayStr() ? 'bg-apple-blue/10 text-apple-blue' : 'text-gray-700 hover:bg-gray-50'}`}>下周一</button>
                <div className="border-t border-apple-divider my-1" />
                <div className="flex items-center gap-2 px-4 py-2">
                  <span className="text-xs text-gray-400 whitespace-nowrap">指定日期</span>
                  <input type="date" value={editDate} onChange={e => { setEditDate(e.target.value); setActiveDropdown(null); setDropdownRect(null); }}
                    className="w-[130px] px-2 py-1 text-xs bg-[#F2F2F7] rounded-[8px] border-none outline-none" />
                </div>
                {editDate && (
                  <button onClick={() => { setEditDate(''); setActiveDropdown(null); setDropdownRect(null); }}
                    className="block w-full text-left px-4 py-2 text-xs text-red-500 whitespace-nowrap hover:bg-red-50">移除日期</button>
                )}
              </div>
            )}

            {/* 时间下拉 */}
            {activeDropdown === 'time' && (
              <div className="w-max min-w-[120px] bg-white rounded-apple-lg shadow-lg border border-apple-divider py-1 max-h-56 overflow-y-auto">
                {(['上午', '中午', '下午', '晚上', '夜间'] as const).flatMap(period =>
                  groupedTimes[period]?.map(t => (
                    <button key={t.value} onClick={() => { setEditTime(t.value); setActiveDropdown(null); setDropdownRect(null); }}
                      className={`block w-full text-left px-4 py-2 text-xs font-medium whitespace-nowrap transition-colors ${editTime === t.value ? 'bg-apple-blue/10 text-apple-blue' : 'text-gray-700 hover:bg-gray-50'}`}>
                      {t.period === '上午' ? '早上' : t.period === '中午' ? '中午' : t.period === '下午' ? '下午' : t.period === '晚上' ? '晚上' : '夜间'} {t.label}
                    </button>
                  ))
                )}
                <div className="border-t border-apple-divider my-1" />
                <div className="flex items-center gap-2 px-4 py-2">
                  <span className="text-xs text-gray-400 whitespace-nowrap">指定时间</span>
                  <input type="time" value={editTime} onChange={e => { setEditTime(e.target.value); setActiveDropdown(null); setDropdownRect(null); }}
                    className="w-[110px] px-2 py-1 text-xs bg-[#F2F2F7] rounded-[8px] border-none outline-none" />
                </div>
                {editTime && (
                  <button onClick={() => { setEditTime(''); setActiveDropdown(null); setDropdownRect(null); }}
                    className="block w-full text-left px-4 py-2 text-xs text-red-500 whitespace-nowrap hover:bg-red-50">移除时间</button>
                )}
              </div>
            )}

            {/* 提醒下拉 */}
            {activeDropdown === 'remind' && (
              <div className="w-max min-w-[100px] bg-white rounded-apple-lg shadow-lg border border-apple-divider py-1">
                {remindOptions.map(o => (
                  <button key={o.value} onClick={() => { setEditRemindValue(o.value); setActiveDropdown(null); setDropdownRect(null); }}
                    className={`block w-full text-left px-4 py-2 text-xs font-medium whitespace-nowrap transition-colors ${editRemindValue === o.value ? 'bg-apple-blue/10 text-apple-blue' : 'text-gray-700 hover:bg-gray-50'}`}>{o.label}</button>
                ))}
                {editRemindValue === 'custom' && (
                  <>
                    <div className="border-t border-apple-divider my-1" />
                    <div className="flex items-center gap-1.5 px-4 py-2">
                      <span className="text-xs text-gray-400 whitespace-nowrap">提前</span>
                      <input type="number" min={1} defaultValue={1}
                        className="w-12 px-1 py-1 text-xs bg-[#F2F2F7] rounded-[8px] border-none outline-none text-center" />
                      <select defaultValue="day"
                        className="px-1 py-1 text-xs bg-[#F2F2F7] rounded-[8px] border-none outline-none">
                        <option value="hour">小时</option>
                        <option value="day">天</option>
                        <option value="week">周</option>
                        <option value="month">月</option>
                      </select>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 标签下拉 */}
            {activeDropdown === 'tags' && (
              <div className="w-max min-w-[150px] bg-white rounded-apple-lg shadow-lg border border-apple-divider p-2">
                <div className="flex flex-wrap gap-1 mb-2">
                  {editTags.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-apple-blue text-xs rounded-[6px]">
                      #{tag}
                      <button onClick={() => removeTag(tag)} className="hover:bg-blue-100 rounded-full p-0.5">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </span>
                  ))}
                </div>
                <div className="relative">
                  <input type="text" value={tagInput} onChange={e => { setTagInput(e.target.value); searchTagsHandler(e.target.value); }}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput); } }}
                    placeholder="搜索或添加标签"
                    className="w-full px-2.5 py-1.5 text-xs bg-[#F2F2F7] rounded-[8px] border-none outline-none text-gray-500 placeholder-apple-gray" />
                  {showTagSuggestions && (
                    <div className="absolute top-full left-0 mt-1 bg-white rounded-apple-lg shadow-lg border border-apple-divider py-1 z-50 w-full">
                      {tagSuggestions.map(t => (
                        <button key={t.id} onClick={() => addTag(t.name)}
                          className="block w-full text-left px-2.5 py-1 text-xs text-gray-700 whitespace-nowrap hover:bg-gray-50">#{t.name}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 重复下拉 */}
            {activeDropdown === 'repeat' && (
              <div className="w-max min-w-[100px] bg-white rounded-apple-lg shadow-lg border border-apple-divider py-1">
                {recurrenceOptions.map(o => (
                  <button key={o.value} onClick={() => { setEditRecurrenceFreq(o.value); setActiveDropdown(null); setDropdownRect(null); }}
                    className={`block w-full text-left px-4 py-2 text-xs font-medium whitespace-nowrap transition-colors ${editRecurrenceFreq === o.value ? 'bg-apple-blue/10 text-apple-blue' : 'text-gray-700 hover:bg-gray-50'}`}>{o.label}</button>
                ))}
                {editRecurrenceFreq === 'custom' && (
                  <>
                    <div className="border-t border-apple-divider my-1" />
                    <div className="flex items-center gap-1.5 px-4 py-2">
                      <span className="text-xs text-gray-400 whitespace-nowrap">每</span>
                      <input type="number" min={1} value={editRecurrenceInterval}
                        onChange={e => setEditRecurrenceInterval(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-12 px-1 py-1 text-xs bg-[#F2F2F7] rounded-[8px] border-none outline-none text-center" />
                      <select value={editCustomUnit} onChange={e => setEditCustomUnit(e.target.value as TimeUnit)}
                        className="px-1 py-1 text-xs bg-[#F2F2F7] rounded-[8px] border-none outline-none">
                        <option value="hour">小时</option>
                        <option value="day">天</option>
                        <option value="week">周</option>
                        <option value="month">月</option>
                      </select>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 结束重复下拉 */}
            {activeDropdown === 'endRepeat' && (
              <div className="w-max min-w-[100px] bg-white rounded-apple-lg shadow-lg border border-apple-divider py-1">
                <button onClick={() => { setEditRecurrenceEndDate(''); setActiveDropdown(null); setDropdownRect(null); }}
                  className={`block w-full text-left px-4 py-2 text-xs font-medium whitespace-nowrap transition-colors ${!editRecurrenceEndDate ? 'bg-apple-blue/10 text-apple-blue' : 'text-gray-700 hover:bg-gray-50'}`}>永不</button>
                <button onClick={() => { if (!editRecurrenceEndDate) setEditRecurrenceEndDate(getTodayStr()); }}
                  className={`block w-full text-left px-4 py-2 text-xs font-medium whitespace-nowrap transition-colors ${editRecurrenceEndDate ? 'bg-apple-blue/10 text-apple-blue' : 'text-gray-700 hover:bg-gray-50'}`}>指定日期</button>
                {editRecurrenceEndDate && (
                  <>
                    <div className="border-t border-apple-divider my-1" />
                    <div className="px-4 py-2">
                      <input type="date" value={editRecurrenceEndDate} onChange={e => setEditRecurrenceEndDate(e.target.value)}
                        className="w-[140px] px-2 py-1.5 text-xs bg-[#F2F2F7] rounded-[8px] border-none outline-none" />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 列表下拉 */}
            {activeDropdown === 'list' && (
              <div className="w-max min-w-[100px] bg-white rounded-apple-lg shadow-lg border border-apple-divider py-1">
                <button onClick={() => { setEditListId(''); setActiveDropdown(null); setDropdownRect(null); }}
                  className={`block w-full text-left px-4 py-2 text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${!editListId ? 'bg-apple-blue/10 text-apple-blue' : 'text-gray-700 hover:bg-gray-50'}`}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 11 3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                  </svg>
                  提醒事项
                </button>
                {lists.map(list => (
                  <button key={list.id} onClick={() => { setEditListId(list.id); setActiveDropdown(null); setDropdownRect(null); }}
                    className={`block w-full text-left px-4 py-2 text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${editListId === list.id ? 'bg-apple-blue/10 text-apple-blue' : 'text-gray-700 hover:bg-gray-50'}`}>
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: list.color || '#999' }} />
                    {list.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
});

export const ReminderItem = memo(function ReminderItem({ 
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
  onUpdateReminder,
  onCut,
  onCopy,
  onPaste,
  canPaste,
}: ReminderItemProps) {
  const [showDetail, setShowDetail] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ isOpen: boolean; x: number; y: number }>({ isOpen: false, x: 0, y: 0 });

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ isOpen: true, x: e.clientX, y: e.clientY });
  };

  const handleCloseContextMenu = () => {
    setContextMenu({ isOpen: false, x: 0, y: 0 });
  };

  const handleSetPriority = (priority: Priority) => {
    onUpdateReminder(reminder.id, { priority });
  };

  const handleMoveToList = (listId: string) => {
    onUpdateReminder(reminder.id, { list_id: listId });
  };

  const handleSetDueDate = (date: string) => {
    onUpdateReminder(reminder.id, { due_date: date });
  };

  const handleShowDetail = useCallback(() => setShowDetail(true), []);

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
          onShowDetail={handleShowDetail}
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
        onShowDetail={handleShowDetail}
        onDelete={() => onDelete(reminder.id)}
        onSetPriority={handleSetPriority}
        onMoveToList={handleMoveToList}
        onSetDueDate={handleSetDueDate}
        onCut={() => onCut(reminder)}
        onCopy={() => onCopy(reminder)}
        onPaste={onPaste}
        canPaste={canPaste}
        lists={lists}
        currentPriority={reminder.priority}
        isCompleted={reminder.is_completed}
      />
    </>
  );
});
