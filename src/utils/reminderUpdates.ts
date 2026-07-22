import type { ReminderResponse } from '@/types/api';

/** Compare local edit values against the reminder and return only changed fields. */
export function buildUpdates(
  reminder: ReminderResponse,
  values: Partial<ReminderResponse>,
): Partial<ReminderResponse> {
  const updates: Partial<ReminderResponse> = {};
  if (values.title !== undefined && values.title !== reminder.title) {
    updates.title = values.title;
  }
  if (values.description !== reminder.description) {
    updates.description = values.description ?? null;
  }
  if (values.url !== undefined && values.url !== reminder.url) {
    updates.url = values.url ?? null;
  }
  if (values.created_date !== reminder.created_date) {
    updates.created_date = values.created_date ?? null;
  }
  if (values.created_time !== reminder.created_time) {
    updates.created_time = values.created_time ?? null;
  }
  if (values.is_flagged !== undefined && values.is_flagged !== reminder.is_flagged) {
    updates.is_flagged = values.is_flagged;
  }
  if (values.list_id !== undefined && values.list_id !== reminder.list_id) {
    updates.list_id = values.list_id ?? null;
  }
  if (values.recurrence_frequency !== undefined && values.recurrence_frequency !== reminder.recurrence_frequency) {
    updates.recurrence_frequency = values.recurrence_frequency ?? null;
  }
  if (values.recurrence_interval !== undefined && values.recurrence_interval !== reminder.recurrence_interval) {
    updates.recurrence_interval = values.recurrence_interval ?? null;
  }
  if (values.custom_recurrence_unit !== undefined && values.custom_recurrence_unit !== reminder.custom_recurrence_unit) {
    updates.custom_recurrence_unit = values.custom_recurrence_unit ?? null;
  }
  if (values.recurrence_end_date !== undefined && values.recurrence_end_date !== reminder.recurrence_end_date) {
    updates.recurrence_end_date = values.recurrence_end_date ?? null;
  }
  if (values.remind_before_value !== undefined && values.remind_before_value !== reminder.remind_before_value) {
    updates.remind_before_value = values.remind_before_value ?? null;
  }
  if (values.remind_before_unit !== undefined && values.remind_before_unit !== reminder.remind_before_unit) {
    updates.remind_before_unit = values.remind_before_unit ?? null;
  }
  if (values.priority !== undefined && values.priority !== reminder.priority) {
    updates.priority = values.priority;
  }
  if (values.end_date !== undefined && values.end_date !== reminder.end_date) {
    updates.end_date = values.end_date ?? null;
  }
  if (values.end_time !== undefined && values.end_time !== reminder.end_time) {
    updates.end_time = values.end_time ?? null;
  }
  if (values.is_all_day !== undefined && values.is_all_day !== reminder.is_all_day) {
    updates.is_all_day = values.is_all_day;
  }
  return updates;
}
