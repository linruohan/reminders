import { useState } from 'react';
import type { ReminderResponse, ListResponse } from '@/types/api';

interface CalendarViewProps {
  reminders: ReminderResponse[];
  lists: ListResponse[];
}

const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

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
      <div className="flex items-center justify-between px-6 py-4 border-b border-apple-divider">
        <div className="flex items-center gap-4">
          <button
            onClick={prevMonth}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <span className="text-xl font-semibold text-gray-900">{formatMonthYear(currentDate)}</span>
          <button
            onClick={nextMonth}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
        <button
          onClick={goToToday}
          className="px-4 py-2 text-sm font-medium text-apple-blue hover:bg-blue-50 rounded-apple-sm transition-colors"
        >
          今天
        </button>
      </div>

      <div className="grid grid-cols-7 px-4 py-2 border-b border-apple-divider">
        {weekDays.map((day) => (
          <div key={day} className="text-center text-xs font-medium text-apple-gray py-1">
            {day}
          </div>
        ))}
      </div>

      <div className="flex-1 grid grid-cols-7 overflow-y-auto">
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
                min-h-[80px] p-2 border-b border-r border-apple-divider cursor-pointer
                transition-colors duration-150 relative
                ${!isCurrentMonth ? 'bg-gray-50/30' : 'bg-white'}
                ${isToday && isCurrentMonth ? 'bg-blue-50/50' : ''}
                ${isSelected ? 'bg-blue-50' : ''}
                hover:bg-gray-50/50
              `}
            >
              <div
                className={`
                  w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium mx-auto
                  ${isToday && isCurrentMonth ? 'bg-apple-blue text-white' : ''}
                  ${isSelected && !isToday ? 'bg-blue-100 text-apple-blue' : ''}
                  ${!isSelected && !isToday ? (isCurrentMonth ? 'text-gray-900' : 'text-apple-gray') : ''}
                `}
              >
                {day.getDate()}
              </div>
              
              {hasReminder && (
                <div className="mt-2 space-y-1">
                  {dayReminders.slice(0, 3).map((reminder, i) => {
                    const rListColor = reminder.list_id 
                      ? lists.find((l) => l.id === reminder.list_id)?.color || '#007AFF'
                      : '#007AFF';
                    return (
                      <div
                        key={i}
                        className="text-xs truncate px-1 py-0.5 rounded bg-gray-50/50"
                      >
                        <span className="inline-block w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: rListColor }} />
                        <span className={reminder.is_completed ? 'text-apple-gray line-through' : 'text-gray-700'}>
                          {reminder.title}
                        </span>
                      </div>
                    );
                  })}
                  {dayReminders.length > 3 && (
                    <div className="text-xs text-apple-gray px-1">+{dayReminders.length - 3} 更多</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedReminders.length > 0 && (
        <div className="border-t border-apple-divider p-4 bg-gray-50/50">
          <div className="text-sm font-medium text-gray-700 mb-2">
            {selectedDate.getMonth() + 1}月{selectedDate.getDate()}日 ({weekDays[selectedDate.getDay()]})
          </div>
          <div className="space-y-1">
            {selectedReminders.map((reminder) => {
              const rListColor = reminder.list_id 
                ? lists.find((l) => l.id === reminder.list_id)?.color || '#007AFF'
                : '#007AFF';
              return (
                <div
                  key={reminder.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-apple-sm bg-white hover:bg-gray-50 transition-colors"
                >
                  <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: rListColor }} />
                  <span className={`text-sm flex-1 ${reminder.is_completed ? 'text-apple-gray line-through' : 'text-gray-900'}`}>
                    {reminder.title}
                  </span>
                  {reminder.due_time && (
                    <span className="text-xs text-apple-orange">
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
