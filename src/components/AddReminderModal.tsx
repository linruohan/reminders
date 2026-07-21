import { useState, useRef, useEffect, useCallback } from 'react';
import type { ListResponse, TagResponse, Priority, RecurrenceFrequency, TimeUnit } from '@/types/api';
import { invoke } from '@tauri-apps/api/core';
import { recurrenceOptions, remindOptions, priorityOptions, parseRemindValue } from './reminder/formOptions';
import { DatePicker } from './DatePicker';

interface AddReminderModalProps {
  lists: ListResponse[];
  initialListId?: string | null;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description?: string | null;
    url?: string | null;
    due_date?: string | null;
    end_date?: string | null;
    due_time?: string | null;
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
  }) => void;
  initialDate?: string;
  initialTime?: string;
  showToast?: (type: 'success' | 'error' | 'info', message: string) => void;
}

export function AddReminderModal({ lists, initialListId, onClose, onSubmit, initialDate, initialTime, showToast }: AddReminderModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [startDateTime, setStartDateTime] = useState(initialDate && initialTime ? `${initialDate}T${initialTime}` : initialDate || '');
  const [endDateTime, setEndDateTime] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [selectedListId, setSelectedListId] = useState<string>(initialListId || '');
  const [isFlagged, setIsFlagged] = useState(false);
  const [priority, setPriority] = useState('none');
  const [recurrenceFreq, setRecurrenceFreq] = useState('');
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [customUnit, setCustomUnit] = useState('days');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [showEndRepeat, setShowEndRepeat] = useState(false);
  const [remindValue, setRemindValue] = useState('');
  const [customRemindNum, setCustomRemindNum] = useState(1);
  const [customRemindUnit, setCustomRemindUnit] = useState('minutes');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState<TagResponse[]>([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [showRecurrenceDropdown, setShowRecurrenceDropdown] = useState(false);
  const [showRemindDropdown, setShowRemindDropdown] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const recurrenceRef = useRef<HTMLDivElement>(null);
  const remindRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  function splitDateTime(dt: string): { date: string; time: string } | null {
    if (!dt) return null;
    const parts = dt.split('T');
    if (parts.length !== 2) return { date: parts[0], time: '' };
    return { date: parts[0], time: parts[1] || '' };
  }

  /** 验证 URL 格式 */
  function isValidUrl(str: string): boolean {
    if (!str.trim()) return true; // 空值允许
    try {
      const url = new URL(str);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /** 验证日期范围：结束日期应晚于或等于开始日期 */
  function isValidDateRange(start: string, end: string): boolean {
    if (!start || !end) return true; // 任一为空则允许
    const startDate = new Date(start);
    const endDate = new Date(end);
    return endDate >= startDate;
  }

  const handleSubmit = useCallback(async () => {
    // 验证标题
    if (!title.trim()) {
      showToast?.('error', '标题不能为空');
      return;
    }

    // 验证 URL 格式
    if (url.trim() && !isValidUrl(url)) {
      showToast?.('error', 'URL 格式无效，请输入 http:// 或 https:// 开头的链接');
      return;
    }

    // 验证日期范围
    if (startDateTime && endDateTime && !isValidDateRange(startDateTime, endDateTime)) {
      showToast?.('error', '结束日期不能早于开始日期');
      return;
    }

    setIsSubmitting(true);

    let remindData: { remind_before_value: number | null; remind_before_unit: TimeUnit | null };
    if (remindValue === 'custom') {
      remindData = { remind_before_value: customRemindNum, remind_before_unit: customRemindUnit as TimeUnit };
    } else {
      remindData = parseRemindValue(remindValue);
    }

    const start = splitDateTime(startDateTime);
    const end = splitDateTime(endDateTime);

    try {
      onSubmit({
        title: title.trim(),
        description: description.trim() || null,
        url: url.trim() || null,
        due_date: start?.date || null,
        due_time: isAllDay || !start?.time ? null : start.time,
        end_date: end?.date || null,
        end_time: isAllDay || !end?.time ? null : end.time,
        list_id: selectedListId || null,
        is_all_day: isAllDay,
        is_flagged: isFlagged,
        priority: priority as Priority,
        recurrence_frequency: (recurrenceFreq || null) as RecurrenceFrequency | null,
        recurrence_interval: recurrenceFreq === 'custom' ? recurrenceInterval : null,
        custom_recurrence_unit: (recurrenceFreq === 'custom' ? customUnit : null) as TimeUnit | null,
        recurrence_end_date: showEndRepeat && recurrenceEndDate ? recurrenceEndDate : null,
        ...remindData,
        tags: tags.length > 0 ? tags : undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [title, description, url, startDateTime, endDateTime, isAllDay, selectedListId, isFlagged, priority, recurrenceFreq, recurrenceInterval, customUnit, showEndRepeat, recurrenceEndDate, remindValue, customRemindNum, customRemindUnit, tags, onSubmit, showToast]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  }, [handleSubmit, onClose]);

  const searchTagsHandler = useCallback(async (q: string) => {
    if (!q.trim()) {
      setTagSuggestions([]);
      setShowTagSuggestions(false);
      return;
    }
    try {
      const data = await invoke<TagResponse[]>('search_tags', { query: q.trim() });
      const filtered = data.filter(t => !tags.includes(t.name));
      setTagSuggestions(filtered);
      setShowTagSuggestions(filtered.length > 0);
    } catch {
      setTagSuggestions([]);
      setShowTagSuggestions(false);
    }
  }, [tags]);

  const addTag = useCallback((name: string) => {
    const trimmed = name.trim().replace(/^#/, '');
    if (trimmed && !tags.includes(trimmed)) {
      setTags(prev => [...prev, trimmed]);
    }
    setTagInput('');
    setTagSuggestions([]);
    setShowTagSuggestions(false);
  }, [tags]);

  const removeTag = useCallback((name: string) => {
    setTags(prev => prev.filter(t => t !== name));
  }, []);

  const handleTagInputKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(tagInput);
    }
    if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  }, [tagInput, tags, addTag, removeTag]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (recurrenceRef.current && !recurrenceRef.current.contains(e.target as Node)) {
        setShowRecurrenceDropdown(false);
      }
      if (remindRef.current && !remindRef.current.contains(e.target as Node)) {
        setShowRemindDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const chipBase = 'inline-flex items-center gap-1.5 h-8 pl-2.5 pr-2 bg-[#F2F2F7] rounded-[10px] text-[13px] font-medium text-gray-900 hover:bg-[#E5E5EA] transition-colors spring-transition cursor-pointer';

  const activeChip = 'inline-flex items-center gap-1.5 h-8 pl-2.5 pr-2 bg-apple-blue/10 rounded-[10px] text-[13px] font-medium text-apple-blue';

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-apple-lg shadow-[0_16px_48px_rgba(0,0,0,0.16)] w-[380px] overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-apple-divider">
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100/80 transition-all spring-transition"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <span className="text-sm font-semibold text-gray-900">新建提醒事项</span>
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || isSubmitting}
            className="text-sm font-semibold text-apple-blue disabled:text-apple-gray disabled:opacity-50 transition-opacity spring-transition flex items-center gap-1.5"
          >
            {isSubmitting && (
              <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
            )}
            完成
          </button>
        </div>

        <div className="p-4 max-h-[520px] overflow-y-auto">
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

          {/* 时间范围 */}
          <div className="border-t border-apple-divider mt-3 mb-3" />

          <div className="flex items-center gap-2 mb-3">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span className="text-sm font-semibold text-gray-700">时间范围</span>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => { setIsAllDay(true); setEndDateTime(''); }}
              className={`px-3 py-1 text-xs rounded-[8px] font-medium transition-colors ${isAllDay ? 'bg-apple-blue text-white' : 'bg-[#F2F2F7] text-gray-600'}`}
            >
              全天
            </button>
            <button
              onClick={() => setIsAllDay(false)}
              className={`px-3 py-1 text-xs rounded-[8px] font-medium transition-colors ${!isAllDay ? 'bg-apple-blue text-white' : 'bg-[#F2F2F7] text-gray-600'}`}
            >
              时间段
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <DatePicker
              value={startDateTime}
              onChange={setStartDateTime}
              mode={isAllDay ? 'date' : 'datetime-local'}
              placeholder={isAllDay ? '选择日期' : '选择开始时间'}
            />

            {!isAllDay && startDateTime && (
              <div className="flex items-center gap-2 ml-1">
                <span className="text-xs text-gray-400">至</span>
                <DatePicker
                  value={endDateTime}
                  onChange={setEndDateTime}
                  mode="datetime-local"
                  placeholder="选择结束时间"
                />
              </div>
            )}
          </div>

          {/* 重复 */}
          <div className="border-t border-apple-divider mt-3 pt-3">
            <div className="flex items-center gap-2 mb-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
              <span className="text-sm font-semibold text-gray-700">重复</span>
            </div>
            <div className="relative" ref={recurrenceRef}>
              <button
                onClick={() => setShowRecurrenceDropdown(!showRecurrenceDropdown)}
                className={`${recurrenceFreq ? activeChip : chipBase}`}
              >
                {recurrenceOptions.find(o => o.value === recurrenceFreq)?.label || '永不'}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              {showRecurrenceDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-white rounded-apple-lg shadow-[0_8px_24px_rgba(0,0,0,0.12)] border border-apple-divider py-1 z-50 min-w-[140px]">
                  {recurrenceOptions.map(opt => (
                    <button
                      key={opt.value}
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
              <div className="flex items-center gap-2 mt-2 ml-1">
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
                  onChange={(e) => setCustomUnit(e.target.value)}
                  className="px-2 py-1 text-xs bg-[#F2F2F7] rounded-[8px] border-none outline-none"
                >
                  <option value="hours">小时</option>
                  <option value="days">天</option>
                  <option value="weeks">周</option>
                  <option value="months">个月</option>
                  <option value="years">年</option>
                </select>
                <span className="text-xs text-gray-500">重复</span>
              </div>
            )}

            {recurrenceFreq && (
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
            <div className="flex items-center gap-2 mb-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <span className="text-sm font-semibold text-gray-700">提前提醒</span>
            </div>
            <div className="relative" ref={remindRef}>
              <button
                onClick={() => setShowRemindDropdown(!showRemindDropdown)}
                className={`${remindValue ? activeChip : chipBase}`}
              >
                {remindOptions.find(o => o.value === remindValue)?.label || '无'}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              {showRemindDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-white rounded-apple-lg shadow-[0_8px_24px_rgba(0,0,0,0.12)] border border-apple-divider py-1 z-50 min-w-[140px]">
                  {remindOptions.map(opt => (
                    <button
                      key={opt.value}
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
              <div className="flex items-center gap-2 mt-2 ml-1">
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

          {/* 列表 */}
          <div className="border-t border-apple-divider mt-3 pt-3">
            <div className="flex items-center gap-2 mb-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="9" y1="3" x2="9" y2="21"/>
                <line x1="15" y1="3" x2="15" y2="21"/>
              </svg>
              <span className="text-sm font-semibold text-gray-700">列表</span>
            </div>
            <select
              value={selectedListId}
              onChange={(e) => setSelectedListId(e.target.value)}
              className="w-full px-3 py-1.5 text-sm bg-[#F2F2F7] rounded-[10px] border-none outline-none text-gray-700"
            >
              <option value="">提醒事项</option>
              {lists.map(list => (
                <option key={list.id} value={list.id}>{list.name}</option>
              ))}
            </select>
          </div>

          {/* 标签 */}
          <div className="border-t border-apple-divider mt-3 pt-3">
            <div className="flex items-center gap-2 mb-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
              </svg>
              <span className="text-sm font-semibold text-gray-700">标签</span>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map(tag => (
                  <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 bg-apple-blue/10 text-apple-blue text-xs font-medium rounded-full transition-all hover:bg-apple-blue/15">
                    #{tag}
                    <button onClick={() => removeTag(tag)} className="hover:bg-apple-blue/20 rounded-full p-0.5 transition-colors">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="relative">
              <input
                ref={tagInputRef}
                type="text"
                value={tagInput}
                onChange={(e) => {
                  setTagInput(e.target.value);
                  searchTagsHandler(e.target.value);
                }}
                onKeyDown={handleTagInputKeyDown}
                placeholder="添加标签"
                className="w-full px-3 py-1.5 text-sm bg-[#F2F2F7] rounded-[10px] border-none outline-none text-gray-700 placeholder-apple-gray"
              />
              {showTagSuggestions && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-apple-lg shadow-[0_8px_24px_rgba(0,0,0,0.12)] border border-apple-divider py-1 z-50 max-h-[160px] overflow-y-auto">
                  {tagSuggestions.map(t => (
                    <button
                      key={t.id}
                      onClick={() => addTag(t.name)}
                      className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      #{t.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 旗标 */}
          <div className="border-t border-apple-divider mt-3 pt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
              </svg>
              <span className="text-sm font-semibold text-gray-700">旗标</span>
            </div>
            <button
              onClick={() => setIsFlagged(!isFlagged)}
              className={`w-10 h-6 rounded-full transition-colors relative ${isFlagged ? 'bg-apple-blue' : 'bg-gray-300'}`}
            >
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${isFlagged ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {/* 优先级 */}
          <div className="border-t border-apple-divider mt-3 pt-3">
            <div className="flex items-center gap-2 mb-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/>
              </svg>
              <span className="text-sm font-semibold text-gray-700">优先级</span>
            </div>
            <div className="flex gap-1">
              {priorityOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setPriority(opt.value)}
                  className={`px-3 py-1 text-xs rounded-[8px] font-medium transition-colors ${
                    priority === opt.value
                      ? opt.value === 'high' ? 'bg-red-50 text-red-600' : opt.value === 'medium' ? 'bg-orange-50 text-orange-600' : opt.value === 'low' ? 'bg-green-50 text-green-600' : 'bg-[#F2F2F7] text-gray-700'
                      : 'bg-[#F2F2F7] text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-apple-divider" />
        </div>
      </div>
    </div>
  );
}
