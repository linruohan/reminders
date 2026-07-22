import { useRef, useEffect } from 'react';
import type { ReminderResponse, ListResponse } from '@/types/api';
import { getListColor } from './utils';

export function SearchDrawer({
  isOpen,
  query,
  results,
  lists,
  onQueryChange,
  onSelect,
  onClose,
}: {
  isOpen: boolean;
  query: string;
  results: ReminderResponse[];
  lists: ListResponse[];
  onQueryChange: (q: string) => void;
  onSelect: (r: ReminderResponse) => void;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={onClose} />
      )}
      <div className={`fixed top-0 right-0 h-full w-80 bg-white shadow-[-4px_0_24px_rgba(0,0,0,0.12)] z-50 transform transition-transform duration-300 spring-transition ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between p-4 border-b border-apple-divider">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => onQueryChange(e.target.value)}
              placeholder="搜索提醒事项"
              className="w-full pl-9 pr-3 py-2 text-sm bg-gray-100 rounded-[10px] border-none outline-none text-gray-900 placeholder-gray-400"
            />
          </div>
          <button onClick={onClose} className="ml-3 w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto h-[calc(100%-60px)] p-3">
          {query.trim() === '' && (
            <div className="text-sm text-gray-400 text-center pt-8">输入关键词搜索提醒事项</div>
          )}
          {query.trim() !== '' && results.length === 0 && (
            <div className="text-sm text-gray-400 text-center pt-8">未找到匹配的提醒事项</div>
          )}
          {results.map(r => {
            const color = getListColor(lists, r.list_id);
            return (
              <div
                key={r.id}
                onClick={() => onSelect(r)}
                className="flex items-center gap-3 p-3 rounded-apple-sm hover:bg-gray-50 cursor-pointer transition-colors spring-transition"
              >
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium truncate ${r.is_completed ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                    {r.title}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {r.created_date && <span className="text-[11px] text-gray-400">{r.created_date}</span>}
                    {r.created_time && <span className="text-[11px] text-apple-gray">{r.created_time}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
