import { useState, useRef, useEffect, useCallback, memo, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { invoke } from '@tauri-apps/api/core';
import type {
  ReminderResponse,
  ListResponse,
  OwnerResponse,
  TagResponse,
  TimeUnit,
  Priority,
  RecurrenceFrequency,
  SubtaskResponse,
} from '@/types/api';
import { formatDate, formatTime } from '@/utils/dateUtils';
import { buildUpdates } from '@/utils/reminderUpdates';
import {
  normalizeCustomRecurrenceUnit,
  resolveRemindFields,
  tagNamesToResponses,
  validateReminderFields,
} from '@/utils/reminderForm';
import { ReminderDetailModal } from '../ReminderDetailModal';
import { ReminderSubtasks } from './ReminderSubtasks';
import { recurrenceOptions, remindOptions, priorityOptions, encodeRemindValue } from './formOptions';
import { ReminderDateDropdown } from './ReminderDateDropdown';
import { ReminderTimeDropdown } from './ReminderTimeDropdown';
import { ReminderRemindDropdown } from './ReminderRemindDropdown';
import { ReminderTagsDropdown } from './ReminderTagsDropdown';
import { ReminderRepeatDropdown } from './ReminderRepeatDropdown';
import { ReminderEndRepeatDropdown } from './ReminderEndRepeatDropdown';
import { ReminderListDropdown } from './ReminderListDropdown';

const chipClass =
  'inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F2F2F7] rounded-[10px] text-[13px] font-medium text-gray-700 hover:bg-[#E5E5EA] transition-all duration-200 spring-transition';

function ChipGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="m-0 min-w-0 rounded-[10px] border border-apple-divider px-1.5 pb-1.5 pt-0">
      <legend className="ml-1 px-1 text-[11px] font-medium leading-none text-gray-400">
        {label}
      </legend>
      <div className="flex items-center gap-1.5">{children}</div>
    </fieldset>
  );
}

