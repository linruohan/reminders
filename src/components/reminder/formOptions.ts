import type { RecurrenceFrequency, TimeUnit } from '@/types/api';

/** 重复频率选项；完成时由后端生成下一次实例（见 spawn_next_occurrence） */
export const recurrenceOptions = [
  { value: '', label: '永不' },
  { value: 'daily', label: '每天' },
  { value: 'weekly', label: '每周' },
  { value: 'biweekly', label: '每2周' },
  { value: 'monthly', label: '每月' },
  { value: 'yearly', label: '每年' },
  { value: 'custom', label: '自定义' },
];

const customRecurrenceUnitLabels: Record<string, string> = {
  minutes: '分钟',
  hours: '小时',
  days: '天',
  weeks: '周',
  months: '个月',
  years: '年',
};

/** 列表/详情用的重复文案；无重复返回 null */
export function formatRecurrenceLabel(
  frequency: RecurrenceFrequency | string | null | undefined,
  interval?: number | null,
  customUnit?: TimeUnit | string | null,
): string | null {
  if (!frequency) return null;
  if (frequency === 'custom') {
    const n = interval ?? 1;
    const unit = customRecurrenceUnitLabels[customUnit || 'days'] || customUnit || '天';
    return `每 ${n} ${unit}`;
  }
  return recurrenceOptions.find(o => o.value === frequency)?.label || frequency;
}

/** 提前提醒选项；应用托盘常驻时由 notification_scheduler 轮询触发 */
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

/** 单字符后缀 → TimeUnit */
export const remindSuffixToUnit: Record<string, TimeUnit> = {
  h: 'hours',
  d: 'days',
  w: 'weeks',
  M: 'months',
  y: 'years',
};

/** TimeUnit → 单字符后缀（含兼容旧单数写法） */
export const remindUnitToSuffix: Record<string, string> = {
  hours: 'h',
  hour: 'h',
  days: 'd',
  day: 'd',
  weeks: 'w',
  week: 'w',
  months: 'M',
  month: 'M',
  years: 'y',
  year: 'y',
};

/** 解析提醒值（如 1d / 2w / 1M / 3h / 1y） */
export function parseRemindValue(value: string): { remind_before_value: number | null; remind_before_unit: TimeUnit | null } {
  if (!value || value === 'custom') return { remind_before_value: null, remind_before_unit: null };
  const unit = value.slice(-1);
  const num = parseInt(value.slice(0, -1), 10);
  return {
    remind_before_value: Number.isFinite(num) ? num : null,
    remind_before_unit: remindSuffixToUnit[unit] || null,
  };
}

/** 将已存的 value+unit 编码为 UI 字符串 */
export function encodeRemindValue(value: number | null | undefined, unit: string | null | undefined): string {
  if (value == null) return '';
  const suffix = remindUnitToSuffix[unit || ''];
  return suffix ? `${value}${suffix}` : 'custom';
}
