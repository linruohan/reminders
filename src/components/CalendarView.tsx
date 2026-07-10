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
        min-h-[88px] p-2 cursor-pointer relative
        transition-all duration-150 rounded-apple-md
        ${isSelected ? 'bg-blue-50/80' : 'hover:bg-gray-50/70'}
      `}
    >
      <div
        className={`
          w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold mx-auto
          transition-all duration-150
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
                className="text-xs truncate px-2 py-1 rounded-apple-sm bg-gray-100/60 hover:bg-gray-200/60 transition-colors"
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

export function CalendarView({ reminders, lists }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showYearPicker, setShowYearPicker] = useState(false);

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

  const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
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

  return (
    <main className="flex-1 h-full flex flex-col bg-white">
      <div className="flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-4">
          <button
            onClick={prevMonth}
            className="w-10 h-10 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100/80 transition-all duration-150 active:scale-95"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>

          <div className="relative">
            <button
              onClick={() => setShowYearPicker(!showYearPicker)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-apple-md hover:bg-gray-100/60 transition-colors"
            >
              <span className="text-xl font-semibold text-gray-900 tracking-tight">
                {formatMonthYear(currentDate)}
              </span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {showYearPicker && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white rounded-apple-lg shadow-apple-lg border border-apple-divider p-3 min-w-[280px] z-50 animate-slide-down">
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={() => selectYear(year - 12)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="15 18 9 12 15 6"/>
                    </svg>
                  </button>
                  <span className="text-sm font-semibold text-gray-700">{year - 5} - {year + 6}</span>
                  <button
                    onClick={() => selectYear(year + 12)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all"
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
                        py-1.5 text-sm font-medium rounded-apple-sm transition-all
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
                        py-1.5 text-sm font-medium rounded-apple-sm transition-all
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
            onClick={nextMonth}
            className="w-10 h-10 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100/80 transition-all duration-150 active:scale-95"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>

        <button
          onClick={goToToday}
          className="px-4 py-2 text-sm font-medium text-apple-blue hover:bg-blue-50/80 rounded-apple-md transition-all duration-150 active:scale-95"
        >
          今天
        </button>
      </div>

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

      {selectedReminders.length > 0 && (
        <div className="border-t border-apple-divider px-6 py-4 glass-effect-dark">
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
                  className="flex items-center gap-3 px-4 py-2.5 rounded-apple-md bg-white/60 hover:bg-white/80 transition-all duration-150"
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
