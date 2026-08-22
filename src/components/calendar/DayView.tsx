import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type { ReminderResponse, ListResponse } from '@/types/api';
import { isSameDay, toISODateStr } from '@/utils/dateUtils';
import {
  getRemindersForDate,
  getWeekDates,
  getWeekStartMon,
  HOUR_HEIGHT,
  TIMELINE_HEIGHT,
  TIMELINE_START_HOUR,
  timelineHours,
  clampMinuteOfDay,
  partitionByAllDay,
  scrollTimelineToHour,
  snapMinute,
  minuteOfDayToTimeString,
  minuteOfDayToTop,
  getListColor,
  DRAG_THRESHOLD,
} from './utils';
import { TimelineSlot, HoverLine, AllDaySection, ReminderBlock } from './TimelineComponents';

interface DayViewProps {
  date: Date;
  reminders: ReminderResponse[];
  lists: ListResponse[];
  onDoubleClickTimeline: (hour: number, minute: number) => void;
  onReminderClick: (r: ReminderResponse) => void;
  onAllDayDoubleClick: () => void;
  onRescheduleReminder?: (id: string, updates: { end_date: string; end_time: string }) => void;
}

export function DayView({
  date,
  reminders,
  lists,
  onDoubleClickTimeline,
  onReminderClick,
  onAllDayDoubleClick,
  onRescheduleReminder,
}: DayViewProps) {
  const dayReminders = useMemo(() => getRemindersForDate(reminders, date), [reminders, date]);
  const { allDay: dayAllDay, timed: dayTimed } = useMemo(() => partitionByAllDay(dayReminders), [dayReminders]);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [hoverMinute, setHoverMinute] = useState<number | null>(null);
  const [drag, setDrag] = useState<{
    reminder: ReminderResponse;
    minute: number;
    started: boolean;
    ox: number;
    oy: number;
  } | null>(null);
  const dragRef = useRef(drag);
  dragRef.current = drag;

  const weekDates = useMemo(() => getWeekDates(getWeekStartMon(date)), [date]);

  const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

  useEffect(() => {
    const hour = isSameDay(date, new Date()) ? new Date().getHours() : 8;
    scrollTimelineToHour(timelineRef.current, hour);
  }, [date]);

  const getMinuteFromY = useCallback((clientY: number) => {
    if (!timelineRef.current) return null;
    const rect = timelineRef.current.getBoundingClientRect();
    const y = clientY - rect.top + timelineRef.current.scrollTop;
    return clampMinuteOfDay((y / HOUR_HEIGHT) * 60);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragRef.current?.started) return;
    const m = getMinuteFromY(e.clientY);
    if (m !== null) setHoverMinute(m);
  }, [getMinuteFromY]);

  const handleMouseLeave = useCallback(() => {
    if (!dragRef.current) setHoverMinute(null);
  }, []);

  const handleDblClick = useCallback((e: React.MouseEvent) => {
    if (dragRef.current?.started) return;
    const m = getMinuteFromY(e.clientY);
    if (m === null) return;
    onDoubleClickTimeline(TIMELINE_START_HOUR + Math.floor(m / 60), m % 60);
  }, [getMinuteFromY, onDoubleClickTimeline]);

  const handleBlockPointerDown = useCallback((e: React.PointerEvent, reminder: ReminderResponse) => {
    if (e.button !== 0 || !onRescheduleReminder) return;
    const m = getMinuteFromY(e.clientY);
    if (m === null) return;
    setDrag({ reminder, minute: m, started: false, ox: e.clientX, oy: e.clientY });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [getMinuteFromY, onRescheduleReminder]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dist = Math.hypot(e.clientX - d.ox, e.clientY - d.oy);
    const m = getMinuteFromY(e.clientY);
    if (m === null) return;
    if (!d.started && dist < DRAG_THRESHOLD) return;
    setDrag({ ...d, started: true, minute: snapMinute(m) });
    setHoverMinute(snapMinute(m));
  }, [getMinuteFromY]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    setDrag(null);
    setHoverMinute(null);
    if (!d) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch { /* ignore */ }
    if (!d.started) {
      onReminderClick(d.reminder);
      return;
    }
    onRescheduleReminder?.(d.reminder.id, {
      end_date: toISODateStr(date),
      end_time: minuteOfDayToTimeString(d.minute),
    });
  }, [date, onReminderClick, onRescheduleReminder]);

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
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div className="relative" style={{ height: TIMELINE_HEIGHT }}>
          {timelineHours.map(hour => (
            <TimelineSlot key={hour} hour={hour} />
          ))}
          {(hoverMinute !== null || drag?.started) && (
            <HoverLine minute={drag?.started ? drag.minute : (hoverMinute ?? 0)} />
          )}
          {dayTimed.map(r => {
            const isDragging = drag?.started && drag.reminder.id === r.id;
            return (
              <ReminderBlock
                key={r.id}
                reminder={r}
                listColor={getListColor(lists, r.list_id)}
                onClick={onReminderClick}
                onPointerDown={onRescheduleReminder ? handleBlockPointerDown : undefined}
                dragTop={isDragging ? minuteOfDayToTop(drag.minute) : undefined}
                isDragging={isDragging}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