export const ReminderItemEditMode = memo(function ReminderItemEditMode({
  reminder,
  lists,
  owners,
  onToggleCompleted,
  onSaveAndStopEditing,
  onCancelEditing,
  onChange,
  onDelete,
  onUpdateReminder,
  onCreateSubtask,
  onUpdateSubtask,
  onDeleteSubtask,
  onAddChildReminder,
  showToast,
}: {
  reminder: ReminderResponse;
  lists: ListResponse[];
  owners: OwnerResponse[];
  onToggleCompleted: (id: string) => void;
  onSaveAndStopEditing: (id: string, updates: Partial<ReminderResponse>) => void;
  onCancelEditing: () => void;
  onChange: (updates: Partial<ReminderResponse>) => void;
  onDelete: (id: string) => void;
  onUpdateReminder: (id: string, updates: Partial<ReminderResponse>) => void;
  onCreateSubtask: (reminderId: string, title: string) => Promise<SubtaskResponse | null>;
  onUpdateSubtask: (id: string, patch: { title?: string; is_completed?: boolean }) => Promise<SubtaskResponse | null>;
  onDeleteSubtask: (id: string) => Promise<boolean>;
  onAddChildReminder?: (parent: ReminderResponse) => void;
  showToast?: (type: 'success' | 'error' | 'info', message: string) => void;
}) {
  const [editTitle, setEditTitle] = useState(reminder.title);
  const [editNotes, setEditNotes] = useState(reminder.description || '');
  const [editUrl, setEditUrl] = useState(reminder.url || '');
  const [editEndDate, setEditEndDate] = useState(reminder.end_date || '');
  const [editEndTime, setEditEndTime] = useState(reminder.end_time || '');
  const [editPriority, setEditPriority] = useState<Priority>(reminder.priority || 'none');
  const [editListId, setEditListId] = useState(reminder.list_id || '');
  const [editIsFlagged, setEditIsFlagged] = useState(reminder.is_flagged ?? false);
  const [editRecurrenceFreq, setEditRecurrenceFreq] = useState<string>(reminder.recurrence_frequency ?? '');
  const [editRecurrenceInterval, setEditRecurrenceInterval] = useState(reminder.recurrence_interval ?? 1);
  const [editCustomUnit, setEditCustomUnit] = useState<TimeUnit>(
    normalizeCustomRecurrenceUnit(reminder.custom_recurrence_unit),
  );
  const [editRecurrenceEndDate, setEditRecurrenceEndDate] = useState(reminder.recurrence_end_date || '');
  const [editRemindValue, setEditRemindValue] = useState(() =>
    encodeRemindValue(reminder.remind_before_value, reminder.remind_before_unit),
  );
  const [editTags, setEditTags] = useState<string[]>(reminder.tags?.map(t => t.name) || []);
  const [tagInput, setTagInput] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState<TagResponse[]>([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number } | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showSubtasks, setShowSubtasks] = useState(() => (reminder.subtasks?.length ?? 0) > 0);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const draftRef = useRef<Partial<ReminderResponse>>({});
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const reminderIdRef = useRef(reminder.id);

  const toRemindFields = useCallback(
    (remindValue: string) => resolveRemindFields(remindValue, 1, 'days'),
    [],
  );

  const publishDraft = useCallback((patch: Partial<ReminderResponse>) => {
    draftRef.current = { ...draftRef.current, ...patch };
    onChangeRef.current(draftRef.current);
  }, []);

  const buildInitialDraft = useCallback((r: ReminderResponse): Partial<ReminderResponse> => ({
    title: r.title,
    description: r.description || null,
    url: r.url || null,
    end_date: r.end_date || null,
    end_time: r.end_time || null,
    is_all_day: r.is_all_day ?? false,
    is_flagged: r.is_flagged ?? false,
    priority: r.priority || 'none',
    list_id: r.list_id || null,
    recurrence_frequency: r.recurrence_frequency ?? null,
    recurrence_interval: r.recurrence_frequency === 'custom' ? (r.recurrence_interval ?? 1) : null,
    custom_recurrence_unit: r.recurrence_frequency === 'custom' ? (r.custom_recurrence_unit ?? 'days') : null,
    recurrence_end_date: r.recurrence_end_date || null,
    tags: r.tags ?? [],
    ...resolveRemindFields(
      encodeRemindValue(r.remind_before_value, r.remind_before_unit),
      1,
      'days',
    ),
  }), []);

  // 仅切换编辑目标时重置；子任务缓存更新不要冲掉草稿
  useEffect(() => {
    if (reminderIdRef.current !== reminder.id) {
      reminderIdRef.current = reminder.id;
      setEditTitle(reminder.title);
      setEditNotes(reminder.description || '');
      setEditUrl(reminder.url || '');
      setEditEndDate(reminder.end_date || '');
      setEditEndTime(reminder.end_time || '');
      setEditPriority(reminder.priority || 'none');
      setEditListId(reminder.list_id || '');
      setEditIsFlagged(reminder.is_flagged ?? false);
      setEditRecurrenceFreq(reminder.recurrence_frequency ?? '');
      setEditRecurrenceInterval(reminder.recurrence_interval ?? 1);
      setEditCustomUnit(normalizeCustomRecurrenceUnit(reminder.custom_recurrence_unit));
      setEditRecurrenceEndDate(reminder.recurrence_end_date || '');
      setEditRemindValue(encodeRemindValue(reminder.remind_before_value, reminder.remind_before_unit));
      setEditTags(reminder.tags?.map(t => t.name) || []);
      setShowSubtasks((reminder.subtasks?.length ?? 0) > 0);
      setActiveDropdown(null);
      setDropdownRect(null);
    } else if ((reminder.subtasks?.length ?? 0) > 0) {
      setShowSubtasks(true);
    }
    const initial = buildInitialDraft(reminder);
    draftRef.current = initial;
    onChangeRef.current(initial);
  }, [reminder, buildInitialDraft]);

  const closeDropdown = useCallback(() => {
    setActiveDropdown(null);
    setDropdownRect(null);
  }, []);

  const toggleDropdown = useCallback((name: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (activeDropdown === name) {
      closeDropdown();
    } else {
      setActiveDropdown(name);
      setDropdownRect({ top: rect.bottom + 4, left: rect.left });
    }
  }, [activeDropdown, closeDropdown]);

  const updateTitle = (value: string) => {
    setEditTitle(value);
    publishDraft({ title: value });
  };
  const updateNotes = (value: string) => {
    setEditNotes(value);
    publishDraft({ description: value || null });
  };
  const updateUrl = (value: string) => {
    setEditUrl(value);
    publishDraft({ url: value || null });
  };
  const updateListId = (value: string) => {
    setEditListId(value);
    publishDraft({ list_id: value || null });
  };
  const updateFlagged = (value: boolean) => {
    setEditIsFlagged(value);
    publishDraft({ is_flagged: value });
  };
  const updateRecurrenceFreq = (value: string) => {
    setEditRecurrenceFreq(value);
    publishDraft({
      recurrence_frequency: (value || null) as RecurrenceFrequency | null,
      recurrence_interval: value === 'custom' ? editRecurrenceInterval : null,
      custom_recurrence_unit: value === 'custom' ? editCustomUnit : null,
    });
  };
  const updateRecurrenceInterval = (value: number) => {
    setEditRecurrenceInterval(value);
    publishDraft({ recurrence_interval: value });
  };
  const updateCustomUnit = (value: TimeUnit) => {
    setEditCustomUnit(value);
    publishDraft({ custom_recurrence_unit: value });
  };
  const updateRecurrenceEndDate = (value: string) => {
    setEditRecurrenceEndDate(value);
    publishDraft({ recurrence_end_date: value || null });
  };
  const updateRemindValue = (value: string) => {
    setEditRemindValue(value);
    publishDraft(toRemindFields(value));
  };
  const updateEndDate = (value: string) => {
    setEditEndDate(value);
    publishDraft({ end_date: value || null });
  };
  const updateEndTime = (value: string) => {
    setEditEndTime(value);
    publishDraft({ end_time: value || null, is_all_day: !value });
  };
  const updatePriority = (value: Priority) => {
    setEditPriority(value);
    publishDraft({ priority: value });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }, 50);
    return () => clearTimeout(timer);
  }, []);

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
    const updates = buildUpdates(reminder, draft);
    onSaveAndStopEditing(reminder.id, updates);
  }, [onSaveAndStopEditing, reminder, showToast]);

  const handleCancel = useCallback(() => {
    onCancelEditing();
  }, [onCancelEditing]);

  const handleTagInputChange = useCallback(async (value: string) => {
    setTagInput(value);
    if (!value.trim()) {
      setTagSuggestions([]);
      setShowTagSuggestions(false);
      return;
    }
    try {
      const data = await invoke<TagResponse[]>('search_tags', { query: value.trim() });
      const filtered = data.filter(t => !editTags.includes(t.name));
      setTagSuggestions(filtered);
      setShowTagSuggestions(filtered.length > 0);
    } catch {
      setTagSuggestions([]);
      setShowTagSuggestions(false);
    }
  }, [editTags]);

  const addTag = useCallback((name: string) => {
    const trimmed = name.trim().replace(/^#/, '');
    if (trimmed && !editTags.includes(trimmed)) {
      const next = [...editTags, trimmed];
      setEditTags(next);
      publishDraft({ tags: tagNamesToResponses(next) });
    }
    setTagInput('');
    setTagSuggestions([]);
    setShowTagSuggestions(false);
  }, [editTags, publishDraft]);

  const removeTag = useCallback((name: string) => {
    const next = editTags.filter(t => t !== name);
    setEditTags(next);
    publishDraft({ tags: tagNamesToResponses(next) });
  }, [editTags, publishDraft]);

  const handleAddChild = useCallback(() => {
    onAddChildReminder?.(reminder);
  }, [onAddChildReminder, reminder]);

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
                <polyline points="20 6 9 17 4 12" />
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
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') handleCancel();
                  }}
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

            <div className="flex flex-wrap items-start gap-2">
              <ChipGroup label="日期">
                <button type="button" title="设置提醒的日期" onClick={(e) => toggleDropdown('endDate', e)} className={chipClass}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><line x1="10" y1="14" x2="14" y2="14" /></svg>
                  {editEndDate ? formatDate(editEndDate) : '截止日期'}
                </button>
                <button type="button" title="设置提醒的时间" onClick={(e) => toggleDropdown('endTime', e)} className={chipClass}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                  {editEndTime ? formatTime(editEndTime) : '截止时间'}
                </button>
              </ChipGroup>

              <ChipGroup label="标记">
                <button type="button" title="添加标签分类" onClick={(e) => toggleDropdown('tags', e)} className={chipClass}>
                  <span className="text-xs font-bold leading-none">#</span>
                  {editTags.length > 0 ? `${editTags.length}个标签` : '标签'}
                </button>
                <button
                  type="button"
                  title={editIsFlagged ? '取消旗标' : '标记为旗标'}
                  onClick={() => updateFlagged(!editIsFlagged)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[13px] font-medium transition-all duration-200 spring-transition ${
                    editIsFlagged ? 'bg-orange-100 text-orange-500' : 'bg-[#F2F2F7] text-gray-700 hover:bg-[#E5E5EA]'
                  }`}
                  aria-label="旗标"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill={editIsFlagged ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" x2="4" y1="22" y2="15" /></svg>
                </button>
                <button
                  type="button"
                  title="设置优先级"
                  onClick={(e) => toggleDropdown('priority', e)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[13px] font-medium transition-all duration-200 spring-transition ${
                    editPriority === 'high' ? 'bg-red-50 text-red-600'
                      : editPriority === 'medium' ? 'bg-orange-50 text-orange-600'
                        : editPriority === 'low' ? 'bg-green-50 text-green-600'
                          : 'bg-[#F2F2F7] text-gray-700 hover:bg-[#E5E5EA]'
                  }`}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" /></svg>
                  {priorityOptions.find(o => o.value === editPriority)?.label || '优先级'}
                </button>
              </ChipGroup>

              <ChipGroup label="列表">
                <button type="button" title="选择所属列表" onClick={(e) => toggleDropdown('list', e)} className={chipClass}>
                  {editListId ? (lists.find(l => l.id === editListId)?.name || '列表') : '提醒事项'}
                </button>
              </ChipGroup>

              <ChipGroup label="提醒">
                <button type="button" title="设置提前提醒" onClick={(e) => toggleDropdown('remind', e)} className={chipClass}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
                  {editRemindValue ? (remindOptions.find(o => o.value === editRemindValue)?.label || '自定义') : '提醒'}
                </button>
              </ChipGroup>

              <ChipGroup label="重复">
                <button type="button" title="设置重复规则" onClick={(e) => toggleDropdown('repeat', e)} className={chipClass}>
                  {editRecurrenceFreq ? (recurrenceOptions.find(o => o.value === editRecurrenceFreq)?.label || '自定义') : '重复'}
                </button>
                <button type="button" title="设置重复结束日期" onClick={(e) => toggleDropdown('endRepeat', e)} className={chipClass}>
                  {editRecurrenceEndDate ? `${formatDate(editRecurrenceEndDate)}结束` : '结束重复'}
                </button>
              </ChipGroup>

              <button
                type="button"
                title="新建子提醒（父任务为当前提醒）"
                onClick={handleAddChild}
                className="inline-flex items-center justify-center w-8 h-8 rounded-[10px] bg-[#F2F2F7] text-apple-blue hover:bg-apple-blue/10 transition-colors spring-transition flex-shrink-0 self-center"
                aria-label="新建子提醒"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </div>

            {showSubtasks && (
              <ReminderSubtasks
                reminderId={reminder.id}
                parentTitle={editTitle || reminder.title}
                subtasks={reminder.subtasks ?? []}
                mode="edit"
                onCreate={onCreateSubtask}
                onUpdate={onUpdateSubtask}
                onDelete={onDeleteSubtask}
              />
            )}
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
          onDelete={(id) => {
            setShowDetail(false);
            onCancelEditing();
            onDelete(id);
          }}
          onToggleCompleted={() => onToggleCompleted(reminder.id)}
          onEdit={() => { setShowDetail(false); }}
          onUpdateReminder={onUpdateReminder}
          onCreateSubtask={onCreateSubtask}
          onUpdateSubtask={onUpdateSubtask}
          onDeleteSubtask={onDeleteSubtask}
        />
      )}

      {activeDropdown && dropdownRect && createPortal(
        <div
          className="reminder-edit-dropdown fixed z-[10000]"
          style={{ top: dropdownRect.top, left: dropdownRect.left }}
          onClick={(e) => e.stopPropagation()}
        >
          {activeDropdown === 'endDate' && (
            <ReminderDateDropdown
              editDate={editEndDate}
              onDateChange={updateEndDate}
              onClose={closeDropdown}
            />
          )}
          {activeDropdown === 'endTime' && (
            <ReminderTimeDropdown
              editTime={editEndTime}
              onTimeChange={updateEndTime}
              onClose={closeDropdown}
            />
          )}
          {activeDropdown === 'priority' && (
            <div className="bg-white rounded-apple-lg shadow-lg border border-apple-divider py-1 min-w-[120px]">
              {priorityOptions.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { updatePriority(opt.value as Priority); closeDropdown(); }}
                  className={`w-full text-left px-4 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
                    editPriority === opt.value
                      ? opt.value === 'high' ? 'bg-red-50 text-red-600'
                        : opt.value === 'medium' ? 'bg-orange-50 text-orange-600'
                          : opt.value === 'low' ? 'bg-green-50 text-green-600'
                            : 'bg-apple-blue/10 text-apple-blue'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
          {activeDropdown === 'remind' && (
            <ReminderRemindDropdown
              editRemindValue={editRemindValue}
              onRemindChange={updateRemindValue}
              onClose={closeDropdown}
            />
          )}
          {activeDropdown === 'tags' && (
            <ReminderTagsDropdown
              editTags={editTags}
              tagInput={tagInput}
              tagSuggestions={tagSuggestions}
              showTagSuggestions={showTagSuggestions}
              onTagInputChange={handleTagInputChange}
              onTagAdd={addTag}
              onTagRemove={removeTag}
              onTagInputKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag(tagInput);
                }
              }}
            />
          )}
          {activeDropdown === 'repeat' && (
            <ReminderRepeatDropdown
              editRecurrenceFreq={editRecurrenceFreq}
              editRecurrenceInterval={editRecurrenceInterval}
              editCustomUnit={editCustomUnit}
              onFreqChange={updateRecurrenceFreq}
              onIntervalChange={updateRecurrenceInterval}
              onUnitChange={updateCustomUnit}
              onClose={closeDropdown}
            />
          )}
          {activeDropdown === 'endRepeat' && (
            <ReminderEndRepeatDropdown
              editRecurrenceEndDate={editRecurrenceEndDate}
              onEndDateChange={updateRecurrenceEndDate}
              onClose={closeDropdown}
            />
          )}
          {activeDropdown === 'list' && (
            <ReminderListDropdown
              editListId={editListId}
              lists={lists}
              onListChange={updateListId}
              onClose={closeDropdown}
            />
          )}
        </div>,
        document.body,
      )}
    </>
  );
});
