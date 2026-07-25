import { memo } from 'react';
import type { ListResponse } from '@/types/api';

interface ReminderListDropdownProps {
  editListId: string;
  lists: ListResponse[];
  onListChange: (listId: string) => void;
  onClose: () => void;
}

/**
 * 列表选择下拉组件
 * 显示所有列表供用户选择
 */
export const ReminderListDropdown = memo(function ReminderListDropdown({
  editListId,
  lists,
  onListChange,
  onClose
}: ReminderListDropdownProps) {
  return (
    <div className="w-max min-w-[100px] bg-white rounded-apple-lg shadow-lg border border-apple-divider py-1">
      <button
        onClick={() => { onListChange(''); onClose(); }}
        className={`block w-full text-left px-4 py-2 text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${
          !editListId ? 'bg-apple-blue/10 text-apple-blue' : 'text-gray-700 hover:bg-gray-50'
        }`}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m9 11 3 3L22 4"/>
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
        </svg>
        提醒事项
      </button>
      {lists.map(list => (
        <button
          key={list.id}
          onClick={() => { onListChange(list.id); onClose(); }}
          className={`block w-full text-left px-4 py-2 text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${
            editListId === list.id ? 'bg-apple-blue/10 text-apple-blue' : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: list.color || '#999' }} />
          {list.name}
        </button>
      ))}
    </div>
  );
});
