import type { TimeUnit } from '@/types/api';

/** 重复频率选项（仅持久化元数据；自动生成下一次实例尚未实现） */
export const recurrenceOptions = [
  { value: '', label: '永不' },
  { value: 'daily', label: '每天' },
  { value: 'weekly', label: '每周' },
  { value: 'biweekly', label: '每2周' },
  { value: 'monthly', label: '每月' },
  { value: 'yearly', label: '每年' },
  { value: 'custom', label: '自定义' },
];

/** 提前提醒选项（仅元数据；系统通知调度尚未实现） */
export const remindOptions = [
  { value: '', label: '无' },
  { value: '1d', label: '1天前' },
  { value: '2d', label: '2天前' },
  { value: '1w', label: '1周前' },
  { value: '2w', label: '2周前' },
  { value: '1M', label: '1个月前' },
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
  const unitMap: Record<string, TimeUnit> = { d: 'days', w: 'weeks', M: 'months' };
  return { remind_before_value: num, remind_before_unit: unitMap[unit] || null };
}
