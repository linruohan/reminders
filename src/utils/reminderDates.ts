import type { ReminderResponse } from '@/types/api';
import { getTodayStr } from '@/utils/dateUtils';

/** 有效截止日期：优先 end_date，兼容迁移前仅有 created_date 的旧数据 */
export function effectiveDueDate(r: Pick<ReminderResponse, 'end_date' | 'created_date'>): string | null {
  return r.end_date ?? r.created_date;
}

/** 有效截止时间：优先 end_time */
export function effectiveDueTime(r: Pick<ReminderResponse, 'end_time' | 'created_time'>): string | null {
  return r.end_time ?? r.created_time;
}

export function isDueToday(r: Pick<ReminderResponse, 'end_date' | 'created_date' | 'is_completed'>): boolean {
  if (r.is_completed) return false;
  const due = r.end_date;
  if (due === null || due === undefined) return true;
  return due <= getTodayStr();
}

export function isPlanned(r: Pick<ReminderResponse, 'end_date' | 'is_completed'>): boolean {
  if (r.is_completed) return false;
  const due = r.end_date;
  return due !== null && due !== undefined && due > getTodayStr();
}

export function isOverdue(r: Pick<ReminderResponse, 'end_date' | 'is_completed'>): boolean {
  if (r.is_completed) return false;
  const due = r.end_date;
  return due !== null && due !== undefined && due < getTodayStr();
}
