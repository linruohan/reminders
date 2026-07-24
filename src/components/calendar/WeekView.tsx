import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type { ReminderResponse, ListResponse } from '@/types/api';
import { isSameDay } from '@/utils/dateUtils';
import {
  getRemindersForDate,
  HOUR_HEIGHT,
  TIMELINE_HEIGHT,
  TIMELINE_START_HOUR,
  timelineHours,
  weekDays,
  clampMinuteOfDay,
  formatHourMinute,
  hourMinuteToTop,
  minuteOfDayToTop,
  scrollTimelineToHour,
} from './utils';
import { TimelineSlot } from './TimelineComponents';
import { getListColor } from './utils';

interface WeekViewProps {
  startDate: Date;
  reminders: ReminderResponse[];
  lists: ListResponse[];
  onDoubleClickTimeline: (hour: number, minute: number, date: Date) => void;
  onReminderClick: (r: ReminderResponse) => void;
  onAllDayDoubleClick: (date: Date) => void;
}

export function WeekView({
  startDate,
  reminders,
  lists,
  onDoubleClickTimeline,
  onReminderClick,
  onAllDayDoubleClick,
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

  useEffect(() => {
    scrollTimelineToHour(timelineRef.current, new Date().getHours());
  }, [startDate]);

  const getHoverInfo = useCallback((clientX: number, clientY: number) => {
    if (!timelineRef.current) return null;
    const rect = timelineRef.current.getBoundingClientRect();
    const scrollTop = timelineRef.current.scrollTop;
    const x = clientX - rect.left;
    const y = clientY - rect.top + scrollTop;
    const colWidth = rect.width / 7;
    const col = Math.min(6, Math.max(0, Math.floor(x / colWidth)));
    const minute = clampMinuteOfDay((y / HOUR_HEIGHT) * 60);
    return { minute, col };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const info = getHoverInfo(e.clientX, e.clientY);
    if (info) setHoverInfo(info);
  }, [getHoverInfo]);

  const handleMouseLeave = useCallback(() => setHoverInfo(null), []);

  const handleDblClick = useCallback((e: React.MouseEvent) => {
    const info = getHoverInfo(e.clientX, e.clientY);
    if (!info) return;
    const hour = TIMELINE_START_HOUR + Math.floor(info.minute / 60);
    const minute = info.minute % 60;
    onDoubleClickTimeline(hour, minute, weekDates[info.col]);
  }, [getHoverInfo, onDoubleClickTimeline, weekDates]);

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
      >
        <div className="w-14 flex-shrink-0 flex items-center justify-end pr-2">
          <span className="text-xs text-gray-400 font-medium">全天</span>
        </div>
        <div className="flex-1 grid grid-cols-7">
          {weekDates.map((d, i) => {
            const dayAllDay = getRemindersForDate(reminders, d).filter(r => r.is_all_day || !r.end_time);
            return (
              <div key={i} className="flex items-center gap-1 overflow-x-auto px-2 border-l border-gray-200" onDoubleClick={() => onAllDayDoubleClick(d)}>
                {dayAllDay.map(r => {
                  const color = getListColor(lists, r.list_id);
                  return (
                    <button key={r.id} onClick={() => onReminderClick(r)}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-[6px] bg-white/80 hover:bg-white shadow-sm text-xs transition-colors spring-transition whitespace-nowrap"
                    >
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      <span className={r.is_completed ? 'text-gray-400 line-through' : 'text-gray-700'}>{r.title}</span>
                    </button>
                  );
                })}
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
                    const dueTime = r.end_time;
                    const hour = dueTime ? parseInt(dueTime.split(':')[0], 10) : 9;
                    const minute = dueTime ? parseInt(dueTime.split(':')[1], 10) : 0;
                    const top = hourMinuteToTop(hour, minute);
                    const height = (30 / 60) * HOUR_HEIGHT;
                    const color = getListColor(lists, r.list_id);
                    return (
                      <div
                        key={r.id}
                        className="absolute left-0.5 right-0.5 z-10 cursor-pointer"
                        style={{ top, height }}
                        onClick={() => onReminderClick(r)}
                      >
                        <div className="h-full rounded-apple-sm border-l-[3px] bg-blue-50/60 border-blue-400 shadow-sm hover:shadow-md transition-shadow spring-transition flex items-center px-1.5" style={{ borderLeftColor: color }}>
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
                </div>
              );
            })}
          </div>
          {hoverInfo !== null && (
            <div className="absolute left-0 right-0 z-30 pointer-events-none" style={{ top: minuteOfDayToTop(hoverInfo.minute) }}>
              <div className="flex items-center ml-14">
                <div className="flex-1 border-t border-red-400/70" />
                <span className="text-[10px] font-medium text-red-500 bg-white/90 px-1 rounded-sm leading-tight whitespace-nowrap">
                  {formatHourMinute(
                    TIMELINE_START_HOUR + Math.floor(hoverInfo.minute / 60),
                    hoverInfo.minute % 60,
                  )}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
