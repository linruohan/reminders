import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReminderResponse, ListResponse } from '@/types/api';
import { isSameDay, toISODateStr } from '@/utils/dateUtils';
import { getListColor, groupRemindersByDate, weekDays, DRAG_THRESHOLD } from './utils';

interface MonthViewProps {
  month: number;
  days: Date[];
  today: Date;
  selectedDate: Date;
  reminders: ReminderResponse[];
  lists: ListResponse[];
  onSelectDate: (d: Date) => void;
  onDayDoubleClick?: (d: Date) => void;
  onReminderClick: (r: ReminderResponse) => void;
  onRescheduleReminder?: (id: string, updates: {
    end_date: string;
    end_time?: string | null;
    is_all_day?: boolean;
  }) => void;
}

export function MonthView({
  month,
  days,
  today,
  selectedDate,
  reminders,
  lists,
  onSelectDate,
  onDayDoubleClick,
  onReminderClick,
  onRescheduleReminder,
}: MonthViewProps) {
  const [drag, setDrag] = useState<{
    reminder: ReminderResponse;
    dayIndex: number;
    started: boolean;
    ox: number;
    oy: number;
  } | null>(null);
  const dragRef = useRef(drag);
  dragRef.current = drag;
  const cellRefs = useRef<(HTMLDivElement | null)[]>([]);
  const clickTimerRef = useRef<number | null>(null);
  const remindersByDate = useMemo(() => groupRemindersByDate(reminders), [reminders]);

  useEffect(() => {
    return () => {
      if (clickTimerRef.current !== null) {
        window.clearTimeout(clickTimerRef.current);
      }
    };
  }, []);

  const dayIndexFromPoint = useCallback((clientX: number, clientY: number) => {
    for (let i = 0; i < cellRefs.current.length; i++) {
      const el = cellRefs.current[i];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
        return i;
      }
    }
    return null;
  }, []);

  return (
    <div
      className="flex-1 flex flex-col overflow-hidden"
      onPointerMove={(e) => {
        const d = dragRef.current;
        if (!d) return;
        const dist = Math.hypot(e.clientX - d.ox, e.clientY - d.oy);
        const idx = dayIndexFromPoint(e.clientX, e.clientY);
        if (idx === null) return;
        if (!d.started && dist < DRAG_THRESHOLD) return;
        setDrag({ ...d, started: true, dayIndex: idx });
      }}
      onPointerUp={(e) => {
        const d = dragRef.current;
        setDrag(null);
        if (!d) return;
        try {
          (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
        } catch { /* ignore */ }
        if (!d.started) {
          onReminderClick(d.reminder);
          return;
        }
        const target = days[d.dayIndex];
        if (!target) return;
        onRescheduleReminder?.(d.reminder.id, {
          end_date: toISODateStr(target),
          ...(d.reminder.is_all_day || !d.reminder.end_time
            ? { end_time: '', is_all_day: true }
            : {}),
        });
      }}
    >
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
          const dayReminders = remindersByDate.get(toISODateStr(day)) ?? [];
          const isLastRow = index >= days.length - 7;
          const isDropTarget = drag?.started && drag.dayIndex === index;
          return (
            <div
              key={index}
              ref={(el) => { cellRefs.current[index] = el; }}
              onClick={() => {
                if (dragRef.current?.started) return;
                const dayCopy = new Date(day);
                if (clickTimerRef.current !== null) {
                  window.clearTimeout(clickTimerRef.current);
                  clickTimerRef.current = null;
                  onDayDoubleClick?.(dayCopy);
                  return;
                }
                clickTimerRef.current = window.setTimeout(() => {
                  clickTimerRef.current = null;
                  onSelectDate(dayCopy);
                }, 250);
              }}
              className={`min-h-[80px] p-2 cursor-pointer transition-all duration-200 border-l border-gray-200 ${index % 7 === 0 ? 'border-l-0' : ''} ${isLastRow ? '' : 'border-b border-gray-200'} ${
                isDropTarget ? 'bg-blue-100/80 ring-1 ring-inset ring-apple-blue/30' : isSelected ? 'bg-blue-50/90' : 'hover:bg-white/80'
              } ${!isCurrentMonth ? 'opacity-40' : ''}`}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold mx-auto ${
                isToday ? 'bg-apple-red text-white shadow-sm' : isSelected && !isToday ? 'bg-apple-blue text-white' : isCurrentMonth ? 'text-gray-800' : 'text-gray-400'
              }`}>
                {day.getDate()}
              </div>
              {dayReminders.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {dayReminders.slice(0, 3).map(r => {
                    if (drag?.started && drag.reminder.id === r.id) return null;
                    return (
                      <div
                        key={r.id}
                        onPointerDown={(e) => {
                          if (e.button !== 0 || !onRescheduleReminder) return;
                          e.stopPropagation();
                          setDrag({
                            reminder: r,
                            dayIndex: index,
                            started: false,
                            ox: e.clientX,
                            oy: e.clientY,
                          });
                          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                        }}
                        className="text-[10px] truncate px-1.5 py-0.5 rounded-[6px] bg-white/90 hover:bg-white hover:ring-1 hover:ring-apple-blue/45 transition-all cursor-grab active:cursor-grabbing"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle" style={{ backgroundColor: getListColor(lists, r.list_id) }} />
                        <span className={r.is_completed ? 'text-gray-400 line-through' : 'text-gray-700'}>{r.title}</span>
                      </div>
                    );
                  })}
                  {drag?.started && drag.dayIndex === index && (
                    <div className="text-[10px] truncate px-1.5 py-0.5 rounded-[6px] bg-blue-50 border border-apple-blue/30 pointer-events-none">
                      <span className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle" style={{ backgroundColor: getListColor(lists, drag.reminder.list_id) }} />
                      <span className="text-gray-800">{drag.reminder.title}</span>
                    </div>
                  )}
                  {dayReminders.length > 3 && (
                    <div className="text-[10px] text-gray-400 px-1.5">+{dayReminders.length - 3} 更多</div>
                  )}
                </div>
              )}
              {dayReminders.length === 0 && drag?.started && drag.dayIndex === index && (
                <div className="mt-1">
                  <div className="text-[10px] truncate px-1.5 py-0.5 rounded-[6px] bg-blue-50 border border-apple-blue/30 pointer-events-none">
                    <span className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle" style={{ backgroundColor: getListColor(lists, drag.reminder.list_id) }} />
                    <span className="text-gray-800">{drag.reminder.title}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
