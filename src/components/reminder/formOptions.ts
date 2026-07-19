import type { TimeUnit } from '@/types/api';

/** 重复频率选项 */
export const recurrenceOptions = [
  { value: '', label: '永不' },
  { value: 'hourly', label: '每小时' },
  { value: 'daily', label: '每天' },
  { value: 'weekdays', label: '工作日' },
  { value: 'weekends', label: '周末' },
  { value: 'weekly', label: '每周' },
  { value: 'biweekly', label: '每2周' },
  { value: 'monthly', label: '每月' },
  { value: 'bimonthly', label: '每2个月' },
  { value: 'quarterly', label: '每3个月' },
  { value: 'semiannual', label: '每6个月' },
  { value: 'yearly', label: '每年' },
  { value: 'custom', label: '自定义' },
];

/** 提前提醒选项 */
export const remindOptions = [
  { value: '', label: '无' },
  { value: '1d', label: '1天前' },
  { value: '2d', label: '2天前' },
  { value: '1w', label: '1周前' },
  { value: '2w', label: '2周前' },
  { value: '1M', label: '1个月前' },
  { value: '2M', label: '2个月前' },
  { value: '3M', label: '3个月前' },
  { value: '6M', label: '6个月前' },
  { value: 'custom', label: '自定义' },
];

/** 优先级选项 */
export const priorityOptions = [
  { value: 'none', label: '无' },
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
];

/** 解析提醒值 */
export function parseRemindValue(value: string): { remind_before_value: number | null; remind_before_unit: TimeUnit | null } {
  if (!value) return { remind_before_value: null, remind_before_unit: null };
  if (value === 'custom') return { remind_before_value: null, remind_before_unit: null };
  const unit = value.slice(-1);
  const num = parseInt(value.slice(0, -1));
  const unitMap: Record<string, TimeUnit> = { d: 'days', w: 'weeks', M: 'days' };
  return { remind_before_value: num, remind_before_unit: unitMap[unit] || null };
}
