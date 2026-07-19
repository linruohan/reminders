import type { ReminderResponse, ListResponse } from '@/types/api';
import { isSameDay } from '@/utils/dateUtils';
import { getRemindersForDate, weekDays } from './utils';
import { getListColor } from './utils';

interface MonthViewProps {
  month: number;
  days: Date[];
  today: Date;
  selectedDate: Date;
  reminders: ReminderResponse[];
  lists: ListResponse[];
  onSelectDate: (d: Date) => void;
  onReminderClick: (r: ReminderResponse) => void;
}

export function MonthView({
  month,
  days,
  today,
  selectedDate,
  reminders,
  lists,
  onSelectDate,
  onReminderClick,
}: MonthViewProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="grid grid-cols-7 px-4 py-2 bg-gray-50/50 border-b border-apple-divider">
        {weekDays.map(d => (
          <div key={d} className="text-center text-xs font-semibold text-gray-500 py-1 border-l border-gray-200 first:border-l-0">{d}</div>
        ))}
      </div>
      <div className="flex-1 grid grid-cols-7 px-4 pb-4 overflow-y-auto auto-rows-fr">
        {days.map((day, index) => {
          const isCurrentMonth = day.getMonth() === month;
          const isToday = isSameDay(day, today);
          const isSelected = isSameDay(day, selectedDate);
          const dayReminders = getRemindersForDate(reminders, day);
          const isLastRow = index >= days.length - 7;
          return (
            <div
              key={index}
              onClick={() => onSelectDate(new Date(day))}
              className={`min-h-[80px] p-2 cursor-pointer transition-all duration-200 spring-transition border-l border-gray-200 ${index % 7 === 0 ? 'border-l-0' : ''} ${isLastRow ? '' : 'border-b border-gray-200'} ${
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
