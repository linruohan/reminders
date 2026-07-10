import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type {
  ReminderResponse,
  ListResponse,
  OwnerResponse,
  CreateReminderRequest,
  UpdateReminderRequest,
  CreateListRequest,
  CreateOwnerRequest,
} from '@/types/api';

export function useApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequest = useCallback(async <T>(
    fn: () => Promise<T>,
  ): Promise<T | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await fn();
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getReminders = useCallback(async (filter?: string): Promise<ReminderResponse[] | null> => {
    if (filter) {
      return handleRequest(() => invoke<ReminderResponse[]>('get_reminders_by_filter', { filter }));
    }
    return handleRequest(() => invoke<ReminderResponse[]>('get_all_reminders'));
  }, [handleRequest]);

  const getRemindersByList = useCallback(async (listId: string): Promise<ReminderResponse[] | null> => {
    return handleRequest(() => invoke<ReminderResponse[]>('get_reminders_by_list', { listId }));
  }, [handleRequest]);

  const getReminderById = useCallback(async (id: string): Promise<ReminderResponse | null> => {
    const result = await handleRequest(() => invoke<ReminderResponse | null>('get_reminder_by_id', { id }));
    return result ?? null;
  }, [handleRequest]);

  const createReminder = useCallback(async (request: CreateReminderRequest): Promise<ReminderResponse | null> => {
    return handleRequest(() => invoke<ReminderResponse>('create_reminder', { request }));
  }, [handleRequest]);

  const updateReminder = useCallback(async (request: UpdateReminderRequest): Promise<ReminderResponse | null> => {
    return handleRequest(() => invoke<ReminderResponse>('update_reminder', { request }));
  }, [handleRequest]);

  const deleteReminder = useCallback(async (id: string): Promise<boolean> => {
    const result = await handleRequest(() => invoke<void>('delete_reminder', { id }));
    return result !== null;
  }, [handleRequest]);

  const toggleReminderCompleted = useCallback(async (id: string): Promise<ReminderResponse | null> => {
    return handleRequest(() => invoke<ReminderResponse>('toggle_reminder_completed', { id }));
  }, [handleRequest]);

  const getLists = useCallback(async (): Promise<ListResponse[] | null> => {
    return handleRequest(() => invoke<ListResponse[]>('get_all_lists'));
  }, [handleRequest]);

  const createList = useCallback(async (request: CreateListRequest): Promise<ListResponse | null> => {
    return handleRequest(() => invoke<ListResponse>('create_list', { request }));
  }, [handleRequest]);

  const deleteList = useCallback(async (id: string): Promise<boolean> => {
    const result = await handleRequest(() => invoke<void>('delete_list', { id }));
    return result !== null;
  }, [handleRequest]);

  const getOwners = useCallback(async (): Promise<OwnerResponse[] | null> => {
    return handleRequest(() => invoke<OwnerResponse[]>('get_all_owners'));
  }, [handleRequest]);

  const createOwner = useCallback(async (request: CreateOwnerRequest): Promise<OwnerResponse | null> => {
    return handleRequest(() => invoke<OwnerResponse>('create_owner', { request }));
  }, [handleRequest]);

  const deleteOwner = useCallback(async (id: string): Promise<boolean> => {
    const result = await handleRequest(() => invoke<void>('delete_owner', { id }));
    return result !== null;
  }, [handleRequest]);

  return {
    loading,
    error,
    getReminders,
    getRemindersByList,
    getReminderById,
    createReminder,
    updateReminder,
    deleteReminder,
    toggleReminderCompleted,
    getLists,
    createList,
    deleteList,
    getOwners,
    createOwner,
    deleteOwner,
  };
}