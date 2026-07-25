export interface TagResponse {
  id: string;
  name: string;
}

export interface SubtaskResponse {
  id: string;
  reminder_id: string;
  title: string;
  is_completed: boolean;
  sort_order: number;
}

// 优先级类型定义
export type Priority = "none" | "low" | "medium" | "high";

// 重复频率（含 custom；完成时由后端生成下一次实例）
export type RecurrenceFrequency =
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "yearly"
  | "custom";

// 时间单位类型定义
export type TimeUnit =
  | "minutes"
  | "hours"
  | "days"
  | "weeks"
  | "months"
  | "years";

export interface ReminderResponse {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  created_date: string | null;
  created_time: string | null;
  end_date: string | null;
  end_time: string | null;
  is_all_day: boolean;
  is_completed: boolean;
  is_flagged: boolean;
  priority: Priority;
  recurrence_frequency: RecurrenceFrequency | null;
  recurrence_interval: number | null;
  custom_recurrence_unit: TimeUnit | null;
  recurrence_end_date: string | null;
  remind_before_value: number | null;
  remind_before_unit: TimeUnit | null;
  tags: TagResponse[];
  subtasks: SubtaskResponse[];
  list_id: string | null;
  owner_id: string | null;
}

export interface ListResponse {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface OwnerResponse {
  id: string;
  name: string;
  color: string;
}

export interface CreateReminderRequest {
  title: string;
  description?: string | null;
  url?: string | null;
  end_date?: string | null;
  end_time?: string | null;
  list_id?: string | null;
  owner_id?: string | null;
  is_all_day?: boolean;
  is_flagged?: boolean;
  priority?: Priority;
  recurrence_frequency?: RecurrenceFrequency | null;
  recurrence_interval?: number | null;
  custom_recurrence_unit?: TimeUnit | null;
  recurrence_end_date?: string | null;
  remind_before_value?: number | null;
  remind_before_unit?: TimeUnit | null;
  tags?: string[];
}

export interface UpdateReminderRequest {
  id: string;
  title?: string;
  /** 传空字符串可清空 */
  description?: string | null;
  /** 传空字符串可清空 */
  url?: string | null;
  /** 传空字符串可清空 */
  end_date?: string | null;
  /** 传空字符串可清空 */
  end_time?: string | null;
  is_completed?: boolean;
  is_flagged?: boolean;
  priority?: Priority;
  /** 传空字符串可清空 */
  list_id?: string | null;
  /** 传空字符串可清空 */
  owner_id?: string | null;
  is_all_day?: boolean;
  /** 传空字符串可清空 */
  recurrence_frequency?: RecurrenceFrequency | '' | null;
  /** 传 -1 表示清空重复间隔 */
  recurrence_interval?: number | null;
  /** 传空字符串可清空 */
  custom_recurrence_unit?: TimeUnit | '' | null;
  /** 传空字符串可清空 */
  recurrence_end_date?: string | null;
  /** 传 -1 表示清空提前提醒数值 */
  remind_before_value?: number | null;
  /** 传空字符串可清空提前提醒单位（并清空数值） */
  remind_before_unit?: TimeUnit | '' | null;
  tags?: string[];
}

export interface CreateSubtaskRequest {
  reminder_id: string;
  title: string;
}

export interface UpdateSubtaskRequest {
  id: string;
  title?: string;
  is_completed?: boolean;
}

export interface CreateListRequest {
  name: string;
  color?: string;
  icon?: string;
}

export interface UpdateListRequest {
  id: string;
  name?: string;
  color?: string;
  icon?: string;
}

export interface CreateOwnerRequest {
  name: string;
  color?: string;
}

export interface UpdateOwnerRequest {
  id: string;
  name?: string;
  color?: string;
}
