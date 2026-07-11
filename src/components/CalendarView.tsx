import { useState, useMemo } from 'react';
import type { ReminderResponse, ListResponse } from '@/types/api';
import { 
  getDaysInMonth, 
  formatMonthYear, 
  isSameDay, 
  toISODateStr 
} from '@/utils/dateUtils';

interface CalendarViewProps {
  reminders: ReminderResponse[];
  lists: ListResponse[];
}

type CalendarViewMode = 'day' | 'week' | 'month';

const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

function getRemindersForDate(reminders: ReminderResponse[], date: Date): ReminderResponse[] {
  const targetDate = toISODateStr(date);
  return reminders.filter((r) => r.due_date === targetDate);
}

function CalendarDay({ 
  day, 
  isCurrentMonth, 
  isToday, 
  isSelected, 
  dayReminders, 
  onSelect, 
  lists 
}: {
  day: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  dayReminders: ReminderResponse[];
  onSelect: (date: Date) => void;
  lists: ListResponse[];
}) {
  const hasReminder = dayReminders.length > 0;

  return (
    <div
      onClick={() => onSelect(new Date(day))}
      className={`
        min-h-[96px] p-2.5 cursor-pointer relative
        transition-all duration-200 spring-transition rounded-[12px]
        ${isSelected ? 'bg-blue-50/90' : 'hover:bg-white/80'}
      `}
    >
      <div
        className={`
          w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold mx-auto
          transition-all duration-200 spring-transition
          ${isToday && isCurrentMonth ? 'bg-apple-red text-white shadow-md shadow-red-500/30' : ''}
          ${isSelected && !isToday ? 'bg-apple-blue text-white' : ''}
          ${!isSelected && !isToday ? (isCurrentMonth ? 'text-gray-900' : 'text-gray-400') : ''}
        `}
      >
        {day.getDate()}
      </div>

      {hasReminder && (
        <div className="mt-2 space-y-1 px-1">
          {dayReminders.slice(0, 3).map((reminder, i) => {
            const rListColor = reminder.list_id
              ? lists.find((l) => l.id === reminder.list_id)?.color || '#FF3B30'
              : '#FF3B30';
            return (
              <div
                key={i}
                className="text-xs truncate px-2 py-1 rounded-[8px] bg-white/80 hover:bg-white transition-colors spring-transition"
              >
                <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: rListColor }} />
                <span className={reminder.is_completed ? 'text-gray-500 line-through' : 'text-gray-700'}>
                  {reminder.title}
                </span>
              </div>
            );
          })}
          {dayReminders.length > 3 && (
            <div className="text-xs text-gray-500 px-2">+{dayReminders.length - 3} 更多</div>
          )}
        </div>
      )}

      {hasReminder && !isSelected && (
        <div className="absolute top-2 right-2 flex gap-0.5">
          {dayReminders.slice(0, 3).map((reminder, i) => {
            const color = reminder.list_id
              ? lists.find((l) => l.id === reminder.list_id)?.color || '#FF3B30'
              : '#FF3B30';
            return (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: color }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function DayView({ 
  date, 
  reminders, 
  lists 
}: {
  date: Date;
  reminders: ReminderResponse[];
  lists: ListResponse[];
}) {
  const dayReminders = getRemindersForDate(reminders, date);
  const sortedReminders = useMemo(() => {
    return [...dayReminders].sort((a, b) => {
      if (a.due_time && b.due_time) {
        return a.due_time.localeCompare(b.due_time);
      }
      return 0;
    });
  }, [dayReminders]);

  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="grid grid-cols-7 px-6 py-3 bg-gray-50/50">
        {weekDays.map((day) => (
          <div key={day} className="text-center text-xs font-semibold text-gray-500 py-2">
            {day}
          </div>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-7">
          <div className="col-span-7">
            <div className="flex">
              <div className="w-16 flex-shrink-0 border-r border-apple-divider">
                {hours.map((hour) => (
                  <div 
                    key={hour} 
                    className="h-[60px] flex items-center justify-end pr-2 text-xs text-gray-500 border-b border-apple-divider"
                  >
                    {hour > 0 && `${hour}时`}
                  </div>
                ))}
              </div>
              <div className="flex-1">
                {sortedReminders.map((reminder, i) => {
                  const rListColor = reminder.list_id
                    ? lists.find((l) => l.id === reminder.list_id)?.color || '#FF3B30'
                    : '#FF3B30';
                  const hour = reminder.due_time ? parseInt(reminder.due_time.split(':')[0]) : 9;
                  const top = hour * 60;
                  
                  return (
                    <div
                      key={i}
                      className="absolute left-16 right-0 px-4 py-2 rounded-[10px] bg-white border-l-4 shadow-sm hover:shadow-md transition-shadow spring-transition"
                      style={{ 
                        top: `${top}px`,
                        borderLeftColor: rListColor,
                        maxWidth: 'calc(100% - 64px)'
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${reminder.is_completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                          {reminder.title}
                        </span>
                        {reminder.due_time && (
                          <span className="text-xs text-gray-500">{reminder.due_time}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WeekView({ 
  startDate, 
  reminders, 
  lists 
}: {
  startDate: Date;
  reminders: ReminderResponse[];
  lists: ListResponse[];
}) {
  const weekDates = useMemo(() => {
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [startDate]);

  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="grid grid-cols-7 px-6 py-3 bg-gray-50/50">
        {weekDates.map((date, i) => {
          const isToday = isSameDay(date, new Date());
          return (
            <div key={i} className="text-center text-sm font-semibold py-2">
              <div className={`text-xs mb-1 ${isToday ? 'text-apple-red' : 'text-gray-500'}`}>
                {weekDays[date.getDay()]}
              </div>
              <div className={`${isToday ? 'text-apple-red' : 'text-gray-900'}`}>
                {date.getDate()}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="flex">
          <div className="w-16 flex-shrink-0 border-r border-apple-divider">
            {hours.map((hour) => (
              <div 
                key={hour} 
                className="h-[60px] flex items-center justify-end pr-2 text-xs text-gray-500 border-b border-apple-divider"
              >
                {hour > 0 && `${hour}时`}
              </div>
            ))}
          </div>
          <div className="flex-1 grid grid-cols-7">
            {weekDates.map((date, dayIndex) => {
              const dayReminders = getRemindersForDate(reminders, date);
              return (
                <div 
                  key={dayIndex} 
                  className="relative border-r border-apple-divider"
                  style={{ minHeight: `${24 * 60}px` }}
                >
                  {dayReminders.map((reminder, i) => {
                    const rListColor = reminder.list_id
                      ? lists.find((l) => l.id === reminder.list_id)?.color || '#FF3B30'
                      : '#FF3B30';
                    const hour = reminder.due_time ? parseInt(reminder.due_time.split(':')[0]) : 9;
                    const top = hour * 60;
                    
                    return (
                      <div
                        key={i}
                        className="absolute left-2 right-2 py-1.5 px-2 rounded-[10px] bg-white border-l-3 shadow-sm hover:shadow-md transition-shadow spring-transition"
                        style={{ 
                          top: `${top}px`,
                          borderLeftColor: rListColor,
                        }}
                      >
                        <span className={`text-xs truncate ${reminder.is_completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                          {reminder.title}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CalendarView({ reminders, lists }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const days = useMemo(() => getDaysInMonth(year, month), [year, month]);

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const selectedReminders = useMemo(
    () => getRemindersForDate(reminders, selectedDate),
    [reminders, selectedDate]
  );

  const weeksStartDate = useMemo(() => {
    const start = new Date(currentDate);
    const dayOfWeek = start.getDay();
    start.setDate(start.getDate() - dayOfWeek);
    return start;
  }, [currentDate]);

  const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

  const prevPeriod = () => {
    if (viewMode === 'day') {
      setCurrentDate(new Date(year, month, selectedDate.getDate() - 1));
      setSelectedDate(new Date(year, month, selectedDate.getDate() - 1));
    } else if (viewMode === 'week') {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() - 7);
      setCurrentDate(newDate);
    } else {
      setCurrentDate(new Date(year, month - 1, 1));
    }
  };

  const nextPeriod = () => {
    if (viewMode === 'day') {
      setCurrentDate(new Date(year, month, selectedDate.getDate() + 1));
      setSelectedDate(new Date(year, month, selectedDate.getDate() + 1));
    } else if (viewMode === 'week') {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + 7);
      setCurrentDate(newDate);
    } else {
      setCurrentDate(new Date(year, month + 1, 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const selectMonth = (m: number) => {
    setCurrentDate(new Date(year, m, 1));
    setShowYearPicker(false);
  };

  const selectYear = (y: number) => {
    setCurrentDate(new Date(y, month, 1));
    setShowYearPicker(false);
  };

  const getTitle = () => {
    if (viewMode === 'day') {
      return `${selectedDate.getMonth() + 1}月${selectedDate.getDate()}日`;
    } else if (viewMode === 'week') {
      const endDate = new Date(weeksStartDate);
      endDate.setDate(endDate.getDate() + 6);
      return `${weeksStartDate.getMonth() + 1}月${weeksStartDate.getDate()}日 - ${endDate.getMonth() + 1}月${endDate.getDate()}日`;
    }
    return formatMonthYear(currentDate);
  };

  return (
    <main className="flex-1 h-full flex flex-col">
      <div className="flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-4">
          <button
            onClick={prevPeriod}
            className="w-10 h-10 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-white/80 transition-all duration-200 spring-transition active:scale-95"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>

          <div className="relative">
            <button
              onClick={() => setShowYearPicker(!showYearPicker)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] hover:bg-white/80 transition-colors spring-transition"
            >
              <span className="text-xl font-semibold text-gray-900 tracking-tight text-title">
                {getTitle()}
              </span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {showYearPicker && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white rounded-[14px] shadow-apple-lg border border-apple-divider p-3 min-w-[280px] z-50 animate-slide-down">
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={() => selectYear(year - 12)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all spring-transition"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="15 18 9 12 15 6"/>
                    </svg>
                  </button>
                  <span className="text-sm font-semibold text-gray-700">{year - 5} - {year + 6}</span>
                  <button
                    onClick={() => selectYear(year + 12)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all spring-transition"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-1 mb-3">
                  {months.map((m, i) => (
                    <button
                      key={m}
                      onClick={() => selectMonth(i)}
                      className={`
                        py-1.5 text-sm font-medium rounded-[8px] transition-all spring-transition
                        ${i === month ? 'bg-apple-blue text-white' : 'text-gray-700 hover:bg-gray-100'}
                      `}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-4 gap-1">
                  {Array.from({ length: 12 }, (_, i) => year - 5 + i).map((y) => (
                    <button
                      key={y}
                      onClick={() => selectYear(y)}
                      className={`
                        py-1.5 text-sm font-medium rounded-[8px] transition-all spring-transition
                        ${y === year ? 'bg-apple-blue text-white' : 'text-gray-700 hover:bg-gray-100'}
                      `}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={nextPeriod}
            className="w-10 h-10 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-white/80 transition-all duration-200 spring-transition active:scale-95"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-gray-100/80 rounded-[10px] p-1">
            <button
              onClick={() => setViewMode('day')}
              className={`
                px-3 py-1.5 text-sm font-medium rounded-[8px] transition-all spring-transition
                ${viewMode === 'day' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}
              `}
            >
              日
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`
                px-3 py-1.5 text-sm font-medium rounded-[8px] transition-all spring-transition
                ${viewMode === 'week' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}
              `}
            >
              周
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`
                px-3 py-1.5 text-sm font-medium rounded-[8px] transition-all spring-transition
                ${viewMode === 'month' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}
              `}
            >
              月
            </button>
          </div>

          <button
            onClick={goToToday}
            className="px-4 py-2 text-sm font-medium text-apple-blue hover:bg-blue-50/80 rounded-[10px] transition-all duration-200 spring-transition active:scale-95"
          >
            今天
          </button>
        </div>
      </div>

      {viewMode === 'month' && (
        <>
          <div className="grid grid-cols-7 px-6 py-3 bg-gray-50/50">
            {weekDays.map((day) => (
              <div key={day} className="text-center text-xs font-semibold text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="flex-1 grid grid-cols-7 px-6 pb-6 overflow-y-auto">
            {days.map((day, index) => {
              const isCurrentMonth = day.getMonth() === month;
              const isToday = isSameDay(day, today);
              const isSelected = isSameDay(day, selectedDate);
              const dayReminders = getRemindersForDate(reminders, day);

              return (
                <CalendarDay
                  key={index}
                  day={day}
                  isCurrentMonth={isCurrentMonth}
                  isToday={isToday}
                  isSelected={isSelected}
                  dayReminders={dayReminders}
                  onSelect={setSelectedDate}
                  lists={lists}
                />
              );
            })}
          </div>
        </>
      )}

      {viewMode === 'day' && (
        <DayView date={selectedDate} reminders={reminders} lists={lists} />
      )}

      {viewMode === 'week' && (
        <WeekView startDate={weeksStartDate} reminders={reminders} lists={lists} />
      )}

      {selectedReminders.length > 0 && viewMode === 'month' && (
        <div className="border-t border-apple-divider px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-gray-700">
              {selectedDate.getMonth() + 1}月{selectedDate.getDate()}日 ({weekDays[selectedDate.getDay()]})
            </div>
            <span className="text-xs text-gray-500">{selectedReminders.length} 项提醒</span>
          </div>
          <div className="space-y-2">
            {selectedReminders.map((reminder) => {
              const rListColor = reminder.list_id
                ? lists.find((l) => l.id === reminder.list_id)?.color || '#FF3B30'
                : '#FF3B30';
              return (
                <div
                  key={reminder.id}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-[12px] bg-white/80 hover:bg-white transition-all duration-200 spring-transition"
                >
                  <span className="inline-block w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: rListColor }} />
                  <span className={`text-sm flex-1 ${reminder.is_completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                    {reminder.title}
                  </span>
                  {reminder.due_time && (
                    <span className="text-xs text-apple-orange font-medium">
                      {reminder.due_time}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}
