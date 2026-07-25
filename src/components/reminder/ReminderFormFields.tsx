import { useCallback, useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { ListResponse, Priority, TagResponse } from '@/types/api';
import { DatePicker } from '../DatePicker';
import { recurrenceOptions, remindOptions, priorityOptions } from './formOptions';
import { getTagColorStyle } from '@/utils/tagColors';

export interface ReminderFormFieldValues {
  endDateTime: string;
  isAllDay: boolean;
  recurrenceFreq: string;
  recurrenceInterval: number;
  customUnit: string;
  showEndRepeat: boolean;
  recurrenceEndDate: string;
  remindValue: string;
  customRemindNum: number;
  customRemindUnit: string;
  selectedListId: string;
  isFlagged: boolean;
  priority: Priority | string;
  tags: string[];
}

export interface ReminderFormFieldsProps {
  lists: ListResponse[];
  values: ReminderFormFieldValues;
  onChange: (patch: Partial<ReminderFormFieldValues>) => void;
  /** add：图标标题 + select 列表；edit：精简标题 + chip 列表 */
  variant?: 'add' | 'edit';
}

const chipBase =
  'inline-flex items-center gap-1.5 h-8 pl-2.5 pr-2 bg-[#F2F2F7] rounded-[10px] text-[13px] font-medium text-gray-900 hover:bg-[#E5E5EA] transition-colors cursor-pointer';
const activeChip =
  'inline-flex items-center gap-1.5 h-8 pl-2.5 pr-2 bg-apple-blue/10 rounded-[10px] text-[13px] font-medium text-apple-blue';

function SectionTitle({
  variant,
  label,
  icon,
}: {
  variant: 'add' | 'edit';
  label: string;
  icon?: React.ReactNode;
}) {
  if (variant === 'edit') {
    return <div className="text-xs font-semibold text-gray-500 mb-2">{label}</div>;
  }
  return (
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <span className="text-sm font-semibold text-gray-700">{label}</span>
    </div>
  );
}

export function ReminderFormFields({
  lists,
  values,
  onChange,
  variant = 'add',
}: ReminderFormFieldsProps) {
  const [showRecurrenceDropdown, setShowRecurrenceDropdown] = useState(false);
  const [showRemindDropdown, setShowRemindDropdown] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState<TagResponse[]>([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const recurrenceRef = useRef<HTMLDivElement>(null);
  const remindRef = useRef<HTMLDivElement>(null);

  const patch = useCallback(
    (p: Partial<ReminderFormFieldValues>) => onChange(p),
    [onChange],
  );

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (recurrenceRef.current && !recurrenceRef.current.contains(t)) {
        setShowRecurrenceDropdown(false);
      }
      if (remindRef.current && !remindRef.current.contains(t)) {
        setShowRemindDropdown(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const searchTags = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setTagSuggestions([]);
        setShowTagSuggestions(false);
        return;
      }
      try {
        const data = await invoke<TagResponse[]>('search_tags', { query: q.trim() });
        setTagSuggestions(data.filter(t => !values.tags.includes(t.name)));
        setShowTagSuggestions(true);
      } catch {
        setTagSuggestions([]);
        setShowTagSuggestions(false);
      }
    },
    [values.tags],
  );

  const addTag = useCallback(
    (name: string) => {
      const trimmed = name.trim().replace(/^#/, '');
      if (trimmed && !values.tags.includes(trimmed)) {
        patch({ tags: [...values.tags, trimmed] });
      }
      setTagInput('');
      setTagSuggestions([]);
      setShowTagSuggestions(false);
    },
    [values.tags, patch],
  );

  const removeTag = useCallback(
    (name: string) => {
      patch({ tags: values.tags.filter(t => t !== name) });
    },
    [values.tags, patch],
  );

  return (
    <>
      {variant === 'add' && (
        <div className="flex items-center gap-2 mb-3">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span className="text-sm font-semibold text-gray-700">截止日期</span>
        </div>
      )}

      <div className="flex items-center gap-2 mb-2">
        <button
          type="button"
          onClick={() => patch({ isAllDay: true })}
          className={`px-3 py-1 text-xs rounded-[8px] font-medium ${values.isAllDay ? 'bg-apple-blue text-white' : 'bg-[#F2F2F7] text-gray-600'}`}
        >
          全天
        </button>
        <button
          type="button"
          onClick={() => patch({ isAllDay: false })}
          className={`px-3 py-1 text-xs rounded-[8px] font-medium ${!values.isAllDay ? 'bg-apple-blue text-white' : 'bg-[#F2F2F7] text-gray-600'}`}
        >
          指定时间
        </button>
      </div>

      <DatePicker
        value={values.endDateTime}
        onChange={(v) => patch({ endDateTime: v })}
        mode={values.isAllDay ? 'date' : 'datetime-local'}
        placeholder={values.isAllDay ? '选择截止日期' : '选择截止时间'}
      />

      <div className="border-t border-apple-divider mt-3 pt-3">
        <SectionTitle
          variant={variant}
          label="重复"
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          }
        />
        <div className="relative" ref={recurrenceRef}>
          <button
            type="button"
            onClick={() => setShowRecurrenceDropdown(!showRecurrenceDropdown)}
            className={values.recurrenceFreq ? activeChip : chipBase}
          >
            {recurrenceOptions.find(o => o.value === values.recurrenceFreq)?.label || '永不'}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
          </button>
          {showRecurrenceDropdown && (
            <div className="absolute top-full left-0 mt-1 bg-white rounded-apple-lg shadow-[0_8px_24px_rgba(0,0,0,0.12)] border border-apple-divider py-1 z-50 min-w-[140px]">
              {recurrenceOptions.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    patch({ recurrenceFreq: opt.value });
                    setShowRecurrenceDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors ${values.recurrenceFreq === opt.value ? 'text-apple-blue font-medium' : 'text-gray-700'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {values.recurrenceFreq === 'custom' && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-gray-500">每</span>
            <input
              type="number"
              min={1}
              max={99}
              value={values.recurrenceInterval}
              onChange={(e) => patch({ recurrenceInterval: Math.max(1, parseInt(e.target.value, 10) || 1) })}
              className="w-14 px-2 py-1 text-xs bg-[#F2F2F7] rounded-[8px] border-none outline-none text-center"
            />
            <select
              value={values.customUnit === 'hours' || values.customUnit === 'minutes' ? 'days' : values.customUnit}
              onChange={(e) => patch({ customUnit: e.target.value })}
              className="px-2 py-1 text-xs bg-[#F2F2F7] rounded-[8px] border-none outline-none"
            >
              <option value="days">天</option>
              <option value="weeks">周</option>
              <option value="months">个月</option>
              <option value="years">年</option>
            </select>
            {variant === 'add' && <span className="text-xs text-gray-500">重复</span>}
          </div>
        )}

        {!!values.recurrenceFreq && (
          <div className="mt-2 flex items-center gap-2">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={values.showEndRepeat}
                onChange={(e) => patch({ showEndRepeat: e.target.checked })}
                className="w-3.5 h-3.5 rounded border-gray-300 text-apple-blue focus:ring-apple-blue"
              />
              <span className="text-xs text-gray-500">结束重复</span>
            </label>
            {values.showEndRepeat && (
              <DatePicker
                value={values.recurrenceEndDate}
                onChange={(v) => patch({ recurrenceEndDate: v })}
                mode="date"
                placeholder="选择结束日期"
              />
            )}
          </div>
        )}
      </div>

      <div className="border-t border-apple-divider mt-3 pt-3">
        <SectionTitle
          variant={variant}
          label="提前提醒"
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          }
        />
        <div className="relative" ref={remindRef}>
          <button
            type="button"
            onClick={() => setShowRemindDropdown(!showRemindDropdown)}
            className={values.remindValue ? activeChip : chipBase}
          >
            {remindOptions.find(o => o.value === values.remindValue)?.label
              || (values.remindValue === 'custom' ? '自定义' : '无')}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
          </button>
          {showRemindDropdown && (
            <div className="absolute top-full left-0 mt-1 bg-white rounded-apple-lg shadow-[0_8px_24px_rgba(0,0,0,0.12)] border border-apple-divider py-1 z-50 min-w-[140px]">
              {remindOptions.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    patch({ remindValue: opt.value });
                    setShowRemindDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors ${values.remindValue === opt.value ? 'text-apple-blue font-medium' : 'text-gray-700'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
        {values.remindValue === 'custom' && (
          <div className="flex items-center gap-2 mt-2">
            <select
              value={values.customRemindNum}
              onChange={(e) => patch({ customRemindNum: parseInt(e.target.value, 10) })}
              className="px-2 py-1 text-xs bg-[#F2F2F7] rounded-[8px] border-none outline-none"
            >
              {Array.from({ length: 50 }, (_, i) => i + 1).map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <select
              value={values.customRemindUnit}
              onChange={(e) => patch({ customRemindUnit: e.target.value })}
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

      <div className="border-t border-apple-divider mt-3 pt-3">
        {variant === 'add' ? (
          <>
            <SectionTitle
              variant={variant}
              label="列表"
              icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" />
                </svg>
              }
            />
            <select
              value={values.selectedListId}
              onChange={(e) => patch({ selectedListId: e.target.value })}
              className="w-full px-3 py-1.5 text-sm bg-[#F2F2F7] rounded-[10px] border-none outline-none text-gray-700"
            >
              <option value="">提醒事项</option>
              {lists.map(list => (
                <option key={list.id} value={list.id}>{list.name}</option>
              ))}
            </select>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500">列表</span>
              <button
                type="button"
                onClick={() => patch({ isFlagged: !values.isFlagged })}
                className={`w-8 h-[18px] rounded-full transition-colors relative ${values.isFlagged ? 'bg-apple-blue' : 'bg-gray-300'}`}
                aria-label="旗标"
              >
                <div className={`absolute top-0.5 w-[14px] h-[14px] bg-white rounded-full shadow-sm transition-transform ${values.isFlagged ? 'translate-x-[16px]' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              {lists.map(list => (
                <button
                  key={list.id}
                  type="button"
                  onClick={() => patch({ selectedListId: values.selectedListId === list.id ? '' : list.id })}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-[10px] text-sm font-medium transition-colors ${
                    values.selectedListId === list.id ? 'bg-blue-50 text-apple-blue' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: list.color }} />
                  {list.name}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {variant === 'add' && (
        <div className="border-t border-apple-divider mt-3 pt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" />
            </svg>
            <span className="text-sm font-semibold text-gray-700">旗标</span>
          </div>
          <button
            type="button"
            onClick={() => patch({ isFlagged: !values.isFlagged })}
            className={`w-10 h-6 rounded-full transition-colors relative ${values.isFlagged ? 'bg-apple-blue' : 'bg-gray-300'}`}
          >
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${values.isFlagged ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
          </button>
        </div>
      )}

      <div className="border-t border-apple-divider mt-3 pt-3">
        <SectionTitle
          variant={variant}
          label="优先级"
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" />
            </svg>
          }
        />
        <div className="flex gap-1">
          {priorityOptions.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => patch({ priority: opt.value as Priority })}
              className={`px-3 py-1 text-xs rounded-[8px] font-medium transition-colors ${
                values.priority === opt.value
                  ? opt.value === 'high' ? 'bg-red-50 text-red-600'
                    : opt.value === 'medium' ? 'bg-orange-50 text-orange-600'
                      : opt.value === 'low' ? 'bg-green-50 text-green-600'
                        : 'bg-[#F2F2F7] text-gray-700'
                  : 'bg-[#F2F2F7] text-gray-500 hover:text-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-apple-divider mt-3 pt-3">
        <SectionTitle
          variant={variant}
          label="标签"
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
          }
        />
        {values.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {values.tags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full"
                style={getTagColorStyle(tag)}
              >
                #{tag}
                <button type="button" onClick={() => removeTag(tag)} className="hover:bg-black/10 rounded-full p-0.5" aria-label={`移除 ${tag}`}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
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
              if (e.key === 'Backspace' && !tagInput && values.tags.length > 0) {
                removeTag(values.tags[values.tags.length - 1]);
              }
            }}
            placeholder="添加标签"
            className="w-full px-3 py-1.5 text-sm bg-[#F2F2F7] rounded-[10px] border-none outline-none text-gray-700 placeholder-apple-gray"
          />
          {showTagSuggestions && tagSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-apple-lg shadow-[0_8px_24px_rgba(0,0,0,0.12)] border border-apple-divider py-1 z-50 max-h-[160px] overflow-y-auto">
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
    </>
  );
}
