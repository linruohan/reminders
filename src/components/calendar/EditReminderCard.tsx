import { useState, useRef, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { ReminderResponse, ListResponse, Priority, TagResponse, TimeUnit } from '@/types/api';
import { DatePicker } from '../DatePicker';
import {
  recurrenceOptions,
  remindOptions,
  priorityOptions,
} from '../reminder/formOptions';
import { buildUpdates } from '@/utils/reminderUpdates';
import {
  initRemindUiState,
  joinEndDateTime,
  normalizeCustomRecurrenceUnit,
  resolveRecurrenceFields,
  resolveRemindFields,
  splitDateTime,
  tagNamesToResponses,
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

const chipBase = 'inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F2F2F7] rounded-[10px] text-sm font-medium text-gray-700 hover:bg-[#E5E5EA] transition-colors';
const activeChip = 'inline-flex items-center gap-1.5 px-3 py-1.5 bg-apple-blue/10 text-apple-blue rounded-[10px] text-sm font-medium transition-colors';

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
  const [endDateTime, setEndDateTime] = useState(
    joinEndDateTime(reminder.end_date, reminder.end_time, reminder.is_all_day ?? false)
  );
  const [isAllDay, setIsAllDay] = useState(reminder.is_all_day ?? false);
  const [selectedListId, setSelectedListId] = useState(reminder.list_id || '');
  const [isFlagged, setIsFlagged] = useState(reminder.is_flagged ?? false);
  const [priority, setPriority] = useState<Priority>(reminder.priority || 'none');

  const [recurrenceFreq, setRecurrenceFreq] = useState(reminder.recurrence_frequency ?? '');
  const [recurrenceInterval, setRecurrenceInterval] = useState(reminder.recurrence_interval ?? 1);
  const [customUnit, setCustomUnit] = useState(
    normalizeCustomRecurrenceUnit(reminder.custom_recurrence_unit)
  );
  const [showEndRepeat, setShowEndRepeat] = useState(Boolean(reminder.recurrence_end_date));
  const [recurrenceEndDate, setRecurrenceEndDate] = useState(reminder.recurrence_end_date || '');

  const initialRemind = initRemindUiState(reminder.remind_before_value, reminder.remind_before_unit);
  const [remindValue, setRemindValue] = useState(initialRemind.remindValue);
  const [customRemindNum, setCustomRemindNum] = useState(initialRemind.customRemindNum);
  const [customRemindUnit, setCustomRemindUnit] = useState(initialRemind.customRemindUnit);

  const [tags, setTags] = useState<string[]>(reminder.tags?.map(t => t.name) || []);
  const [tagInput, setTagInput] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState<TagResponse[]>([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);

  const [showRecurrenceDropdown, setShowRecurrenceDropdown] = useState(false);
  const [showRemindDropdown, setShowRemindDropdown] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const recurrenceRef = useRef<HTMLDivElement>(null);
  const remindRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (recurrenceRef.current && !recurrenceRef.current.contains(t)) setShowRecurrenceDropdown(false);
      if (remindRef.current && !remindRef.current.contains(t)) setShowRemindDropdown(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const searchTags = useCallback(async (q: string) => {
    if (!q.trim()) {
      setTagSuggestions([]);
      setShowTagSuggestions(false);
      return;
    }
    try {
      const data = await invoke<TagResponse[]>('search_tags', { query: q.trim() });
      setTagSuggestions(data.filter(t => !tags.includes(t.name)));
      setShowTagSuggestions(true);
    } catch {
      setTagSuggestions([]);
      setShowTagSuggestions(false);
    }
  }, [tags]);

  const addTag = useCallback((name: string) => {
    const trimmed = name.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags(prev => [...prev, trimmed]);
    }
    setTagInput('');
    setShowTagSuggestions(false);
  }, [tags]);

  const removeTag = useCallback((name: string) => {
    setTags(prev => prev.filter(t => t !== name));
  }, []);

  const handleSave = useCallback(() => {
    const fieldError = validateReminderFields({ title, url });
    if (fieldError) {
      showToast?.('error', fieldError);
      return;
    }

    const end = splitDateTime(endDateTime);
    const updates = buildUpdates(reminder, {
      title: title.trim(),
      description: description || null,
      url: url || null,
      end_date: end?.date || null,
      end_time: isAllDay ? null : (end?.time || null),
      is_all_day: isAllDay,
      list_id: selectedListId || null,
      is_flagged: isFlagged,
      priority,
      ...resolveRecurrenceFields(
        recurrenceFreq,
        recurrenceInterval,
        customUnit,
        showEndRepeat,
        recurrenceEndDate,
      ),
      ...resolveRemindFields(remindValue, customRemindNum, customRemindUnit),
      tags: tagNamesToResponses(tags),
    });

    onSave(reminder.id, updates);
    onClose();
  }, [
    title, description, url, endDateTime, isAllDay, selectedListId, isFlagged, priority,
    recurrenceFreq, recurrenceInterval, customUnit, showEndRepeat, recurrenceEndDate,
    remindValue, customRemindNum, customRemindUnit, tags, reminder, onSave, onClose, showToast,
  ]);

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-apple-lg shadow-[0_16px_48px_rgba(0,0,0,0.16)] w-[400px] overflow-hidden animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-apple-divider">
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-all" aria-label="关闭">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
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

          <div className="flex items-center gap-2 mb-3">
            <button
              type="button"
              onClick={() => { setIsAllDay(true); }}
              className={`px-3 py-1 text-xs rounded-[8px] font-medium ${isAllDay ? 'bg-apple-blue text-white' : 'bg-[#F2F2F7] text-gray-600'}`}
            >
              全天
            </button>
            <button
              type="button"
              onClick={() => setIsAllDay(false)}
              className={`px-3 py-1 text-xs rounded-[8px] font-medium ${!isAllDay ? 'bg-apple-blue text-white' : 'bg-[#F2F2F7] text-gray-600'}`}
            >
              指定时间
            </button>
          </div>
          <DatePicker
            value={endDateTime}
            onChange={setEndDateTime}
            mode={isAllDay ? 'date' : 'datetime-local'}
            placeholder={isAllDay ? '选择截止日期' : '选择截止时间'}
          />

          {/* 重复 */}
          <div className="border-t border-apple-divider mt-3 pt-3">
            <div className="text-xs font-semibold text-gray-500 mb-2">重复</div>
            <div className="relative" ref={recurrenceRef}>
              <button
                type="button"
                onClick={() => setShowRecurrenceDropdown(!showRecurrenceDropdown)}
                className={recurrenceFreq ? activeChip : chipBase}
              >
                {recurrenceOptions.find(o => o.value === recurrenceFreq)?.label || '永不'}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              {showRecurrenceDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-white rounded-apple-lg shadow-[0_8px_24px_rgba(0,0,0,0.12)] border border-apple-divider py-1 z-50 min-w-[140px]">
                  {recurrenceOptions.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setRecurrenceFreq(opt.value);
                        setShowRecurrenceDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors ${recurrenceFreq === opt.value ? 'text-apple-blue font-medium' : 'text-gray-700'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {recurrenceFreq === 'custom' && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-gray-500">每</span>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={recurrenceInterval}
                  onChange={(e) => setRecurrenceInterval(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-14 px-2 py-1 text-xs bg-[#F2F2F7] rounded-[8px] border-none outline-none text-center"
                />
                <select
                  value={customUnit}
                  onChange={(e) => setCustomUnit(e.target.value as TimeUnit)}
                  className="px-2 py-1 text-xs bg-[#F2F2F7] rounded-[8px] border-none outline-none"
                >
                  <option value="days">天</option>
                  <option value="weeks">周</option>
                  <option value="months">个月</option>
                  <option value="years">年</option>
                </select>
              </div>
            )}
            {!!recurrenceFreq && (
              <div className="mt-2 flex items-center gap-2">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showEndRepeat}
                    onChange={(e) => setShowEndRepeat(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-gray-300 text-apple-blue focus:ring-apple-blue"
                  />
                  <span className="text-xs text-gray-500">结束重复</span>
                </label>
                {showEndRepeat && (
                  <DatePicker
                    value={recurrenceEndDate}
                    onChange={setRecurrenceEndDate}
                    mode="date"
                    placeholder="选择结束日期"
                  />
                )}
              </div>
            )}
          </div>

          {/* 提前提醒 */}
          <div className="border-t border-apple-divider mt-3 pt-3">
            <div className="text-xs font-semibold text-gray-500 mb-2">提前提醒</div>
            <div className="relative" ref={remindRef}>
              <button
                type="button"
                onClick={() => setShowRemindDropdown(!showRemindDropdown)}
                className={remindValue ? activeChip : chipBase}
              >
                {remindOptions.find(o => o.value === remindValue)?.label
                  || (remindValue === 'custom' ? '自定义' : '无')}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              {showRemindDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-white rounded-apple-lg shadow-[0_8px_24px_rgba(0,0,0,0.12)] border border-apple-divider py-1 z-50 min-w-[140px]">
                  {remindOptions.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setRemindValue(opt.value);
                        setShowRemindDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors ${remindValue === opt.value ? 'text-apple-blue font-medium' : 'text-gray-700'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {remindValue === 'custom' && (
              <div className="flex items-center gap-2 mt-2">
                <select
                  value={customRemindNum}
                  onChange={(e) => setCustomRemindNum(parseInt(e.target.value))}
                  className="px-2 py-1 text-xs bg-[#F2F2F7] rounded-[8px] border-none outline-none"
                >
                  {Array.from({ length: 50 }, (_, i) => i + 1).map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <select
                  value={customRemindUnit}
                  onChange={(e) => setCustomRemindUnit(e.target.value)}
                  className="px-2 py-1 text-xs bg-[#F2F2F7] rounded-[8px] border-none outline-none"
                >
                  <option value="minutes">分钟</option>
                  <option value="hours">小时</option>
                  <option value="days">天</option>
                  <option value="weeks">周</option>
                  <option value="months">个月</option>
                </select>
                <span className="text-xs text-gray-500">前</span>
              </div>
            )}
          </div>

          {/* 列表 / 旗标 / 优先级 */}
          <div className="mt-3 pt-3 border-t border-apple-divider">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500">列表</span>
              <button
                type="button"
                onClick={() => setIsFlagged(!isFlagged)}
                className={`w-8 h-[18px] rounded-full transition-colors relative ${isFlagged ? 'bg-apple-blue' : 'bg-gray-300'}`}
                aria-label="旗标"
              >
                <div className={`absolute top-0.5 w-[14px] h-[14px] bg-white rounded-full shadow-sm transition-transform ${isFlagged ? 'translate-x-[16px]' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              {lists.map(list => (
                <button
                  key={list.id}
                  type="button"
                  onClick={() => setSelectedListId(selectedListId === list.id ? '' : list.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-[10px] text-sm font-medium transition-colors spring-transition ${
                    selectedListId === list.id ? 'bg-blue-50 text-apple-blue' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: list.color }} />
                  {list.name}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              {priorityOptions.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPriority(opt.value as Priority)}
                  className={`px-2.5 py-1 text-xs rounded-[8px] font-medium transition-colors ${
                    priority === opt.value
                      ? opt.value === 'high' ? 'bg-red-50 text-red-600'
                        : opt.value === 'medium' ? 'bg-orange-50 text-orange-600'
                          : opt.value === 'low' ? 'bg-green-50 text-green-600'
                            : 'bg-[#F2F2F7] text-gray-700'
                      : 'bg-[#F2F2F7] text-gray-500'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 标签 */}
          <div className="border-t border-apple-divider mt-3 pt-3">
            <div className="text-xs font-semibold text-gray-500 mb-2">标签</div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map(tag => (
                  <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 bg-apple-blue/10 text-apple-blue text-xs font-medium rounded-full">
                    #{tag}
                    <button type="button" onClick={() => removeTag(tag)} className="hover:bg-apple-blue/20 rounded-full p-0.5" aria-label={`移除 ${tag}`}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="relative">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => {
                  setTagInput(e.target.value);
                  searchTags(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag(tagInput);
                  }
                  if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
                    removeTag(tags[tags.length - 1]);
                  }
                }}
                placeholder="添加标签"
                className="w-full px-3 py-1.5 text-sm bg-[#F2F2F7] rounded-[10px] border-none outline-none text-gray-700 placeholder-apple-gray"
              />
              {showTagSuggestions && tagSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-apple-lg shadow-[0_8px_24px_rgba(0,0,0,0.12)] border border-apple-divider py-1 z-50 max-h-[140px] overflow-y-auto">
                  {tagSuggestions.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => addTag(t.name)}
                      className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      #{t.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
