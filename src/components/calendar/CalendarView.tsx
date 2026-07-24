import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { ReminderResponse, ListResponse, CreateReminderRequest, Priority, RecurrenceFrequency, TimeUnit } from '@/types/api';
import { getDaysInMonth, parseISODate } from '@/utils/dateUtils';
import { effectiveDueDate } from '@/utils/reminderDates';
import { AddReminderModal } from '../AddReminderModal';
import { DayView } from './DayView';
import { WeekView } from './WeekView';
import { MonthView } from './MonthView';
import { YearView } from './YearView';
import { SearchDrawer } from './SearchDrawer';
import { EditReminderCard } from './EditReminderCard';
import { getWeekStartMon } from './utils';

type ViewMode = 'day' | 'week' | 'month' | 'year';

interface CalendarViewProps {
  reminders: ReminderResponse[];
  lists: ListResponse[];
  onUpdateReminder: (id: string, updates: Partial<ReminderResponse>) => void;
  onDeleteReminder: (id: string) => void;
  onCreateReminder: (data: CreateReminderRequest) => Promise<{ data: ReminderResponse | null; error: string | null }>;
  showToast?: (type: 'success' | 'error' | 'info', message: string) => void;
}

function formatDraftDateTime(date: Date, hour: number, minute: number): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(hour).padStart(2, '0');
  const min = String(minute).padStart(2, '0');
  return `${y}-${m}-${d}T${h}:${min}`;
}

function formatDraftDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function CalendarView({ reminders, lists, onUpdateReminder, onDeleteReminder, onCreateReminder, showToast }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ReminderResponse[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addDraft, setAddDraft] = useState<{ endDateTime?: string; isAllDay?: boolean } | null>(null);
  const [editReminder, setEditReminder] = useState<ReminderResponse | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const days = useMemo(() => getDaysInMonth(year, month), [year, month]);

  const weeksStartMon = useMemo(() => getWeekStartMon(currentDate), [currentDate]);

  const today = useMemo(() => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; }, []);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return; }
    try {
      const data = await invoke<ReminderResponse[]>('search_reminders', { query: q.trim() });
      setSearchResults(data);
    } catch {
      setSearchResults([]);
      showToast?.('error', '搜索失败');
    }
  }, [showToast]);

  const openAddModal = useCallback((draft?: { endDateTime?: string; isAllDay?: boolean } | null) => {
    setAddDraft(draft ?? null);
    setShowAddModal(true);
  }, []);

  const closeAddModal = useCallback(() => {
    setShowAddModal(false);
    setAddDraft(null);
  }, []);

  const handleSearchInput = useCallback((q: string) => {
    setSearchQuery(q);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => doSearch(q), 200);
  }, [doSearch]);

  // 清理搜索定时器，防止内存泄漏
  useEffect(() => {
    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, []);

  const handleSearchSelect = useCallback((r: ReminderResponse) => {
    const due = effectiveDueDate(r);
    if (due) {
      const d = parseISODate(due);
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
    openAddModal({ endDateTime: formatDraftDateTime(date, hour, minute), isAllDay: false });
  }, [openAddModal]);

  const handleAllDayDoubleClick = useCallback((date: Date) => {
    openAddModal({ endDateTime: formatDraftDate(date), isAllDay: true });
  }, [openAddModal]);

  const handleAddSubmit = useCallback(async (data: {
    title: string;
    description?: string | null;
    url?: string | null;
    end_date?: string | null;
    end_time?: string | null;
    list_id?: string | null;
    is_all_day?: boolean;
    is_flagged?: boolean;
    priority?: Priority;
    recurrence_frequency?: RecurrenceFrequency | null;
    recurrence_interval?: number | null;
    custom_recurrence_unit?: TimeUnit | null;
    recurrence_end_date?: string | null;
    remind_before_value?: number | null;
    remind_before_unit?: TimeUnit | null;
    tags?: string[];
  }) => {
    const result = await onCreateReminder({ ...data });
    if (result.data) {
      closeAddModal();
      showToast?.('success', '提醒事项已创建');
    } else {
      showToast?.('error', result.error || '创建提醒事项失败');
    }
    return result;
  }, [onCreateReminder, closeAddModal, showToast]);

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
      case 'day':
      case 'week':
        return `${year}年${month + 1}月`;
      case 'month': return `${year}年${month + 1}月`;
      case 'year': return `${year}年`;
    }
  }, [viewMode, selectedDate, weeksStartMon, currentDate, year, month]);

  const handlePrev = () => navigatePeriod(-1);
  const handleNext = () => navigatePeriod(1);

  return (
    <main className="flex-1 h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex flex-col border-b border-apple-divider">
        <div className="flex items-center justify-between px-5 py-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => openAddModal()}
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
                className={`px-4 py-1.5 text-sm font-medium rounded-[8px] transition-all spring-transition ${
                  viewMode === mode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {{ day: '日', week: '周', month: '月', year: '年' }[mode]}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
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

        <div className="flex items-center justify-between px-5 pb-2">
          <div className="flex items-center gap-2">
            <button onClick={handlePrev} className="w-7 h-7 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-all active:scale-95">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <button onClick={handleNext} className="w-7 h-7 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-all active:scale-95">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
            <span className={`font-bold ${viewMode === 'year' ? 'text-2xl text-apple-red' : 'text-xl text-gray-900'}`}>{getTitle()}</span>
          </div>
          <button onClick={goToToday} className="px-3 py-1 text-sm font-medium text-apple-red hover:bg-red-50 rounded-[8px] transition-colors">
            今天
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
            onSelectDate={(d) => {
              setSelectedDate(d);
              setCurrentDate(d);
              setViewMode('day');
            }}
            onReminderClick={handleTimelineReminderClick}
          />
        )}
        {viewMode === 'year' && (
          <YearView year={year} reminders={reminders} onMonthClick={(y, m) => { setCurrentDate(new Date(y, m, 1)); setViewMode('month'); }} />
        )}
      </div>

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
          initialEndDateTime={addDraft?.endDateTime}
          initialIsAllDay={addDraft?.isAllDay}
          onClose={closeAddModal}
          onSubmit={handleAddSubmit}
          showToast={showToast}
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
          showToast={showToast}
        />
      )}
    </main>
  );
}
