import type { ReminderResponse, ListResponse } from '@/types/api';
import { toISODateStr } from '@/utils/dateUtils';

export const weekDays = ['一', '二', '三', '四', '五', '六', '日'];

/** 全天 0–23 点时间轴 */
export const TIMELINE_START_HOUR = 0;
export const TIMELINE_HOURS = 24;
export const timelineHours = Array.from({ length: TIMELINE_HOURS }, (_, i) => i + TIMELINE_START_HOUR);
export const HOUR_HEIGHT = 56;
export const TIMELINE_HEIGHT = TIMELINE_HOURS * HOUR_HEIGHT;
export const TIMELINE_TOTAL_MINUTES = TIMELINE_HOURS * 60;
export const BLOCK_MINUTES = 30;
export const DRAG_THRESHOLD = 5;

export function clampMinuteOfDay(minute: number): number {
  return Math.max(0, Math.min(TIMELINE_TOTAL_MINUTES - 1, Math.round(minute)));
}

export function minuteOfDayToTop(minuteOfDay: number): number {
  return (minuteOfDay / 60) * HOUR_HEIGHT;
}

export function hourMinuteToTop(hour: number, minute: number): number {
  return (hour - TIMELINE_START_HOUR) * HOUR_HEIGHT + (minute / 60) * HOUR_HEIGHT;
}

export function formatHourMinute(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function minuteOfDayToTimeString(minuteOfDay: number): string {
  const clamped = clampMinuteOfDay(minuteOfDay);
  const h = TIMELINE_START_HOUR + Math.floor(clamped / 60);
  const m = clamped % 60;
  return formatHourMinute(h, m);
}

export function snapMinute(minute: number, step = 15): number {
  return clampMinuteOfDay(Math.round(minute / step) * step);
}

/** 打开日/周视图时滚到当前时刻附近（略往上留一点） */
export function scrollTimelineToHour(container: HTMLElement | null, hour: number) {
  if (!container) return;
  const target = Math.max(0, (hour - TIMELINE_START_HOUR - 1) * HOUR_HEIGHT);
  container.scrollTop = target;
}

export function groupRemindersByDate(reminders: ReminderResponse[]): Map<string, ReminderResponse[]> {
  const map = new Map<string, ReminderResponse[]>();
  for (const r of reminders) {
    if (!r.end_date) continue;
    const list = map.get(r.end_date);
    if (list) list.push(r);
    else map.set(r.end_date, [r]);
  }
  return map;
}

export function reminderDateSet(reminders: ReminderResponse[]): Set<string> {
  const set = new Set<string>();
  for (const r of reminders) {
    if (r.end_date) set.add(r.end_date);
  }
  return set;
}

export function getRemindersForDate(reminders: ReminderResponse[], date: Date): ReminderResponse[] {
  const targetDate = toISODateStr(date);
  return reminders.filter(r => r.end_date === targetDate);
}

export function partitionByAllDay(reminders: ReminderResponse[]): {
  allDay: ReminderResponse[];
  timed: ReminderResponse[];
} {
  const allDay: ReminderResponse[] = [];
  const timed: ReminderResponse[] = [];
  for (const r of reminders) {
    if (r.is_all_day || !r.end_time) allDay.push(r);
    else timed.push(r);
  }
  return { allDay, timed };
}

export function getWeekStartMon(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function getWeekDates(startMonday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startMonday);
    d.setDate(startMonday.getDate() + i);
    return d;
  });
}

const listColorCache = new WeakMap<ListResponse[], Map<string, string>>();

export function getListColor(lists: ListResponse[], listId: string | null): string {
  if (!listId) return '#FF3B30';
  let map = listColorCache.get(lists);
  if (!map) {
    map = new Map(lists.map(l => [l.id, l.color]));
    listColorCache.set(lists, map);
  }
  return map.get(listId) || '#FF3B30';
}
