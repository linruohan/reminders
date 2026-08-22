import { useState, useRef, useEffect, useCallback } from 'react';
import type { ListResponse, Priority, RecurrenceFrequency, TagResponse, TimeUnit } from '@/types/api';
import {
  ReminderFormFields,
  type ReminderFormFieldValues,
} from './reminder/ReminderFormFields';
import { formatDateTimeLocal } from '@/utils/dateUtils';
import {
  formFieldsToReminderPatch,
  validateReminderFields,
} from '@/utils/reminderForm';

interface AddReminderModalProps {
  lists: ListResponse[];
  knownTags?: TagResponse[];
  initialListId?: string | null;
  initialEndDateTime?: string | null;
  initialIsAllDay?: boolean;
  /** 默认父任务 ID */
  initialParentId?: string | null;
  /** 默认父任务标题（展示用） */
  initialParentTitle?: string | null;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description?: string | null;
    url?: string | null;
    end_date?: string | null;
    end_time?: string | null;
    list_id?: string | null;
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
    parent_id?: string | null;
  }) => void;
  showToast?: (type: 'success' | 'error' | 'info', message: string) => void;
}

function isValidDateRange(start: string, end: string): boolean {
  if (!start || !end) return true;
  return new Date(end) >= new Date(start);
}

export function AddReminderModal({
  lists,
  knownTags = [],
  initialListId,
  initialEndDateTime,
  initialIsAllDay = false,
  initialParentId = null,
  initialParentTitle = null,
  onClose,
  onSubmit,
  showToast,
}: AddReminderModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [startDateTime] = useState(() => {
    const now = new Date();
    return formatDateTimeLocal(now, now.getHours(), now.getMinutes());
  });
  const [fields, setFields] = useState<ReminderFormFieldValues>({
    endDateTime: initialEndDateTime || '',
    isAllDay: initialIsAllDay,
    recurrenceFreq: '',
    recurrenceInterval: 1,
    customUnit: 'days',
    showEndRepeat: false,
    recurrenceEndDate: '',
    remindValue: '',
    customRemindNum: 1,
    customRemindUnit: 'minutes',
    selectedListId: initialListId || '',
    isFlagged: false,
    priority: 'none',
    tags: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const onFieldsChange = useCallback((patch: Partial<ReminderFormFieldValues>) => {
    setFields(prev => ({ ...prev, ...patch }));
  }, []);

  const handleSubmit = useCallback(async () => {
    const fieldError = validateReminderFields({ title, url });
    if (fieldError) {
      showToast?.('error', fieldError);
      return;
    }
    if (startDateTime && fields.endDateTime && !isValidDateRange(startDateTime, fields.endDateTime)) {
      showToast?.('error', '截止日期不能早于创建日期');
      return;
    }

    setIsSubmitting(true);
    const patch = formFieldsToReminderPatch(fields);
    try {
      onSubmit({
        title: title.trim(),
        description: description.trim() || null,
        url: url.trim() || null,
        end_date: patch.end_date,
        end_time: patch.end_time,
        list_id: patch.list_id,
        is_all_day: patch.is_all_day,
        is_flagged: patch.is_flagged,
        priority: patch.priority,
        recurrence_frequency: patch.recurrence_frequency,
        recurrence_interval: patch.recurrence_interval,
        custom_recurrence_unit: patch.custom_recurrence_unit,
        recurrence_end_date: patch.recurrence_end_date,
        remind_before_value: patch.remind_before_value,
        remind_before_unit: patch.remind_before_unit,
        tags: fields.tags.length > 0 ? fields.tags : undefined,
        parent_id: initialParentId || null,
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [title, description, url, startDateTime, fields, onSubmit, showToast, initialParentId]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') onClose();
  }, [handleSubmit, onClose]);

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-apple-lg shadow-[0_16px_48px_rgba(0,0,0,0.16)] w-[380px] overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-apple-divider">
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100/80 transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-gray-900">
            {initialParentId ? '新建子提醒' : '新建提醒事项'}
          </span>
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || isSubmitting}
            className="text-sm font-semibold text-apple-blue disabled:text-apple-gray disabled:opacity-50 transition-opacity flex items-center gap-1.5"
          >
            {isSubmitting && (
              <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            完成
          </button>
        </div>

        <div className="p-4 max-h-[520px] overflow-y-auto">
          {initialParentId && (
            <div className="mb-3 px-3 py-2 rounded-[10px] bg-[#F2F2F7] text-[13px] text-gray-600">
              父任务：
              <span className="font-medium text-gray-900 ml-1">
                {initialParentTitle || '当前提醒'}
              </span>
            </div>
          )}
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="标题"
            className="w-full text-[17px] font-semibold text-gray-900 placeholder-apple-gray bg-transparent border-none outline-none"
          />
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="备注"
            className="w-full mt-0.5 text-[13px] text-apple-gray placeholder-apple-gray bg-transparent border-none outline-none"
          />
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="URL"
            className="w-full mt-0.5 text-[13px] text-apple-blue placeholder-apple-gray bg-transparent border-none outline-none"
          />

          <div className="border-t border-apple-divider mt-3 mb-3" />
          <ReminderFormFields lists={lists} knownTags={knownTags} values={fields} onChange={onFieldsChange} variant="add" />
        </div>
      </div>
    </div>
  );
}
