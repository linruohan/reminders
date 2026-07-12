import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { ReminderResponse, ListResponse } from '@/types/api';
import { getDaysInMonth, formatMonthYear, isSameDay, toISODateStr } from '@/utils/dateUtils';
import { AddReminderModal } from './AddReminderModal';


type ViewMode = 'day' | 'week' | 'month' | 'year';

const weekDays = ['一', '二', '三', '四', '五', '六', '日'];
const timelineHours = Array.from({ length: 13 }, (_, i) => i + 9);
const HOUR_HEIGHT = 56;

function getRemindersForDate(reminders: ReminderResponse[], date: Date): ReminderResponse[] {
  const targetDate = toISODateStr(date);
  return reminders.filter(r => r.due_date === targetDate);
}

function getWeekStartMon(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function getListColor(lists: ListResponse[], listId: string | null): string {
  if (!listId) return '#FF3B30';
  return lists.find(l => l.id === listId)?.color || '#FF3B30';
}

function MiniMonth({ year, month, reminders }: { year: number; month: number; reminders: ReminderResponse[] }) {
  const days = useMemo(() => {
    const result: (Date | null)[] = [];
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = (firstDay.getDay() + 6) % 7;
    for (let i = 0; i < startPad; i++) result.push(null);
    for (let i = 1; i <= lastDay.getDate(); i++) result.push(new Date(year, month, i));
    return result;
  }, [year, month]);

  const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

  return (
    <div className="p-2">
      <div className="text-xs font-semibold text-gray-700 mb-1.5 text-center">{monthNames[month]}</div>
      <div className="grid grid-cols-7 gap-0">
          {weekDays.map(d => (
            <div key={d} className="text-[9px] text-gray-400 text-center h-4 leading-4">{d}</div>
          ))}
        {days.map((d, i) => {
          if (!d) return <div key={`e-${i}`} />;
          const hasReminder = getRemindersForDate(reminders, d).length > 0;
          const today = isSameDay(d, new Date());
          return (
            <div key={i} className="text-center h-5 leading-5 relative text-[10px]">
              <span className={`inline-block w-4 h-4 leading-4 rounded-full ${today ? 'bg-apple-red text-white' : 'text-gray-600'}`}>
                {d.getDate()}
              </span>
              {hasReminder && (
                <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-2 h-0.5 rounded-full bg-red-500" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TimelineSlot({ hour }: { hour: number }) {
  const label = hour > 12 ? `${hour - 12}时` : `${hour}时`;
  return (
    <div className="flex border-b border-apple-divider" style={{ height: HOUR_HEIGHT }}>
      <div className="w-14 flex-shrink-0 flex items-center justify-end pr-2">
        <span className="text-xs text-gray-400 font-medium">{label}</span>
      </div>
      <div className="flex-1" />
    </div>
  );
}

function HoverLine({ minute }: { minute: number }) {
  const h = 9 + Math.floor(minute / 60);
  const m = minute % 60;
  return (
    <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: (minute / 60) * HOUR_HEIGHT }}>
      <div className="flex items-center ml-14">
        <div className="flex-1 border-t border-red-400/70" />
        <span className="text-[10px] font-medium text-red-500 bg-white/90 px-1 rounded-sm leading-tight whitespace-nowrap">
          {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}
        </span>
      </div>
    </div>
  );
}

const BLOCK_MINUTES = 30;

function AllDaySection({
  reminders,
  lists,
  onReminderClick,
  onDoubleClick,
}: {
  reminders: ReminderResponse[];
  lists: ListResponse[];
  onReminderClick: (r: ReminderResponse) => void;
  onDoubleClick: () => void;
}) {
  return (
    <div
      className="flex border-b border-apple-divider bg-gray-50/40"
      style={{ height: HOUR_HEIGHT }}
      onDoubleClick={onDoubleClick}
    >
      <div className="w-14 flex-shrink-0 flex items-center justify-end pr-2">
        <span className="text-xs text-gray-400 font-medium">全天</span>
      </div>
      <div className="flex-1 flex items-center gap-1 overflow-x-auto px-2">
        {reminders.map(r => {
          const color = getListColor(lists, r.list_id);
          return (
            <button
              key={r.id}
              onClick={() => onReminderClick(r)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-[6px] bg-white/80 hover:bg-white shadow-sm text-xs transition-colors spring-transition whitespace-nowrap"
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
              <span className={r.is_completed ? 'text-gray-400 line-through' : 'text-gray-700'}>{r.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ReminderBlock({
  reminder,
  listColor,
  onClick,
}: {
  reminder: ReminderResponse;
  listColor: string;
  onClick: (reminder: ReminderResponse) => void;
}) {
  const hour = reminder.due_time ? parseInt(reminder.due_time.split(':')[0]) : 9;
  const minute = reminder.due_time ? parseInt(reminder.due_time.split(':')[1]) : 0;
  const top = (hour - 9) * HOUR_HEIGHT + (minute / 60) * HOUR_HEIGHT;
  const height = (BLOCK_MINUTES / 60) * HOUR_HEIGHT;

  return (
    <div
      className="absolute left-16 right-1 z-10 cursor-pointer"
      style={{ top, height }}
      onClick={(e) => { e.stopPropagation(); onClick(reminder); }}
    >
      <div className="mx-1 h-full rounded-apple-sm border-l-[3px] bg-blue-50/60 border-blue-400 shadow-sm hover:shadow-md transition-shadow spring-transition flex items-center px-2" style={{ borderLeftColor: listColor }}>
        <div className="flex items-center gap-3 w-full">
          <span className={`flex-1 text-xs font-medium truncate ${reminder.is_completed ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
            {reminder.title}
          </span>
          {reminder.due_time && (
            <span className="text-[10px] font-medium text-gray-400 flex-shrink-0">{reminder.due_time}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function SearchDrawer({
  isOpen,
  query,
  results,
  lists,
  onQueryChange,
  onSelect,
  onClose,
}: {
  isOpen: boolean;
  query: string;
  results: ReminderResponse[];
  lists: ListResponse[];
  onQueryChange: (q: string) => void;
  onSelect: (r: ReminderResponse) => void;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={onClose} />
      )}
      <div className={`fixed top-0 right-0 h-full w-80 bg-white shadow-[-4px_0_24px_rgba(0,0,0,0.12)] z-50 transform transition-transform duration-300 spring-transition ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between p-4 border-b border-apple-divider">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => onQueryChange(e.target.value)}
              placeholder="搜索提醒事项"
              className="w-full pl-9 pr-3 py-2 text-sm bg-gray-100 rounded-[10px] border-none outline-none text-gray-900 placeholder-gray-400"
            />
          </div>
          <button onClick={onClose} className="ml-3 w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto h-[calc(100%-60px)] p-3">
          {query.trim() === '' && (
            <div className="text-sm text-gray-400 text-center pt-8">输入关键词搜索提醒事项</div>
          )}
          {query.trim() !== '' && results.length === 0 && (
            <div className="text-sm text-gray-400 text-center pt-8">未找到匹配的提醒事项</div>
          )}
          {results.map(r => {
            const color = getListColor(lists, r.list_id);
            return (
              <div
                key={r.id}
                onClick={() => onSelect(r)}
                className="flex items-center gap-3 p-3 rounded-apple-sm hover:bg-gray-50 cursor-pointer transition-colors spring-transition"
              >
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium truncate ${r.is_completed ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                    {r.title}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {r.due_date && <span className="text-[11px] text-gray-400">{r.due_date}</span>}
                    {r.due_time && <span className="text-[11px] text-apple-orange">{r.due_time}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function EditReminderCard({
  reminder,
  lists,
  onSave,
  onDelete,
  onClose,
}: {
  reminder: ReminderResponse;
  lists: ListResponse[];
  onSave: (id: string, updates: Partial<ReminderResponse>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(reminder.title);
  const [description, setDescription] = useState(reminder.description || '');
  const [dueDate, setDueDate] = useState(reminder.due_date || '');
  const [dueTime, setDueTime] = useState(reminder.due_time || '');
  const [selectedListId, setSelectedListId] = useState(reminder.list_id || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const handleSave = useCallback(() => {
    const updates: Partial<ReminderResponse> = {};
    if (title !== reminder.title) updates.title = title;
    if ((description || null) !== reminder.description) updates.description = description || null;
    if ((dueDate || null) !== reminder.due_date) updates.due_date = dueDate || null;
    if ((dueTime || null) !== reminder.due_time) updates.due_time = dueTime || null;
    if (selectedListId !== (reminder.list_id || '')) updates.list_id = selectedListId || null;
    onSave(reminder.id, updates);
    onClose();
  }, [title, description, dueDate, dueTime, selectedListId, reminder, onSave, onClose]);

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-apple-lg shadow-[0_16px_48px_rgba(0,0,0,0.16)] w-[320px] overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-apple-divider">
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-all">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <span className="text-sm font-semibold text-gray-900">编辑提醒</span>
          <div className="flex gap-2">
            <button onClick={() => { onDelete(reminder.id); onClose(); }} className="text-sm font-medium text-red-500 hover:text-red-600 transition-colors">删除</button>
            <button onClick={handleSave} className="text-sm font-semibold text-apple-blue transition-opacity">完成</button>
          </div>
        </div>
        <div className="p-4">
          <input ref={inputRef} type="text" value={title} onChange={e => setTitle(e.target.value)}
            placeholder="标题" className="w-full text-[17px] font-semibold text-gray-900 placeholder-apple-gray bg-transparent border-none outline-none" />
          <input type="text" value={description} onChange={e => setDescription(e.target.value)}
            placeholder="备注" className="w-full mt-1 text-[13px] text-apple-gray placeholder-apple-gray bg-transparent border-none outline-none" />
          <div className="border-t border-apple-divider my-3" />
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-1.5 h-8 px-2.5 bg-[#F2F2F7] rounded-[10px] text-[13px] font-medium text-gray-900">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-700">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="bg-transparent border-none outline-none text-[13px] w-24 text-gray-700" />
            </div>
            <div className="inline-flex items-center gap-1.5 h-8 px-2.5 bg-[#F2F2F7] rounded-[10px] text-[13px] font-medium text-gray-900">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-700">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              <input type="time" value={dueTime} onChange={e => setDueTime(e.target.value)}
                className="bg-transparent border-none outline-none text-[13px] w-20 text-gray-700" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-apple-divider">
            <div className="flex flex-wrap gap-2">
              {lists.map(list => (
                <button key={list.id} onClick={() => setSelectedListId(selectedListId === list.id ? '' : list.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-[10px] text-sm font-medium transition-colors spring-transition ${
                    selectedListId === list.id ? 'bg-blue-50 text-apple-blue' : 'text-gray-700 hover:bg-gray-100'
                  }`}>
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: list.color }} />
                  {list.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface CalendarViewProps {
  reminders: ReminderResponse[];
  lists: ListResponse[];
  onUpdateReminder: (id: string, updates: Partial<ReminderResponse>) => void;
  onDeleteReminder: (id: string) => void;
  onCreateReminder: (data: { title: string; description?: string | null; due_date?: string | null; due_time?: string | null; list_id?: string | null; is_all_day?: boolean }) => Promise<ReminderResponse | null>;
}

export function CalendarView({ reminders, lists, onUpdateReminder, onDeleteReminder, onCreateReminder }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ReminderResponse[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalDate, setAddModalDate] = useState<string>('');
  const [addModalTime, setAddModalTime] = useState<string>('');
  const [addModalAllDay, setAddModalAllDay] = useState(false);
  const [editReminder, setEditReminder] = useState<ReminderResponse | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const days = useMemo(() => getDaysInMonth(year, month), [year, month]);

  const weeksStartMon = useMemo(() => getWeekStartMon(currentDate), [currentDate]);

  const today = useMemo(() => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; }, []);

  const selectedReminders = useMemo(() => getRemindersForDate(reminders, selectedDate), [reminders, selectedDate]);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return; }
    try {
      const data = await invoke<ReminderResponse[]>('search_reminders', { query: q.trim() });
      setSearchResults(data);
    } catch { setSearchResults([]); }
  }, []);

  const handleSearchInput = useCallback((q: string) => {
    setSearchQuery(q);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => doSearch(q), 200);
  }, [doSearch]);

  const handleSearchSelect = useCallback((r: ReminderResponse) => {
    if (r.due_date) {
      const d = new Date(r.due_date);
      setCurrentDate(d);
      setSelectedDate(d);
      if (viewMode === 'year') {
        setViewMode('month');
      }
    }
    setSearchOpen(false);
    setSearchQuery('');
    setEditReminder(r);
  }, [viewMode]);

  const handleDoubleClickTimeline = useCallback((hour: number, minute: number, date: Date) => {
    setAddModalDate(toISODateStr(date));
    setAddModalTime(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
    setAddModalAllDay(false);
    setShowAddModal(true);
  }, []);

  const handleAllDayDoubleClick = useCallback((date: Date) => {
    setAddModalDate(toISODateStr(date));
    setAddModalTime('09:00');
    setAddModalAllDay(true);
    setShowAddModal(true);
  }, []);

  const handleAddSubmit = useCallback(async (data: { title: string; description?: string | null; due_date?: string | null; due_time?: string | null; list_id?: string | null; is_all_day?: boolean }) => {
    const result = await onCreateReminder({ ...data, is_all_day: addModalAllDay || undefined });
    setShowAddModal(false);
    return result;
  }, [onCreateReminder, addModalAllDay]);

  const handleTimelineReminderClick = useCallback((reminder: ReminderResponse) => {
    setEditReminder(reminder);
  }, []);

  const navigatePeriod = useCallback((direction: -1 | 1) => {
    if (viewMode === 'day') {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() + direction);
      setCurrentDate(d);
      setSelectedDate(d);
    } else if (viewMode === 'week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + direction * 7);
      setCurrentDate(d);
    } else if (viewMode === 'month') {
      setCurrentDate(new Date(year, month + direction, 1));
    } else {
      setCurrentDate(new Date(year + direction, month, 1));
    }
  }, [viewMode, selectedDate, currentDate, year, month]);

  const goToToday = useCallback(() => {
    const t = new Date();
    setCurrentDate(t);
    setSelectedDate(t);
  }, []);

  const getTitle = useCallback(() => {
    switch (viewMode) {
      case 'day': {
        const ms = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
        return `${ms[selectedDate.getMonth()]}${selectedDate.getDate()}日`;
      }
      case 'week': {
        const end = new Date(weeksStartMon);
        end.setDate(end.getDate() + 6);
        return `${weeksStartMon.getMonth() + 1}月${weeksStartMon.getDate()}日 - ${end.getMonth() + 1}月${end.getDate()}日`;
      }
      case 'month': return formatMonthYear(currentDate);
      case 'year': return `${year}年`;
    }
  }, [viewMode, selectedDate, weeksStartMon, currentDate, year]);

  const handlePrev = () => navigatePeriod(-1);
  const handleNext = () => navigatePeriod(1);

  return (
    <main className="flex-1 h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-3">
        <div className="w-[120px] flex items-center">
          <button
            onClick={() => { setAddModalDate(''); setAddModalTime(''); setAddModalAllDay(false); setShowAddModal(true); }}
            className="w-8 h-8 rounded-full bg-apple-blue text-white flex items-center justify-center hover:bg-apple-blue-hover transition-colors shadow-sm active:scale-95"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>

        <div className="flex items-center bg-gray-100/80 rounded-[10px] p-0.5">
          {(['day', 'week', 'month', 'year'] as ViewMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 text-sm font-medium rounded-[8px] transition-all spring-transition ${
                viewMode === mode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {{ day: '日', week: '周', month: '月', year: '年' }[mode]}
            </button>
          ))}
        </div>

        <div className="w-[120px] flex items-center justify-end gap-1">
          <button onClick={handlePrev} className="w-7 h-7 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-all active:scale-95">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <button onClick={goToToday} className="px-2.5 py-1 text-sm font-medium text-apple-blue hover:bg-blue-50 rounded-[8px] transition-colors">
            今天
          </button>
          <button onClick={handleNext} className="w-7 h-7 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-all active:scale-95">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
          <span className="text-sm font-semibold text-gray-800 min-w-[80px] ml-1">{getTitle()}</span>
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 bg-gray-100/80 rounded-[10px] hover:bg-gray-200/80 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <span className="hidden sm:inline">搜索</span>
          </button>
        </div>
      </div>

      {/* View Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {viewMode === 'day' && (
          <DayView
            date={selectedDate}
            reminders={reminders}
            lists={lists}
            onDoubleClickTimeline={(h, m) => handleDoubleClickTimeline(h, m, selectedDate)}
            onReminderClick={handleTimelineReminderClick}
            onAllDayDoubleClick={() => handleAllDayDoubleClick(selectedDate)}
          />
        )}
        {viewMode === 'week' && (
          <WeekView
            startDate={weeksStartMon}
            reminders={reminders}
            lists={lists}
            onDoubleClickTimeline={(h, m, d) => handleDoubleClickTimeline(h, m, d)}
            onReminderClick={handleTimelineReminderClick}
            onAllDayDoubleClick={(d) => handleAllDayDoubleClick(d)}
          />
        )}
        {viewMode === 'month' && (
          <MonthView
            month={month}
            days={days}
            today={today}
            selectedDate={selectedDate}
            reminders={reminders}
            lists={lists}
            onSelectDate={setSelectedDate}
            onReminderClick={handleTimelineReminderClick}
          />
        )}
        {viewMode === 'year' && (
          <YearView year={year} reminders={reminders} onMonthClick={(y, m) => { setCurrentDate(new Date(y, m, 1)); setViewMode('month'); }} />
        )}
      </div>

      {/* Month detail panel */}
      {viewMode === 'month' && selectedReminders.length > 0 && (
        <div className="border-t border-apple-divider px-5 py-3 max-h-24 overflow-y-auto shrink-0">
          <div className="flex items-center gap-3">
            {selectedReminders.slice(0, 5).map(r => {
              const color = getListColor(lists, r.list_id);
              return (
                <button key={r.id} onClick={() => handleTimelineReminderClick(r)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-[10px] bg-white/80 hover:bg-white shadow-sm transition-all text-xs spring-transition">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  <span className={r.is_completed ? 'text-gray-400 line-through' : 'text-gray-700'}>{r.title}</span>
                </button>
              );
            })}
            {selectedReminders.length > 5 && (
              <span className="text-xs text-gray-400">+{selectedReminders.length - 5}</span>
            )}
          </div>
        </div>
      )}

      {/* Search Drawer */}
      <SearchDrawer
        isOpen={searchOpen}
        query={searchQuery}
        results={searchResults}
        lists={lists}
        onQueryChange={handleSearchInput}
        onSelect={handleSearchSelect}
        onClose={() => { setSearchOpen(false); setSearchQuery(''); setSearchResults([]); }}
      />

      {/* Add Reminder Modal */}
      {showAddModal && (
        <AddReminderModal
          lists={lists}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddSubmit}
          initialDate={addModalDate || undefined}
          initialTime={addModalTime || undefined}
        />
      )}

      {/* Edit Reminder Card */}
      {editReminder && (
        <EditReminderCard
          reminder={editReminder}
          lists={lists}
          onSave={onUpdateReminder}
          onDelete={onDeleteReminder}
          onClose={() => setEditReminder(null)}
        />
      )}
    </main>
  );
}

function DayView({
  date,
  reminders,
  lists,
  onDoubleClickTimeline,
  onReminderClick,
  onAllDayDoubleClick,
}: {
  date: Date;
  reminders: ReminderResponse[];
  lists: ListResponse[];
  onDoubleClickTimeline: (hour: number, minute: number) => void;
  onReminderClick: (r: ReminderResponse) => void;
  onAllDayDoubleClick: () => void;
}) {
  const dayAllDay = useMemo(() => getRemindersForDate(reminders, date).filter(r => r.is_all_day), [reminders, date]);
  const dayTimed = useMemo(() => getRemindersForDate(reminders, date).filter(r => !r.is_all_day), [reminders, date]);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [hoverMinute, setHoverMinute] = useState<number | null>(null);

  const getMinuteFromY = useCallback((clientY: number) => {
    if (!timelineRef.current) return null;
    const rect = timelineRef.current.getBoundingClientRect();
    const scrollTop = timelineRef.current.scrollTop;
    const y = clientY - rect.top + scrollTop;
    return Math.max(0, Math.min(12 * 60, Math.round((y / HOUR_HEIGHT) * 60)));
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const m = getMinuteFromY(e.clientY);
    if (m !== null) setHoverMinute(m);
  }, [getMinuteFromY]);

  const handleMouseLeave = useCallback(() => setHoverMinute(null), []);

  const handleDblClick = useCallback((e: React.MouseEvent) => {
    const m = getMinuteFromY(e.clientY);
    if (m === null) return;
    const hour = 9 + Math.floor(m / 60);
    const minute = m % 60;
    onDoubleClickTimeline(hour, minute);
  }, [getMinuteFromY, onDoubleClickTimeline]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="text-center py-2 border-b border-apple-divider bg-gray-50/50">
        <span className="text-xs font-semibold text-gray-500">{weekDays[(date.getDay() + 6) % 7]}</span>
        <span className="text-base font-semibold text-gray-800 ml-2">{date.getDate()}</span>
      </div>
      <AllDaySection
        reminders={dayAllDay}
        lists={lists}
        onReminderClick={onReminderClick}
        onDoubleClick={onAllDayDoubleClick}
      />
      <div
        ref={timelineRef}
        className="flex-1 overflow-y-auto relative"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onDoubleClick={handleDblClick}
      >
        <div className="relative" style={{ height: 13 * HOUR_HEIGHT }}>
          {timelineHours.map(hour => (
            <TimelineSlot key={hour} hour={hour} />
          ))}
          {hoverMinute !== null && <HoverLine minute={hoverMinute} />}
          {dayTimed.map(r => (
            <ReminderBlock key={r.id} reminder={r} listColor={getListColor(lists, r.list_id)} onClick={onReminderClick} />
          ))}
        </div>
      </div>
    </div>
  );
}

function WeekView({
  startDate,
  reminders,
  lists,
  onDoubleClickTimeline,
  onReminderClick,
  onAllDayDoubleClick,
}: {
  startDate: Date;
  reminders: ReminderResponse[];
  lists: ListResponse[];
  onDoubleClickTimeline: (hour: number, minute: number, date: Date) => void;
  onReminderClick: (r: ReminderResponse) => void;
  onAllDayDoubleClick: (date: Date) => void;
}) {
  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      return d;
    });
  }, [startDate]);

  const timelineRef = useRef<HTMLDivElement>(null);
  const [hoverInfo, setHoverInfo] = useState<{ minute: number; col: number } | null>(null);

  const getHoverInfo = useCallback((clientX: number, clientY: number) => {
    if (!timelineRef.current) return null;
    const rect = timelineRef.current.getBoundingClientRect();
    const scrollTop = timelineRef.current.scrollTop;
    const x = clientX - rect.left;
    const y = clientY - rect.top + scrollTop;
    const colWidth = rect.width / 7;
    const col = Math.min(6, Math.max(0, Math.floor(x / colWidth)));
    const minute = Math.max(0, Math.min(12 * 60, Math.round((y / HOUR_HEIGHT) * 60)));
    return { minute, col };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const info = getHoverInfo(e.clientX, e.clientY);
    if (info) setHoverInfo(info);
  }, [getHoverInfo]);

  const handleMouseLeave = useCallback(() => setHoverInfo(null), []);

  const handleDblClick = useCallback((e: React.MouseEvent) => {
    const info = getHoverInfo(e.clientX, e.clientY);
    if (!info) return;
    const hour = 9 + Math.floor(info.minute / 60);
    const minute = info.minute % 60;
    onDoubleClickTimeline(hour, minute, weekDates[info.col]);
  }, [getHoverInfo, onDoubleClickTimeline, weekDates]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="grid grid-cols-7 border-b border-apple-divider bg-gray-50/50">
        {weekDates.map((d, i) => {
          const isToday = isSameDay(d, new Date());
          return (
            <div key={i} className="text-center py-2 border-r border-apple-divider last:border-r-0">
              <div className={`text-xs font-semibold ${isToday ? 'text-apple-red' : 'text-gray-500'}`}>{weekDays[i]}</div>
              <div className={`text-base font-semibold ${isToday ? 'text-apple-red' : 'text-gray-800'}`}>{d.getDate()}</div>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-7 border-b border-apple-divider bg-gray-50/40">
        {weekDates.map((d, i) => {
          const dayAllDay = getRemindersForDate(reminders, d).filter(r => r.is_all_day);
          return (
            <div key={i} className="flex items-center gap-1 px-1 overflow-x-auto border-r border-apple-divider last:border-r-0" style={{ height: HOUR_HEIGHT }}>
              {dayAllDay.map(r => {
                const color = getListColor(lists, r.list_id);
                return (
                  <button key={r.id} onClick={() => onReminderClick(r)}
                    className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-[4px] bg-white/80 hover:bg-white shadow-sm truncate max-w-full spring-transition"
                  >
                    <span className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle" style={{ backgroundColor: color }} />
                    <span className={r.is_completed ? 'text-gray-400 line-through' : 'text-gray-700'}>{r.title}</span>
                  </button>
                );
              })}
              <div className="flex-1 h-full" onDoubleClick={() => onAllDayDoubleClick(d)} />
            </div>
          );
        })}
      </div>
      <div
        ref={timelineRef}
        className="flex-1 overflow-y-auto relative"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onDoubleClick={handleDblClick}
      >
        <div className="grid grid-cols-7 relative" style={{ height: 13 * HOUR_HEIGHT }}>
          {weekDates.map((d, colIdx) => {
            const dayTimed = getRemindersForDate(reminders, d).filter(r => !r.is_all_day);
            return (
              <div key={colIdx} className="relative border-r border-apple-divider last:border-r-0">
                {timelineHours.map(hour => (
                  <TimelineSlot key={hour} hour={hour} />
                ))}
                {dayTimed.map(r => {
                  const hour = r.due_time ? parseInt(r.due_time.split(':')[0]) : 9;
                  const minute = r.due_time ? parseInt(r.due_time.split(':')[1]) : 0;
                  const top = (hour - 9) * HOUR_HEIGHT + (minute / 60) * HOUR_HEIGHT;
                  const height = (BLOCK_MINUTES / 60) * HOUR_HEIGHT;
                  const color = getListColor(lists, r.list_id);
                  return (
                    <div
                      key={r.id}
                      className="absolute left-0.5 right-0.5 z-10 cursor-pointer"
                      style={{ top, height }}
                      onClick={() => onReminderClick(r)}
                    >
                      <div className="h-full rounded-apple-sm border-l-[3px] bg-blue-50/60 border-blue-400 shadow-sm hover:shadow-md transition-shadow spring-transition flex items-center px-1.5" style={{ borderLeftColor: color }}>
                        <div className="flex items-center gap-1 w-full">
                          <span className={`flex-1 text-[11px] font-medium truncate leading-tight ${r.is_completed ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                            {r.title}
                          </span>
                          {r.due_time && (
                            <span className="text-[9px] font-medium text-gray-400 flex-shrink-0">{r.due_time}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
          {hoverInfo !== null && (
            <div className="absolute left-0 right-0 z-30 pointer-events-none" style={{ top: (hoverInfo.minute / 60) * HOUR_HEIGHT }}>
              <div className="flex items-center ml-14">
                <div className="flex-1 border-t border-red-400/70" />
                <span className="text-[10px] font-medium text-red-500 bg-white/90 px-1 rounded-sm leading-tight whitespace-nowrap">
                  {`${String(9 + Math.floor(hoverInfo.minute / 60)).padStart(2, '0')}:${String(hoverInfo.minute % 60).padStart(2, '0')}`}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MonthView({
  month,
  days,
  today,
  selectedDate,
  reminders,
  lists,
  onSelectDate,
  onReminderClick,
}: {
  month: number;
  days: Date[];
  today: Date;
  selectedDate: Date;
  reminders: ReminderResponse[];
  lists: ListResponse[];
  onSelectDate: (d: Date) => void;
  onReminderClick: (r: ReminderResponse) => void;
}) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="grid grid-cols-7 px-4 py-2 bg-gray-50/50">
        {weekDays.map(d => (
          <div key={d} className="text-center text-xs font-semibold text-gray-500 py-1">{d}</div>
        ))}
      </div>
      <div className="flex-1 grid grid-cols-7 px-4 pb-4 overflow-y-auto auto-rows-fr">
        {days.map((day, index) => {
          const isCurrentMonth = day.getMonth() === month;
          const isToday = isSameDay(day, today);
          const isSelected = isSameDay(day, selectedDate);
          const dayReminders = getRemindersForDate(reminders, day);
          return (
            <div
              key={index}
              onClick={() => onSelectDate(new Date(day))}
              className={`min-h-[80px] p-2 cursor-pointer transition-all duration-200 spring-transition rounded-[10px] ${
                isSelected ? 'bg-blue-50/90' : 'hover:bg-white/80'
              } ${!isCurrentMonth ? 'opacity-40' : ''}`}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold mx-auto ${
                isToday ? 'bg-apple-red text-white shadow-sm' : isSelected && !isToday ? 'bg-apple-blue text-white' : isCurrentMonth ? 'text-gray-800' : 'text-gray-400'
              }`}>
                {day.getDate()}
              </div>
              {dayReminders.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {dayReminders.slice(0, 3).map(r => (
                    <div key={r.id} onClick={(e) => { e.stopPropagation(); onReminderClick(r); }}
                      className="text-[10px] truncate px-1.5 py-0.5 rounded-[6px] bg-white/90 hover:bg-white transition-colors spring-transition cursor-pointer">
                      <span className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle" style={{ backgroundColor: getListColor(lists, r.list_id) }} />
                      <span className={r.is_completed ? 'text-gray-400 line-through' : 'text-gray-700'}>{r.title}</span>
                    </div>
                  ))}
                  {dayReminders.length > 3 && (
                    <div className="text-[10px] text-gray-400 px-1.5">+{dayReminders.length - 3} 更多</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function YearView({
  year,
  reminders,
  onMonthClick,
}: {
  year: number;
  reminders: ReminderResponse[];
  onMonthClick: (year: number, month: number) => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto px-4 pb-4">
      <div className="grid grid-cols-4 gap-3 h-full">
        {Array.from({ length: 12 }, (_, i) => (
          <button key={i} onClick={() => onMonthClick(year, i)}
            className="bg-white/80 hover:bg-white rounded-apple-lg shadow-sm border border-apple-divider transition-all spring-transition text-left">
            <MiniMonth year={year} month={i} reminders={reminders} />
          </button>
        ))}
      </div>
    </div>
  );
}
