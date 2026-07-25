import { useState, useRef, useEffect, useCallback } from 'react';
import type { ReminderResponse, ListResponse } from '@/types/api';
import {
  ReminderFormFields,
  type ReminderFormFieldValues,
} from '../reminder/ReminderFormFields';
import { buildUpdates } from '@/utils/reminderUpdates';
import {
  formFieldsToReminderPatch,
  initRemindUiState,
  joinEndDateTime,
  normalizeCustomRecurrenceUnit,
  validateReminderFields,
} from '@/utils/reminderForm';

interface EditReminderCardProps {
  reminder: ReminderResponse;
  lists: ListResponse[];
  onSave: (id: string, updates: Partial<ReminderResponse>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  showToast?: (type: 'success' | 'error' | 'info', message: string) => void;
}

export function EditReminderCard({
  reminder,
  lists,
  onSave,
  onDelete,
  onClose,
  showToast,
}: EditReminderCardProps) {
  const [title, setTitle] = useState(reminder.title);
  const [description, setDescription] = useState(reminder.description || '');
  const [url, setUrl] = useState(reminder.url || '');
  const initialRemind = initRemindUiState(reminder.remind_before_value, reminder.remind_before_unit);
  const [fields, setFields] = useState<ReminderFormFieldValues>({
    endDateTime: joinEndDateTime(reminder.end_date, reminder.end_time, reminder.is_all_day ?? false),
    isAllDay: reminder.is_all_day ?? false,
    recurrenceFreq: reminder.recurrence_frequency ?? '',
    recurrenceInterval: reminder.recurrence_interval ?? 1,
    customUnit: normalizeCustomRecurrenceUnit(reminder.custom_recurrence_unit),
    showEndRepeat: Boolean(reminder.recurrence_end_date),
    recurrenceEndDate: reminder.recurrence_end_date || '',
    remindValue: initialRemind.remindValue,
    customRemindNum: initialRemind.customRemindNum,
    customRemindUnit: initialRemind.customRemindUnit,
    selectedListId: reminder.list_id || '',
    isFlagged: reminder.is_flagged ?? false,
    priority: reminder.priority || 'none',
    tags: reminder.tags?.map(t => t.name) || [],
  });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const onFieldsChange = useCallback((patch: Partial<ReminderFormFieldValues>) => {
    setFields(prev => ({ ...prev, ...patch }));
  }, []);

  const handleSave = useCallback(() => {
    const fieldError = validateReminderFields({ title, url });
    if (fieldError) {
      showToast?.('error', fieldError);
      return;
    }

    const updates = buildUpdates(reminder, {
      title: title.trim(),
      description: description || null,
      url: url || null,
      ...formFieldsToReminderPatch(fields),
    });

    onSave(reminder.id, updates);
    onClose();
  }, [title, description, url, fields, reminder, onSave, onClose, showToast]);

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50" onClick={handleSave}>
      <div
        className="bg-white rounded-apple-lg shadow-[0_16px_48px_rgba(0,0,0,0.16)] w-[400px] overflow-hidden animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-apple-divider">
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-all" aria-label="关闭">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-gray-900">编辑提醒</span>
          <div className="flex gap-2">
            <button onClick={() => { onDelete(reminder.id); onClose(); }} className="text-sm font-medium text-red-500 hover:text-red-600 transition-colors">删除</button>
            <button onClick={handleSave} className="text-sm font-semibold text-apple-blue transition-opacity">完成</button>
          </div>
        </div>

        <div className="p-4 max-h-[560px] overflow-y-auto">
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="标题"
            className="w-full text-[17px] font-semibold text-gray-900 placeholder-apple-gray bg-transparent border-none outline-none"
          />
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="备注"
            className="w-full mt-1 text-[13px] text-apple-gray placeholder-apple-gray bg-transparent border-none outline-none"
          />
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="URL"
            className="w-full mt-0.5 text-[13px] text-apple-blue placeholder-apple-gray bg-transparent border-none outline-none"
          />

          <div className="border-t border-apple-divider my-3" />
          <ReminderFormFields lists={lists} values={fields} onChange={onFieldsChange} variant="edit" />
        </div>
      </div>
    </div>
  );
}
