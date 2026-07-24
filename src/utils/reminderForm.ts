import type { RecurrenceFrequency, ReminderResponse, TimeUnit } from '@/types/api';
import { encodeRemindValue, parseRemindValue, remindOptions } from '@/components/reminder/formOptions';

/** 拆分 `YYYY-MM-DD` 或 `YYYY-MM-DDTHH:mm(:ss)` */
export function splitDateTime(dt: string): { date: string; time: string } | null {
  if (!dt) return null;
  const parts = dt.split('T');
  if (parts.length !== 2) return { date: parts[0], time: '' };
  return { date: parts[0], time: parts[1] || '' };
}

/** 组合截止日期时间字符串（全天只保留日期） */
export function joinEndDateTime(date: string | null | undefined, time: string | null | undefined, isAllDay: boolean): string {
  if (!date) return '';
  if (isAllDay || !time) return date;
  return `${date}T${time}`;
}

/** 自定义重复单位：日期级不支持分/时，归一到天 */
export function normalizeCustomRecurrenceUnit(unit: string | null | undefined): TimeUnit {
  if (unit === 'minutes' || unit === 'hours' || !unit) return 'days';
  return unit as TimeUnit;
}

export interface RemindUiState {
  remindValue: string;
  customRemindNum: number;
  customRemindUnit: string;
}

/** 从已存提醒初始化提前提醒 UI 状态 */
export function initRemindUiState(
  value: number | null | undefined,
  unit: string | null | undefined,
): RemindUiState {
  const encoded = encodeRemindValue(value, unit);
  const isPreset = remindOptions.some(o => o.value === encoded);
  return {
    remindValue: !encoded ? '' : isPreset ? encoded : 'custom',
    customRemindNum: value ?? 1,
    customRemindUnit: unit ?? 'days',
  };
}

/** 将提前提醒 UI 解析为持久化字段 */
export function resolveRemindFields(
  remindValue: string,
  customNum: number,
  customUnit: string,
): { remind_before_value: number | null; remind_before_unit: TimeUnit | null } {
  if (remindValue === 'custom') {
    return {
      remind_before_value: customNum,
      remind_before_unit: customUnit as TimeUnit,
    };
  }
  return parseRemindValue(remindValue);
}

/** 将重复 UI 解析为持久化字段 */
export function resolveRecurrenceFields(
  freq: string,
  interval: number,
  customUnit: string,
  showEndRepeat: boolean,
  recurrenceEndDate: string,
): Pick<
  ReminderResponse,
  'recurrence_frequency' | 'recurrence_interval' | 'custom_recurrence_unit' | 'recurrence_end_date'
> {
  const recurrence_frequency = (freq || null) as RecurrenceFrequency | null;
  return {
    recurrence_frequency,
    recurrence_interval: freq === 'custom' ? interval : null,
    custom_recurrence_unit: freq === 'custom' ? normalizeCustomRecurrenceUnit(customUnit) : null,
    recurrence_end_date: showEndRepeat && freq ? (recurrenceEndDate || null) : null,
  };
}

/** 标签名列表是否变化 */
export function tagsEqual(a: string[] | undefined, b: string[] | undefined): boolean {
  const left = (a ?? []).slice().sort().join('\0');
  const right = (b ?? []).slice().sort().join('\0');
  return left === right;
}

export function tagNamesToResponses(names: string[]): ReminderResponse['tags'] {
  return names.map(name => ({ id: name, name }));
}
