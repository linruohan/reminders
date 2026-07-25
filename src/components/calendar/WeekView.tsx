import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type { ReminderResponse, ListResponse } from '@/types/api';
import { isSameDay, toISODateStr } from '@/utils/dateUtils';
import {
  getRemindersForDate,
  HOUR_HEIGHT,
  TIMELINE_HEIGHT,
  TIMELINE_START_HOUR,
  timelineHours,
  weekDays,
  clampMinuteOfDay,
  hourMinuteToTop,
  minuteOfDayToTop,
  scrollTimelineToHour,
  snapMinute,
  minuteOfDayToTimeString,
} from './utils';
import { TimelineSlot, HoverLine } from './TimelineComponents';
import { getListColor } from './utils';

interface WeekViewProps {
  startDate: Date;
  reminders: ReminderResponse[];
  lists: ListResponse[];
  onDoubleClickTimeline: (hour: number, minute: number, date: Date) => void;
  onReminderClick: (r: ReminderResponse) => void;
  onAllDayDoubleClick: (date: Date) => void;
  onRescheduleReminder?: (id: string, updates: { end_date: string; end_time: string | null; is_all_day?: boolean }) => void;
}

const DRAG_THRESHOLD = 5;

export function WeekView({
  startDate,
  reminders,
  lists,
  onDoubleClickTimeline,
  onReminderClick,
  onAllDayDoubleClick,
  onRescheduleReminder,
}: WeekViewProps) {
  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      return d;
    });
  }, [startDate]);

  const timelineRef = useRef<HTMLDivElement>(null);
  const [hoverInfo, setHoverInfo] = useState<{ minute: number; col: number } | null>(null);
  const [drag, setDrag] = useState<{
    reminder: ReminderResponse;
    minute: number;
    col: number;
    started: boolean;
    ox: number;
    oy: number;
  } | null>(null);
  const dragRef = useRef(drag);
  dragRef.current = drag;

  const [allDayDrag, setAllDayDrag] = useState<{
    reminder: ReminderResponse;
    col: number;
    started: boolean;
    ox: number;
    oy: number;
  } | null>(null);
  const allDayDragRef = useRef(allDayDrag);
  allDayDragRef.current = allDayDrag;

  useEffect(() => {
    scrollTimelineToHour(timelineRef.current, new Date().getHours());
  }, [startDate]);

  const getHoverInfo = useCallback((clientX: number, clientY: number) => {
    if (!timelineRef.current) return null;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top + timelineRef.current.scrollTop;
    const colWidth = rect.width / 7;
    const col = Math.min(6, Math.max(0, Math.floor(x / colWidth)));
    const minute = clampMinuteOfDay((y / HOUR_HEIGHT) * 60);
    return { minute, col };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragRef.current?.started) return;
    const info = getHoverInfo(e.clientX, e.clientY);
    if (info) setHoverInfo(info);
  }, [getHoverInfo]);

  const handleMouseLeave = useCallback(() => {
    if (!dragRef.current) setHoverInfo(null);
  }, []);

  const handleDblClick = useCallback((e: React.MouseEvent) => {
    if (dragRef.current?.started) return;
    const info = getHoverInfo(e.clientX, e.clientY);
    if (!info) return;
    onDoubleClickTimeline(
      TIMELINE_START_HOUR + Math.floor(info.minute / 60),
      info.minute % 60,
      weekDates[info.col],
    );
  }, [getHoverInfo, onDoubleClickTimeline, weekDates]);

  const handleBlockPointerDown = useCallback((e: React.PointerEvent, reminder: ReminderResponse, col: number) => {
    if (e.button !== 0 || !onRescheduleReminder) return;
    e.stopPropagation();
    const info = getHoverInfo(e.clientX, e.clientY);
    if (!info) return;
    setDrag({
      reminder,
      minute: info.minute,
      col,
      started: false,
      ox: e.clientX,
      oy: e.clientY,
    });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [getHoverInfo, onRescheduleReminder]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dist = Math.hypot(e.clientX - d.ox, e.clientY - d.oy);
    const info = getHoverInfo(e.clientX, e.clientY);
    if (!info) return;
    if (!d.started && dist < DRAG_THRESHOLD) return;
    setDrag({ ...d, started: true, minute: snapMinute(info.minute), col: info.col });
    setHoverInfo({ minute: snapMinute(info.minute), col: info.col });
  }, [getHoverInfo]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    setDrag(null);
    setHoverInfo(null);
    if (!d) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch { /* ignore */ }
    if (!d.started) {
      onReminderClick(d.reminder);
      return;
    }
    onRescheduleReminder?.(d.reminder.id, {
      end_date: toISODateStr(weekDates[d.col]),
      end_time: minuteOfDayToTimeString(d.minute),
    });
  }, [weekDates, onReminderClick, onRescheduleReminder]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex border-b border-apple-divider bg-gray-50/50">
        <div className="w-14 flex-shrink-0" />
        <div className="flex-1 grid grid-cols-7">
          {weekDates.map((d, i) => {
            const isToday = isSameDay(d, new Date());
            return (
              <div key={i} className="text-center py-2 border-l border-gray-200">
                <div className={`text-xs font-semibold ${isToday ? 'text-apple-red' : 'text-gray-500'}`}>{weekDays[i]}</div>
                <div className={`text-base font-semibold ${isToday ? 'text-apple-red' : 'text-gray-800'}`}>{d.getDate()}</div>
              </div>
            );
          })}
        </div>
      </div>
      <div
        className="flex border-b border-apple-divider bg-gray-50/40"
        style={{ height: HOUR_HEIGHT }}
        onDoubleClick={() => onAllDayDoubleClick(weekDates[0])}
        onPointerMove={(e) => {
          const d = allDayDragRef.current;
          if (!d) return;
          const dist = Math.hypot(e.clientX - d.ox, e.clientY - d.oy);
          const rect = (e.currentTarget as HTMLElement).querySelector('.allday-grid')?.getBoundingClientRect();
          if (!rect) return;
          const colWidth = rect.width / 7;
          const col = Math.min(6, Math.max(0, Math.floor((e.clientX - rect.left) / colWidth)));
          if (!d.started && dist < DRAG_THRESHOLD) return;
          setAllDayDrag({ ...d, started: true, col });
        }}
        onPointerUp={(e) => {
          const d = allDayDragRef.current;
          setAllDayDrag(null);
          if (!d) return;
          try {
            (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
          } catch { /* ignore */ }
          if (!d.started) {
            onReminderClick(d.reminder);
            return;
          }
          onRescheduleReminder?.(d.reminder.id, {
            end_date: toISODateStr(weekDates[d.col]),
            end_time: '',
            is_all_day: true,
          });
        }}
      >
        <div className="w-14 flex-shrink-0 flex items-center justify-end pr-2">
          <span className="text-xs text-gray-400 font-medium">全天</span>
        </div>
        <div className="flex-1 grid grid-cols-7 allday-grid">
          {weekDates.map((d, i) => {
            const dayAllDay = getRemindersForDate(reminders, d).filter(r => r.is_all_day || !r.end_time);
            return (
              <div
                key={i}
                className={`flex items-center gap-1 overflow-x-auto px-2 border-l border-gray-200 min-h-0 ${
                  allDayDrag?.started && allDayDrag.col === i ? 'bg-blue-50/60' : ''
                }`}
                onDoubleClick={() => onAllDayDoubleClick(d)}
              >
                {dayAllDay.map(r => {
                  if (allDayDrag?.started && allDayDrag.reminder.id === r.id) return null;
                  const color = getListColor(lists, r.list_id);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onPointerDown={(e) => {
                        if (e.button !== 0 || !onRescheduleReminder) return;
                        e.stopPropagation();
                        setAllDayDrag({
                          reminder: r,
                          col: i,
                          started: false,
                          ox: e.clientX,
                          oy: e.clientY,
                        });
                        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                      }}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-[6px] bg-white/80 hover:bg-white hover:ring-1 hover:ring-apple-blue/45 shadow-sm text-xs transition-all whitespace-nowrap cursor-grab active:cursor-grabbing"
                    >
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      <span className={r.is_completed ? 'text-gray-400 line-through' : 'text-gray-700'}>{r.title}</span>
                    </button>
                  );
                })}
                {allDayDrag?.started && allDayDrag.col === i && (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-[6px] bg-blue-50 border border-apple-blue/30 text-xs whitespace-nowrap opacity-90 pointer-events-none">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: getListColor(lists, allDayDrag.reminder.list_id) }} />
                    <span className="text-gray-800">{allDayDrag.reminder.title}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div
        ref={timelineRef}
        className="flex-1 overflow-y-auto relative"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onDoubleClick={handleDblClick}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div className="flex relative" style={{ height: TIMELINE_HEIGHT }}>
          <div className="w-14 flex-shrink-0">
            {timelineHours.map(hour => (
              <TimelineSlot key={hour} hour={hour} />
            ))}
          </div>
          <div className="flex-1 grid grid-cols-7 relative">
            {weekDates.map((d, colIdx) => {
              const dayTimed = getRemindersForDate(reminders, d).filter(r => !r.is_all_day && !!r.end_time);
              return (
                <div key={colIdx} className="relative border-l border-gray-200">
                  {dayTimed.map(r => {
                    if (drag?.started && drag.reminder.id === r.id) return null;
                    const dueTime = r.end_time;
                    const hour = dueTime ? parseInt(dueTime.split(':')[0], 10) : 9;
                    const minute = dueTime ? parseInt(dueTime.split(':')[1], 10) : 0;
                    const top = hourMinuteToTop(hour, minute);
                    const color = getListColor(lists, r.list_id);
                    const height = (30 / 60) * HOUR_HEIGHT;
                    return (
                      <div
                        key={r.id}
                        className="absolute left-0.5 right-0.5 z-10 cursor-grab active:cursor-grabbing"
                        style={{ top, height }}
                        onPointerDown={(e) => handleBlockPointerDown(e, r, colIdx)}
                      >
                        <div className="h-full rounded-apple-sm border-l-[3px] bg-blue-50/60 shadow-sm hover:shadow-md hover:ring-1 hover:ring-apple-blue/50 hover:bg-blue-50 transition-all duration-200 flex items-center px-1.5" style={{ borderLeftColor: color }}>
                          <div className="flex items-center gap-1 w-full">
                            <span className={`flex-1 text-[11px] font-medium truncate leading-tight ${r.is_completed ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                              {r.title}
                            </span>
                            {dueTime && (
                              <span className="text-[9px] font-medium text-gray-400 flex-shrink-0">{dueTime}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {drag?.started && drag.col === colIdx && (
                    <div
                      className="absolute left-0.5 right-0.5 z-30 opacity-90 pointer-events-none"
                      style={{ top: minuteOfDayToTop(drag.minute), height: (30 / 60) * HOUR_HEIGHT }}
                    >
                      <div className="h-full rounded-apple-sm border-l-[3px] bg-blue-50/80 border-blue-400 flex items-center px-1.5 shadow-md" style={{ borderLeftColor: getListColor(lists, drag.reminder.list_id) }}>
                        <span className="text-[11px] font-medium truncate text-gray-800">{drag.reminder.title}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {(hoverInfo !== null || drag?.started) && (
            <HoverLine minute={drag?.started ? drag.minute : (hoverInfo?.minute ?? 0)} />
          )}
        </div>
      </div>
    </div>
  );
}
