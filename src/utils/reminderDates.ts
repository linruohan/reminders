import type { ReminderResponse } from '@/types/api';
import { getTodayStr } from '@/utils/dateUtils';

/** 截止日期：仅使用 end_date（旧数据已由 schema 回填迁移） */
export function effectiveDueDate(r: Pick<ReminderResponse, 'end_date'>): string | null {
  return r.end_date ?? null;
}

/** 截止时间：仅使用 end_time */
export function effectiveDueTime(r: Pick<ReminderResponse, 'end_time'>): string | null {
  return r.end_time ?? null;
}

/** 今天视图：逾期未完成 + 截止日期为今天的未完成（无截止日期不纳入） */
export function isDueToday(r: Pick<ReminderResponse, 'end_date' | 'is_completed'>): boolean {
  if (r.is_completed) return false;
  const due = r.end_date;
  if (due === null || due === undefined) return false;
  return due <= getTodayStr();
}

export function isPlanned(r: Pick<ReminderResponse, 'end_date' | 'is_completed'>): boolean {
  if (r.is_completed) return false;
  const due = r.end_date;
  return due !== null && due !== undefined && due > getTodayStr();
}

/** 逾期：截止日期早于今天且未完成 */
export function isOverdue(r: Pick<ReminderResponse, 'end_date' | 'is_completed'>): boolean {
  if (r.is_completed) return false;
  const due = r.end_date;
  return due !== null && due !== undefined && due < getTodayStr();
}
