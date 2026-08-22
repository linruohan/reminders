import { invoke } from '@tauri-apps/api/core';
import type {
  ReminderResponse,
  ListResponse,
  OwnerResponse,
  TagResponse,
  CreateReminderRequest,
  UpdateReminderRequest,
  CreateListRequest,
  UpdateListRequest,
  CreateOwnerRequest,
  UpdateOwnerRequest,
  CreateSubtaskRequest,
  UpdateSubtaskRequest,
  SubtaskResponse,
} from '@/types/api';
import { parseInvokeError, getUserFriendlyMessage } from '@/types/error';

export type InvokeResult<T> = { data: T | null; error: string | null };

async function invokeCommand<T>(
  cmd: string,
  args?: Record<string, unknown>,
): Promise<InvokeResult<T>> {
  try {
    const data = await invoke<T>(cmd, args);
    return { data, error: null };
  } catch (e) {
    return { data: null, error: getUserFriendlyMessage(parseInvokeError(e)) };
  }
}

async function invokeData<T>(cmd: string, args?: Record<string, unknown>): Promise<T | null> {
  const { data } = await invokeCommand<T>(cmd, args);
  return data;
}

async function invokeOk(cmd: string, args?: Record<string, unknown>): Promise<boolean> {
  const { error } = await invokeCommand<void>(cmd, args);
  return error === null;
}

export function getAllReminders() {
  return invokeData<ReminderResponse[]>('get_all_reminders');
}

export function createReminder(request: CreateReminderRequest) {
  return invokeCommand<ReminderResponse>('create_reminder', { request });
}

export function updateReminder(request: UpdateReminderRequest) {
  return invokeData<ReminderResponse>('update_reminder', { request });
}

export function deleteReminder(id: string) {
  return invokeOk('delete_reminder', { id });
}

export function toggleReminderCompleted(id: string) {
  return invokeData<ReminderResponse>('toggle_reminder_completed', { id });
}

export function getLists() {
  return invokeData<ListResponse[]>('get_all_lists');
}

export function createList(request: CreateListRequest) {
  return invokeData<ListResponse>('create_list', { request });
}

export function updateList(request: UpdateListRequest) {
  return invokeData<ListResponse>('update_list', { request });
}

export function deleteList(id: string) {
  return invokeOk('delete_list', { id });
}

export function getOwners() {
  return invokeData<OwnerResponse[]>('get_all_owners');
}

export function createOwner(request: CreateOwnerRequest) {
  return invokeData<OwnerResponse>('create_owner', { request });
}

export function updateOwner(request: UpdateOwnerRequest) {
  return invokeData<OwnerResponse>('update_owner', { request });
}

export function deleteOwner(id: string) {
  return invokeOk('delete_owner', { id });
}

export function getAllTags() {
  return invokeData<TagResponse[]>('get_all_tags');
}

export function renameTag(id: string, name: string) {
  return invokeData<TagResponse>('rename_tag', { id, name });
}

export function deleteTag(id: string) {
  return invokeOk('delete_tag', { id });
}

export function createSubtask(request: CreateSubtaskRequest) {
  return invokeData<SubtaskResponse>('create_subtask', { request });
}

export function updateSubtask(request: UpdateSubtaskRequest) {
  return invokeData<SubtaskResponse>('update_subtask', { request });
}

export function deleteSubtask(id: string) {
  return invokeOk('delete_subtask', { id });
}
