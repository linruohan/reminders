import { useState, useCallback } from 'react';
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
} from '@/types/api';
import { parseInvokeError, getUserFriendlyMessage, type AppError } from '@/types/error';

type LoadingState = Record<string, boolean>;
type ErrorState = Record<string, string | null>;

export function useApi() {
  const [loading, setLoading] = useState<LoadingState>({});
  const [error, setError] = useState<ErrorState>({});

  const handleRequest = useCallback(async <T>(
    key: string,
    fn: () => Promise<T>,
  ): Promise<T | null> => {
    setLoading(prev => ({ ...prev, [key]: true }));
    setError(prev => ({ ...prev, [key]: null }));
    
    try {
      const result = await fn();
      setLoading(prev => ({ ...prev, [key]: false }));
      return result;
    } catch (e) {
      const appError: AppError = parseInvokeError(e);
      const message = getUserFriendlyMessage(appError);
      setLoading(prev => ({ ...prev, [key]: false }));
      setError(prev => ({ ...prev, [key]: message }));
      // 错误已通过 setError 记录到状态中，此处不再输出到控制台
      return null;
    }
  }, []);

  const getReminders = useCallback(async (filter?: string): Promise<ReminderResponse[] | null> => {
    const key = filter ? `get_reminders_${filter}` : 'get_reminders_all';
    if (filter) {
      return handleRequest(key, () => invoke<ReminderResponse[]>('get_reminders_by_filter', { filter }));
    }
    return handleRequest(key, () => invoke<ReminderResponse[]>('get_all_reminders'));
  }, [handleRequest]);

  const getRemindersByList = useCallback(async (listId: string): Promise<ReminderResponse[] | null> => {
    return handleRequest(`get_reminders_list_${listId}`, () => 
      invoke<ReminderResponse[]>('get_reminders_by_list', { listId })
    );
  }, [handleRequest]);

  const getReminderById = useCallback(async (id: string): Promise<ReminderResponse | null> => {
    const result = await handleRequest(`get_reminder_${id}`, () => 
      invoke<ReminderResponse | null>('get_reminder_by_id', { id })
    );
    return result ?? null;
  }, [handleRequest]);

  const createReminder = useCallback(async (request: CreateReminderRequest): Promise<{ data: ReminderResponse | null; error: string | null }> => {
    const key = 'create_reminder';
    setLoading(prev => ({ ...prev, [key]: true }));
    setError(prev => ({ ...prev, [key]: null }));
    try {
      const result = await invoke<ReminderResponse>('create_reminder', { request });
      setLoading(prev => ({ ...prev, [key]: false }));
      return { data: result, error: null };
    } catch (e) {
      const appError: AppError = parseInvokeError(e);
      const message = getUserFriendlyMessage(appError);
      setLoading(prev => ({ ...prev, [key]: false }));
      setError(prev => ({ ...prev, [key]: message }));
      // 错误已通过 setError 记录到状态中，此处不再输出到控制台
      return { data: null, error: message };
    }
  }, []);

  const updateReminder = useCallback(async (request: UpdateReminderRequest): Promise<ReminderResponse | null> => {
    return handleRequest(`update_reminder_${request.id}`, () => 
      invoke<ReminderResponse>('update_reminder', { request })
    );
  }, [handleRequest]);

  const deleteReminder = useCallback(async (id: string): Promise<boolean> => {
    const result = await handleRequest(`delete_reminder_${id}`, () => 
      invoke<void>('delete_reminder', { id })
    );
    return result !== null;
  }, [handleRequest]);

  const toggleReminderCompleted = useCallback(async (id: string): Promise<ReminderResponse | null> => {
    return handleRequest(`toggle_reminder_${id}`, () => 
      invoke<ReminderResponse>('toggle_reminder_completed', { id })
    );
  }, [handleRequest]);

  const getLists = useCallback(async (): Promise<ListResponse[] | null> => {
    return handleRequest('get_lists', () => invoke<ListResponse[]>('get_all_lists'));
  }, [handleRequest]);

  const createList = useCallback(async (request: CreateListRequest): Promise<ListResponse | null> => {
    return handleRequest('create_list', () => 
      invoke<ListResponse>('create_list', { request })
    );
  }, [handleRequest]);

  const deleteList = useCallback(async (id: string): Promise<boolean> => {
    const result = await handleRequest(`delete_list_${id}`, () => 
      invoke<void>('delete_list', { id })
    );
    return result !== null;
  }, [handleRequest]);

  const updateList = useCallback(async (request: UpdateListRequest): Promise<ListResponse | null> => {
    return handleRequest(`update_list_${request.id}`, () => 
      invoke<ListResponse>('update_list', { request })
    );
  }, [handleRequest]);

  const getOwners = useCallback(async (): Promise<OwnerResponse[] | null> => {
    return handleRequest('get_owners', () => invoke<OwnerResponse[]>('get_all_owners'));
  }, [handleRequest]);

  const searchReminders = useCallback(async (query: string): Promise<ReminderResponse[] | null> => {
    return handleRequest(`search_reminders_${query}`, () => 
      invoke<ReminderResponse[]>('search_reminders', { query })
    );
  }, [handleRequest]);

  const createOwner = useCallback(async (request: CreateOwnerRequest): Promise<OwnerResponse | null> => {
    return handleRequest('create_owner', () => 
      invoke<OwnerResponse>('create_owner', { request })
    );
  }, [handleRequest]);

  const getReminderTags = useCallback(async (reminderId: string): Promise<TagResponse[] | null> => {
    return handleRequest(`get_tags_${reminderId}`, () =>
      invoke<TagResponse[]>('get_reminder_tags', { reminderId })
    );
  }, [handleRequest]);

  const getAllTags = useCallback(async (): Promise<TagResponse[] | null> => {
    return handleRequest('get_all_tags', () =>
      invoke<TagResponse[]>('get_all_tags')
    );
  }, [handleRequest]);

  const searchTags = useCallback(async (query: string): Promise<TagResponse[] | null> => {
    return handleRequest(`search_tags_${query}`, () =>
      invoke<TagResponse[]>('search_tags', { query })
    );
  }, [handleRequest]);

  const deleteOwner = useCallback(async (id: string): Promise<boolean> => {
    const result = await handleRequest(`delete_owner_${id}`, () => 
      invoke<void>('delete_owner', { id })
    );
    return result !== null;
  }, [handleRequest]);

  const updateOwner = useCallback(async (request: UpdateOwnerRequest): Promise<OwnerResponse | null> => {
    return handleRequest(`update_owner_${request.id}`, () => 
      invoke<OwnerResponse>('update_owner', { request })
    );
  }, [handleRequest]);

  const isLoading = useCallback((key?: string) => {
    if (!key) return Object.values(loading).some(Boolean);
    return loading[key] === true;
  }, [loading]);

  const getError = useCallback((key?: string) => {
    if (!key) return Object.values(error).find(Boolean);
    return error[key] || null;
  }, [error]);

  const clearError = useCallback((key: string) => {
    setError(prev => ({ ...prev, [key]: null }));
  }, []);

  return {
    loading,
    error,
    isLoading,
    getError,
    clearError,
    getReminders,
    getRemindersByList,
    getReminderById,
    searchReminders,
    createReminder,
    updateReminder,
    deleteReminder,
    toggleReminderCompleted,
    getLists,
    createList,
    updateList,
    deleteList,
    getOwners,
    createOwner,
    updateOwner,
    deleteOwner,
    getReminderTags,
    getAllTags,
    searchTags,
  };
}