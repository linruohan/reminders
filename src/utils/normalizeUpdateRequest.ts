import type { ReminderResponse, UpdateReminderRequest } from '@/types/api';

/** 后端 Option 字段：JSON null / 缺省 = 不更新；空字符串（数值 -1）= 清空 */
const CLEARABLE_STRING_KEYS = [
  'description',
  'url',
  'end_date',
  'end_time',
  'list_id',
  'owner_id',
  'recurrence_frequency',
  'custom_recurrence_unit',
  'recurrence_end_date',
  'remind_before_unit',
] as const;

type ClearableStringKey = (typeof CLEARABLE_STRING_KEYS)[number];

/**
 * 将前端「清空用 null」转为后端哨兵，避免与「不更新」语义冲突。
 */
export function normalizeUpdateRequest(
  id: string,
  updates: Partial<ReminderResponse>,
): UpdateReminderRequest {
  const { tags: tagObjs, ...rest } = updates;
  const request: UpdateReminderRequest = {
    id,
    ...rest,
    ...(tagObjs
      ? { tags: tagObjs.map(t => (typeof t === 'string' ? t : t.name)) }
      : {}),
  };

  for (const key of CLEARABLE_STRING_KEYS) {
    if (
      Object.prototype.hasOwnProperty.call(updates, key) &&
      updates[key as ClearableStringKey] == null
    ) {
      request[key] = '';
    }
  }

  if (
    Object.prototype.hasOwnProperty.call(updates, 'remind_before_value') &&
    updates.remind_before_value == null
  ) {
    request.remind_before_value = -1;
    request.remind_before_unit = '';
  }

  if (
    Object.prototype.hasOwnProperty.call(updates, 'recurrence_interval') &&
    updates.recurrence_interval == null
  ) {
    request.recurrence_interval = -1;
  }

  return request;
}
