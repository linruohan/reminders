import { useState, useRef, useEffect, useCallback, memo } from 'react';
import type { ReminderResponse, ListResponse, OwnerResponse } from '@/types/api';
import {
  ReminderFormFields,
  type ReminderFormFieldValues,
} from './ReminderFormFields';
import { buildUpdates } from '@/utils/reminderUpdates';
import {
  formFieldsToReminderPatch,
  initRemindUiState,
  joinEndDateTime,
  normalizeCustomRecurrenceUnit,
  validateReminderFields,
} from '@/utils/reminderForm';
import { ReminderDetailModal } from '../ReminderDetailModal';

function fieldsFromReminder(reminder: ReminderResponse): ReminderFormFieldValues {
  const initialRemind = initRemindUiState(reminder.remind_before_value, reminder.remind_before_unit);
  return {
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
  };
}

export const ReminderItemEditMode = memo(function ReminderItemEditMode({
  reminder,
  lists,
  owners,
  onToggleCompleted,
  onSaveAndStopEditing,
  onCancelEditing,
  onChange,
  showToast,
}: {
  reminder: ReminderResponse;
  lists: ListResponse[];
  owners: OwnerResponse[];
  onToggleCompleted: (id: string) => void;
  onSaveAndStopEditing: (id: string, updates: Partial<ReminderResponse>) => void;
  onCancelEditing: () => void;
  onChange: (updates: Partial<ReminderResponse>) => void;
  showToast?: (type: 'success' | 'error' | 'info', message: string) => void;
}) {
  const [editTitle, setEditTitle] = useState(reminder.title);
  const [editNotes, setEditNotes] = useState(reminder.description || '');
  const [editUrl, setEditUrl] = useState(reminder.url || '');
  const [fields, setFields] = useState<ReminderFormFieldValues>(() => fieldsFromReminder(reminder));
  const [showDetail, setShowDetail] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const draftRef = useRef<Partial<ReminderResponse>>({});
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const publishDraft = useCallback((
    title: string,
    notes: string,
    url: string,
    nextFields: ReminderFormFieldValues,
  ) => {
    const draft: Partial<ReminderResponse> = {
      title,
      description: notes || null,
      url: url || null,
      ...formFieldsToReminderPatch(nextFields),
    };
    draftRef.current = draft;
    onChangeRef.current(draft);
  }, []);

  useEffect(() => {
    const nextFields = fieldsFromReminder(reminder);
    setEditTitle(reminder.title);
    setEditNotes(reminder.description || '');
    setEditUrl(reminder.url || '');
    setFields(nextFields);
    publishDraft(reminder.title, reminder.description || '', reminder.url || '', nextFields);
  }, [reminder, publishDraft]);

  useEffect(() => {
    const timer = setTimeout(() => {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const updateTitle = (value: string) => {
    setEditTitle(value);
    publishDraft(value, editNotes, editUrl, fields);
  };
  const updateNotes = (value: string) => {
    setEditNotes(value);
    publishDraft(editTitle, value, editUrl, fields);
  };
  const updateUrl = (value: string) => {
    setEditUrl(value);
    publishDraft(editTitle, editNotes, value, fields);
  };

  const onFieldsChange = useCallback((patch: Partial<ReminderFormFieldValues>) => {
    setFields(prev => {
      const next = { ...prev, ...patch };
      publishDraft(editTitle, editNotes, editUrl, next);
      return next;
    });
  }, [editTitle, editNotes, editUrl, publishDraft]);

  const handleSave = useCallback(() => {
    const draft = draftRef.current;
    const fieldError = validateReminderFields({
      title: draft.title ?? reminder.title,
      url: draft.url ?? reminder.url,
    });
    if (fieldError) {
      showToast?.('error', fieldError);
      return;
    }
    const updates = buildUpdates(reminder, {
      title: (draft.title ?? reminder.title).trim(),
      description: draft.description ?? null,
      url: draft.url ?? null,
      ...formFieldsToReminderPatch(fields),
    });
    onSaveAndStopEditing(reminder.id, updates);
  }, [fields, onSaveAndStopEditing, reminder, showToast]);

  const handleCancel = useCallback(() => {
    onCancelEditing();
  }, [onCancelEditing]);

  return (
    <>
      <div
        className={`reminder-item reminder-item-editing relative z-50 px-5 py-4 rounded-[20px] transition-all duration-250 animate-slide-down ${
          reminder.is_completed ? 'bg-gray-50/70' : 'bg-white shadow-[0_4px_16px_rgba(0,0,0,0.08)]'
        }`}
      >
        <div className="flex items-start gap-4">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleCompleted(reminder.id);
            }}
            className={`w-[22px] h-[22px] rounded-[6px] border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all duration-250 spring-transition ${
              reminder.is_completed
                ? 'bg-apple-blue border-apple-blue shadow-[0_2px_8px_rgba(0,122,255,0.35)]'
                : 'border-apple-gray-dark hover:border-apple-blue hover:shadow-[0_1px_4px_rgba(0,122,255,0.2)]'
            }`}
          >
            {reminder.is_completed && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            )}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <input
                  ref={titleInputRef}
                  type="text"
                  value={editTitle}
                  onChange={(e) => updateTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave();
                    if (e.key === 'Escape') handleCancel();
                  }}
                  className={`w-full text-[17px] font-semibold leading-snug bg-transparent border-none outline-none placeholder-apple-gray ${
                    reminder.is_completed ? 'text-apple-gray' : 'text-gray-900'
                  }`}
                  placeholder="新提醒事项"
                />
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => updateNotes(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') handleCancel();
                  }}
                  className="w-full mt-0.5 text-[13px] leading-snug text-apple-gray bg-transparent border-none outline-none placeholder-apple-gray"
                  placeholder="备注"
                />
                <input
                  type="url"
                  value={editUrl}
                  onChange={(e) => updateUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Escape') handleCancel(); }}
                  className="w-full mt-0.5 text-[13px] leading-snug text-apple-blue bg-transparent border-none outline-none placeholder-apple-gray"
                  placeholder="URL"
                />
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDetail(true);
                }}
                className="w-[24px] h-[24px] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-apple-blue text-white hover:bg-[#0066CC] transition-colors spring-transition shadow-[0_2px_8px_rgba(0,122,255,0.3)]"
                aria-label="详情"
              >
                <span className="text-[12px] font-bold leading-none italic" style={{ fontFamily: 'Georgia, serif' }}>i</span>
              </button>
            </div>

            <div className="border-t border-apple-divider mt-3 mb-3" />

            <ReminderFormFields
              lists={lists}
              values={fields}
              onChange={onFieldsChange}
              variant="edit"
            />
          </div>
        </div>
      </div>

      {showDetail && (
        <ReminderDetailModal
          reminder={reminder}
          lists={lists}
          owners={owners}
          isOpen={showDetail}
          onClose={() => setShowDetail(false)}
          onDelete={() => { setShowDetail(false); onCancelEditing(); }}
          onToggleCompleted={() => onToggleCompleted(reminder.id)}
          onEdit={() => { setShowDetail(false); }}
        />
      )}
    </>
  );
});
