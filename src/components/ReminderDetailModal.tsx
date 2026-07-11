import type { ReminderResponse, ListResponse, OwnerResponse } from '@/types/api';
import { formatDate, formatTime } from '@/utils/dateUtils';

interface ReminderDetailModalProps {
  reminder: ReminderResponse;
  lists: ListResponse[];
  owners: OwnerResponse[];
  isOpen: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
  onToggleCompleted: (id: string) => void;
  onEdit: (id: string) => void;
}

export function ReminderDetailModal({
  reminder,
  lists,
  owners,
  isOpen,
  onClose,
  onDelete,
  onToggleCompleted,
  onEdit,
}: ReminderDetailModalProps) {
  if (!isOpen) return null;

  const listName = reminder.list_id
    ? lists.find(l => l.id === reminder.list_id)?.name || '提醒事项'
    : '提醒事项';

  const ownerName = reminder.owner_id
    ? owners.find(o => o.id === reminder.owner_id)?.name
    : null;

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-apple-lg shadow-[0_16px_48px_rgba(0,0,0,0.16)] w-[320px] overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-apple-divider flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#007AFF" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
          <span className="text-sm font-semibold text-gray-900">查看</span>
        </div>
        
        <div className="p-4 max-h-[400px] overflow-y-auto">
          <div className="text-lg text-gray-900 font-medium mb-2">{reminder.title}</div>
          {reminder.description && (
            <div className="text-sm text-apple-gray mt-2">{reminder.description}</div>
          )}
          
          {reminder.due_date || reminder.due_time ? (
            <div className="flex items-center gap-2 mt-4 text-sm text-apple-orange">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              <span>
                {formatDate(reminder.due_date)} {formatTime(reminder.due_time)}
              </span>
            </div>
          ) : null}
          
          {ownerName && (
            <div className="flex items-center gap-2 mt-3 text-sm text-apple-purple">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 16v-4"/>
                <path d="M12 8h.01"/>
              </svg>
              <span>负责人: {ownerName}</span>
            </div>
          )}
          
          <div className="mt-4 pt-4 border-t border-apple-divider">
            <div className="text-xs text-apple-gray">所属分类: {listName}</div>
            <div className="text-xs text-apple-gray mt-1">优先级: {reminder.priority}</div>
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