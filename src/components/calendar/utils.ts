import type { ReminderResponse, ListResponse } from '@/types/api';
import { toISODateStr } from '@/utils/dateUtils';

export const weekDays = ['一', '二', '三', '四', '五', '六', '日'];
export const timelineHours = Array.from({ length: 13 }, (_, i) => i + 9);
export const HOUR_HEIGHT = 56;
export const BLOCK_MINUTES = 30;

export function getRemindersForDate(reminders: ReminderResponse[], date: Date): ReminderResponse[] {
  const targetDate = toISODateStr(date);
  return reminders.filter(r => r.created_date === targetDate);
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
