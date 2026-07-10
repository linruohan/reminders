import { useState } from 'react';
import type { ReminderResponse, ListResponse } from '@/types/api';

interface CalendarViewProps {
  reminders: ReminderResponse[];
  lists: ListResponse[];
}

const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  for (let i = 0; i < firstDay.getDay(); i++) {
    days.push(new Date(year, month, -i));
  }
  days.reverse();

  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i));
  }

  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push(new Date(year, month + 1, i));
  }

  return days;
}

function formatMonthYear(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  return `${year}年${month}月`;
}

function getRemindersForDate(reminders: ReminderResponse[], date: Date): ReminderResponse[] {
  const targetDate = date.toISOString().split('T')[0];
  return reminders.filter((r) => r.due_date === targetDate);
}

export function CalendarView({ reminders, lists }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const days = getDaysInMonth(year, month);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const selectedReminders = getRemindersForDate(reminders, selectedDate);

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

  return (
    <main className="flex-1 h-full flex flex-col bg-white">
      <div className="flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-5">
          <button
            onClick={prevMonth}
            className="w-10 h-10 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100/80 transition-all duration-200"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <span className="text-xl font-bold text-gray-900 tracking-tight">{formatMonthYear(currentDate)}</span>
          <button
            onClick={nextMonth}
            className="w-10 h-10 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100/80 transition-all duration-200"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
        <button
          onClick={goToToday}
          className="px-4 py-2 text-sm font-medium text-apple-blue hover:bg-blue-50/80 rounded-apple-md transition-all duration-200"
        >
          今天
        </button>
      </div>

      <div className="grid grid-cols-7 px-6 py-3">
        {weekDays.map((day) => (
          <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="flex-1 grid grid-cols-7 px-6 pb-6 overflow-y-auto">
        {days.map((day, index) => {
          const isCurrentMonth = day.getMonth() === month;
          const isToday = day.getTime() === today.getTime();
          const isSelected = selectedDate.getDate() === day.getDate() &&
                           selectedDate.getMonth() === day.getMonth() &&
                           selectedDate.getFullYear() === day.getFullYear();
          const dayReminders = getRemindersForDate(reminders, day);
          const hasReminder = dayReminders.length > 0;

          return (
            <div
              key={index}
              onClick={() => setSelectedDate(new Date(day))}
              className={`
                min-h-[88px] p-2 cursor-pointer relative
                transition-all duration-200 rounded-apple-md
                ${isSelected ? 'bg-blue-50/60' : 'hover:bg-gray-50/60'}
              `}
            >
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold mx-auto
                  transition-all duration-200
                  ${isToday && isCurrentMonth ? 'bg-apple-red text-white shadow-md shadow-red-500/30' : ''}
                  ${isSelected && !isToday ? 'bg-apple-blue text-white' : ''}
                  ${!isSelected && !isToday ? (isCurrentMonth ? 'text-gray-900' : 'text-gray-400') : ''}
                `}
              >
                {day.getDate()}
              </div>

              {hasReminder && (
                <div className="mt-2 space-y-1.5 px-1">
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
            </div>
          );
        })}
      </div>

      {selectedReminders.length > 0 && (
        <div className="border-t border-apple-divider px-6 py-4 glass-effect-dark">
          <div className="text-sm font-medium text-gray-700 mb-3">
            {selectedDate.getMonth() + 1}月{selectedDate.getDate()}日 ({weekDays[selectedDate.getDay()]})
          </div>
          <div className="space-y-2">
            {selectedReminders.map((reminder) => {
              const rListColor = reminder.list_id
                ? lists.find((l) => l.id === reminder.list_id)?.color || '#FF3B30'
                : '#FF3B30';
              return (
                <div
                  key={reminder.id}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-apple-md bg-white/60 hover:bg-white/80 transition-all duration-200"
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
