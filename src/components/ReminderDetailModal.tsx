import type { ReminderResponse, ListResponse, OwnerResponse, SubtaskHandlers } from '@/types/api';
import { formatRecurrenceLabel } from '@/components/reminder/formOptions';
import { formatDate, formatTime } from '@/utils/dateUtils';
import { getTagColorStyle } from '@/utils/tagColors';
import { ReminderSubtasks } from './reminder/ReminderSubtasks';
import { useEffect } from 'react';

interface ReminderDetailModalProps {
  reminder: ReminderResponse;
  lists: ListResponse[];
  owners: OwnerResponse[];
  isOpen: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
  onToggleCompleted: (id: string) => void;
  onEdit: (id: string) => void;
  onUpdateReminder?: (id: string, updates: Partial<ReminderResponse>) => void;
  subtaskHandlers?: SubtaskHandlers;
}

const priorityLabels: Record<string, string> = {
  none: '无',
  low: '低',
  medium: '中',
  high: '高',
};

const unitLabels: Record<string, string> = {
  minutes: '分钟',
  hours: '小时',
  days: '天',
  weeks: '周',
  months: '个月',
  years: '年',
};

export function ReminderDetailModal({
  reminder,
  lists,
  owners,
  isOpen,
  onClose,
  onDelete,
  onToggleCompleted,
  onEdit,
  onUpdateReminder,
  subtaskHandlers,
}: ReminderDetailModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const listName = reminder.list_id
    ? lists.find(l => l.id === reminder.list_id)?.name || '提醒事项'
    : '提醒事项';

  const recurrenceLabel = formatRecurrenceLabel(
    reminder.recurrence_frequency,
    reminder.recurrence_interval,
    reminder.custom_recurrence_unit,
  );
  const hasRemind = reminder.remind_before_value != null;
  const hasDue = Boolean(reminder.end_date || reminder.end_time);

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="提醒详情"
        className="bg-white rounded-apple-lg shadow-[0_16px_48px_rgba(0,0,0,0.16)] w-[340px] overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-apple-divider flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#007AFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 11 3 3L22 4"/>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
          <span className="text-sm font-semibold text-gray-900">查看</span>
        </div>

        <div className="p-4 max-h-[400px] overflow-y-auto">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <div className="text-lg text-gray-900 font-medium">{reminder.title}</div>
            </div>
            {reminder.is_flagged && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#FF9500" stroke="#FF9500" strokeWidth="2" className="flex-shrink-0 mt-1">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
              </svg>
            )}
          </div>

          {reminder.description && (
            <div className="text-sm text-apple-gray mt-2">{reminder.description}</div>
          )}

          {reminder.url && (
            <a href={reminder.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 mt-2 text-sm text-apple-blue hover:underline">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
              {reminder.url}
            </a>
          )}

          {hasDue && (
            <div className="flex items-center gap-2 mt-3 text-sm text-apple-orange">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <span>
                截止 {reminder.end_date ? formatDate(reminder.end_date) : ''}
                {reminder.end_time ? ` ${formatTime(reminder.end_time)}` : ''}
              </span>
            </div>
          )}

          {recurrenceLabel && (
            <div className="flex items-center gap-2 mt-2 text-sm text-apple-blue">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
              <span>
                {recurrenceLabel}
                {reminder.recurrence_end_date && ` (至 ${formatDate(reminder.recurrence_end_date)})`}
              </span>
            </div>
          )}

          {hasRemind && (
            <div className="flex items-center gap-2 mt-2 text-sm text-apple-purple">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <span>提前 {reminder.remind_before_value} {unitLabels[reminder.remind_before_unit || ''] || reminder.remind_before_unit}</span>
            </div>
          )}

          {reminder.tags && reminder.tags.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
              </svg>
              {reminder.tags.map(t => (
                <span
                  key={t.id}
                  className="text-xs px-1.5 py-0.5 rounded-[6px] font-medium"
                  style={getTagColorStyle(t.name)}
                >
                  #{t.name}
                </span>
              ))}
            </div>
          )}

          {subtaskHandlers && (
            <ReminderSubtasks
              reminderId={reminder.id}
              subtasks={reminder.subtasks ?? []}
              mode="edit"
              onCreate={subtaskHandlers.create}
              onUpdate={subtaskHandlers.update}
              onDelete={subtaskHandlers.remove}
            />
          )}

          {onUpdateReminder && owners.length > 0 && (
            <div className="flex items-center gap-2 mt-3 text-sm">
              <span className="text-apple-gray flex-shrink-0">负责人</span>
              <select
                value={reminder.owner_id ?? ''}
                onChange={(e) => {
                  const value = e.target.value;
                  onUpdateReminder(reminder.id, { owner_id: value || '' });
                }}
                className="flex-1 text-sm bg-[#F2F2F7] rounded-[8px] px-2 py-1.5 outline-none focus:ring-2 focus:ring-apple-blue/30"
              >
                <option value="">未分配</option>
                {owners.map(o => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="mt-3 pt-3 border-t border-apple-divider">
            <div className="flex gap-4 text-xs text-apple-gray">
              <span>列表: {listName}</span>
              <span>优先级: {priorityLabels[reminder.priority] || reminder.priority}</span>
            </div>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-apple-divider flex justify-end gap-3">
          <button
            onClick={() => onDelete(reminder.id)}
            className="px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-apple-sm transition-colors"
          >
            删除
          </button>
          <button
            onClick={() => onToggleCompleted(reminder.id)}
            className="px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-apple-sm transition-colors"
          >
            {reminder.is_completed ? '标记未完成' : '完成'}
          </button>
          <button
            onClick={() => {
              onClose();
              onEdit(reminder.id);
            }}
            className="px-4 py-1.5 text-sm font-medium text-apple-blue hover:bg-blue-50 rounded-apple-sm transition-colors"
          >
            编辑
          </button>
        </div>
      </div>
    </div>
  );
}
