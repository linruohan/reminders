import { useState, useMemo, useCallback, useRef } from 'react';
import type { ReminderResponse, ListResponse } from '@/types/api';
import { isSameDay } from '@/utils/dateUtils';
import { getRemindersForDate, getWeekStartMon, HOUR_HEIGHT, timelineHours } from './utils';
import { TimelineSlot, HoverLine, AllDaySection, ReminderBlock } from './TimelineComponents';
import { getListColor } from './utils';

interface DayViewProps {
  date: Date;
  reminders: ReminderResponse[];
  lists: ListResponse[];
  onDoubleClickTimeline: (hour: number, minute: number) => void;
  onReminderClick: (r: ReminderResponse) => void;
  onAllDayDoubleClick: () => void;
}

export function DayView({
  date,
  reminders,
  lists,
  onDoubleClickTimeline,
  onReminderClick,
  onAllDayDoubleClick,
}: DayViewProps) {
  const dayAllDay = useMemo(() => getRemindersForDate(reminders, date).filter(r => r.is_all_day), [reminders, date]);
  const dayTimed = useMemo(() => getRemindersForDate(reminders, date).filter(r => !r.is_all_day), [reminders, date]);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [hoverMinute, setHoverMinute] = useState<number | null>(null);

  const weekDates = useMemo(() => {
    const start = getWeekStartMon(date);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [date]);

  const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

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
      <div className="flex border-b border-apple-divider bg-gray-50/50">
        {weekDates.map((d, i) => {
          const isToday = isSameDay(d, new Date());
          return (
            <div key={i} className="flex-1 text-center py-2 border-l border-gray-200">
              <div className={`text-sm font-medium ${isToday ? 'text-apple-red' : 'text-gray-500'}`}>
                {d.getDate()} {dayNames[d.getDay()]}
              </div>
            </div>
          );
        })}
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
