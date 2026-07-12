export interface TagResponse {
  id: string;
  name: string;
}

export interface ReminderResponse {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  due_date: string | null;
  due_time: string | null;
  end_date: string | null;
  end_time: string | null;
  is_all_day: boolean;
  is_completed: boolean;
  is_flagged: boolean;
  priority: string;
  recurrence_frequency: string | null;
  recurrence_interval: number | null;
  custom_recurrence_unit: string | null;
  recurrence_end_date: string | null;
  remind_before_value: number | null;
  remind_before_unit: string | null;
  tags: TagResponse[];
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
  due_date?: string | null;
  due_time?: string | null;
  end_date?: string | null;
  end_time?: string | null;
  list_id?: string | null;
  is_all_day?: boolean;
  is_flagged?: boolean;
  priority?: string;
  recurrence_frequency?: string | null;
  recurrence_interval?: number | null;
  custom_recurrence_unit?: string | null;
  recurrence_end_date?: string | null;
  remind_before_value?: number | null;
  remind_before_unit?: string | null;
  tags?: string[];
}

export interface UpdateReminderRequest {
  id: string;
  title?: string;
  description?: string | null;
  url?: string | null;
  due_date?: string | null;
  due_time?: string | null;
  end_date?: string | null;
  end_time?: string | null;
  is_completed?: boolean;
  is_flagged?: boolean;
  priority?: string;
  list_id?: string | null;
  owner_id?: string | null;
  is_all_day?: boolean;
  recurrence_frequency?: string | null;
  recurrence_interval?: number | null;
  custom_recurrence_unit?: string | null;
  recurrence_end_date?: string | null;
  remind_before_value?: number | null;
  remind_before_unit?: string | null;
  tags?: string[];
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
