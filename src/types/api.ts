export interface ReminderResponse {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  due_date: string | null;
  due_time: string | null;
  is_all_day: boolean;
  is_completed: boolean;
  priority: string;
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
  due_date?: string | null;
  due_time?: string | null;
  list_id?: string | null;
}

export interface UpdateReminderRequest {
  id: string;
  title?: string;
  description?: string | null;
  due_date?: string | null;
  due_time?: string | null;
  is_completed?: boolean;
  priority?: string;
  list_id?: string | null;
  owner_id?: string | null;
}

export interface CreateListRequest {
  name: string;
  color?: string;
  icon?: string;
}

export interface CreateOwnerRequest {
  name: string;
  color?: string;
}