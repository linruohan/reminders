import { memo } from 'react';
import type { TagResponse } from '@/types/api';

interface ReminderTagsDropdownProps {
  editTags: string[];
  tagInput: string;
  tagSuggestions: TagResponse[];
  showTagSuggestions: boolean;
  onTagInputChange: (value: string) => void;
  onTagAdd: (name: string) => void;
  onTagRemove: (name: string) => void;
  onTagInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

/**
 * 标签选择下拉组件
 * 显示已选标签、提供搜索和添加新标签功能
 */
export const ReminderTagsDropdown = memo(function ReminderTagsDropdown({
  editTags,
  tagInput,
  tagSuggestions,
  showTagSuggestions,
  onTagInputChange,
  onTagAdd,
  onTagRemove,
  onTagInputKeyDown
}: ReminderTagsDropdownProps) {
  return (
    <div className="w-max min-w-[150px] bg-white rounded-apple-lg shadow-lg border border-apple-divider p-2">
      <div className="flex flex-wrap gap-1 mb-2">
        {editTags.map(tag => (
          <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-apple-blue text-xs rounded-[6px]">
            #{tag}
            <button
              onClick={() => onTagRemove(tag)}
              className="hover:bg-blue-100 rounded-full p-0.5"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </span>
        ))}
      </div>
      <div className="relative">
        <input
          type="text"
          value={tagInput}
          onChange={e => onTagInputChange(e.target.value)}
          onKeyDown={onTagInputKeyDown}
          placeholder="搜索或添加标签"
          className="w-full px-2.5 py-1.5 text-xs bg-[#F2F2F7] rounded-[8px] border-none outline-none text-gray-500 placeholder-apple-gray"
        />
        {showTagSuggestions && (
          <div className="absolute top-full left-0 mt-1 bg-white rounded-apple-lg shadow-lg border border-apple-divider py-1 z-50 w-full">
            {tagSuggestions.map(t => (
              <button
                key={t.id}
                onClick={() => onTagAdd(t.name)}
                className="block w-full text-left px-2.5 py-1 text-xs text-gray-700 whitespace-nowrap hover:bg-gray-50"
              >
                #{t.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
