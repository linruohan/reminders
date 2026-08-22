import type { ReminderResponse } from '@/types/api';
import { getTodayStr } from '@/utils/dateUtils';

/** 今天视图：逾期未完成 + 截止日期为今天的未完成（无截止日期不纳入） */
export function isDueToday(
  r: Pick<ReminderResponse, 'end_date' | 'is_completed'>,
  today = getTodayStr(),
): boolean {
  if (r.is_completed) return false;
  const due = r.end_date;
  if (due === null || due === undefined) return false;
  return due <= today;
}

export function isPlanned(
  r: Pick<ReminderResponse, 'end_date' | 'is_completed'>,
  today = getTodayStr(),
): boolean {
  if (r.is_completed) return false;
  const due = r.end_date;
  return due !== null && due !== undefined && due > today;
}

/** 逾期：截止日期早于今天且未完成 */
export function isOverdue(
  r: Pick<ReminderResponse, 'end_date' | 'is_completed'>,
  today = getTodayStr(),
): boolean {
  if (r.is_completed) return false;
  const due = r.end_date;
  return due !== null && due !== undefined && due < today;
}

/** 与后端筛选语义对齐，供侧栏计数和列表共用 */
export function matchesFilter(
  r: ReminderResponse,
  filter: string,
  today = getTodayStr(),
): boolean {
  switch (filter) {
    case 'today':
      return isDueToday(r, today);
    case 'planned':
      return isPlanned(r, today);
    case 'flagged':
      return !r.is_completed && r.is_flagged;
    case 'urgent':
      return !r.is_completed && r.priority === 'high';
    case 'completed':
      return r.is_completed;
    case 'all':
      return true;
    default:
      break;
  }
  if (filter.startsWith('list:')) {
    return r.list_id === filter.slice('list:'.length);
  }
  if (filter.startsWith('owner:')) {
    return !r.is_completed && r.owner_id === filter.slice('owner:'.length);
  }
  if (filter.startsWith('tag:')) {
    const tagName = decodeURIComponent(filter.slice('tag:'.length));
    return !r.is_completed && (r.tags ?? []).some(t => t.name === tagName);
  }
  return !r.is_completed;
}

/** 本地搜索：标题 / 备注 / URL / 标签 */
export function matchesSearch(r: ReminderResponse, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return false;
  if (r.title.toLowerCase().includes(needle)) return true;
  if (r.description?.toLowerCase().includes(needle)) return true;
  if (r.url?.toLowerCase().includes(needle)) return true;
  return (r.tags ?? []).some(t => t.name.toLowerCase().includes(needle));
}
