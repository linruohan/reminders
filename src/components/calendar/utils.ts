import type { ReminderResponse, ListResponse } from '@/types/api';
import { toISODateStr } from '@/utils/dateUtils';
import { effectiveDueDate } from '@/utils/reminderDates';

export const weekDays = ['一', '二', '三', '四', '五', '六', '日'];

/** 全天 0–23 点时间轴 */
export const TIMELINE_START_HOUR = 0;
export const TIMELINE_HOURS = 24;
export const timelineHours = Array.from({ length: TIMELINE_HOURS }, (_, i) => i + TIMELINE_START_HOUR);
export const HOUR_HEIGHT = 56;
export const TIMELINE_HEIGHT = TIMELINE_HOURS * HOUR_HEIGHT;
export const TIMELINE_TOTAL_MINUTES = TIMELINE_HOURS * 60;
export const BLOCK_MINUTES = 30;

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

/** 打开日/周视图时滚到当前时刻附近（略往上留一点） */
export function scrollTimelineToHour(container: HTMLElement | null, hour: number) {
  if (!container) return;
  const target = Math.max(0, (hour - TIMELINE_START_HOUR - 1) * HOUR_HEIGHT);
  container.scrollTop = target;
}

export function getRemindersForDate(reminders: ReminderResponse[], date: Date): ReminderResponse[] {
  const targetDate = toISODateStr(date);
  return reminders.filter(r => effectiveDueDate(r) === targetDate);
}

export function getWeekStartMon(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function getListColor(lists: ListResponse[], listId: string | null): string {
  if (!listId) return '#FF3B30';
  return lists.find(l => l.id === listId)?.color || '#FF3B30';
}
