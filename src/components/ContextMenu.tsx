import { useEffect, useRef } from 'react';

interface ContextMenuProps {
  isOpen: boolean;
  x: number;
  y: number;
  onClose: () => void;
  onToggleCompleted: () => void;
  onShowDetail: () => void;
  onDelete: () => void;
  onSetPriority: (priority: string) => void;
  onMoveToList: (listId: string) => void;
  lists: Array<{ id: string; name: string; color: string }>;
  currentPriority: string;
  isCompleted: boolean;
}

export function ContextMenu({
  isOpen,
  x,
  y,
  onClose,
  onToggleCompleted,
  onShowDetail,
  onDelete,
  onSetPriority,
  onMoveToList,
  lists,
  currentPriority,
  isCompleted,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const menuWidth = 220;
  const adjustedX = Math.min(x, window.innerWidth - menuWidth - 8);
  const adjustedY = Math.min(y, window.innerHeight - 380);

  const priorityLabels: Record<string, string> = {
    none: '无优先级',
    high: '高优先级',
    medium: '中优先级',
    low: '低优先级',
  };

  return (
    <div className="fixed inset-0 z-50">
      <div
        ref={menuRef}
        className="absolute bg-white rounded-apple-md shadow-[0_8px_32px_rgba(0,0,0,0.15)] border border-apple-divider overflow-hidden animate-scale-in"
        style={{ left: adjustedX, top: adjustedY, width: menuWidth }}
      >
        <div className="py-1">
          <button
            onClick={() => { onToggleCompleted(); onClose(); }}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-900 hover:bg-gray-100/80 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            {isCompleted ? '标记为未完成' : '标记为完成'}
          </button>

          <button
            onClick={() => { onShowDetail(); onClose(); }}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-900 hover:bg-gray-100/80 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            显示简介
          </button>

          <div className="h-px bg-apple-divider my-1" />

          <button
            onClick={() => { onDelete(); onClose(); }}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-500 hover:bg-red-50/60 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
            删除
          </button>

          <div className="h-px bg-apple-divider my-1" />

          <div className="relative">
            <button className="w-full flex items-center justify-between px-4 py-2 text-sm text-gray-900 hover:bg-gray-100/80 transition-colors">
              <span className="flex items-center gap-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                明天到期
              </span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>

          <div className="relative">
            <button className="w-full flex items-center justify-between px-4 py-2 text-sm text-gray-900 hover:bg-gray-100/80 transition-colors">
              <span className="flex items-center gap-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <line x1="9" y1="3" x2="9" y2="21"/>
                  <line x1="15" y1="3" x2="15" y2="21"/>
                </svg>
                移到列表
              </span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
            <div className="absolute left-full top-0 ml-1 bg-white rounded-apple-md shadow-[0_8px_32px_rgba(0,0,0,0.15)] border border-apple-divider overflow-hidden animate-fade-in w-[160px]">
              {lists.map((list) => (
                <button
                  key={list.id}
                  onClick={() => { onMoveToList(list.id); onClose(); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-900 hover:bg-gray-100/80 transition-colors"
                >
                  <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: list.color }} />
                  {list.name}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <button className="w-full flex items-center justify-between px-4 py-2 text-sm text-gray-900 hover:bg-gray-100/80 transition-colors">
              <span className="flex items-center gap-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="3 11 22 2 13 21 11 13 3 11"/>
                </svg>
                优先级
              </span>
              <span className="text-xs text-apple-gray">{priorityLabels[currentPriority]}</span>
            </button>
            <div className="absolute left-full top-0 ml-1 bg-white rounded-apple-md shadow-[0_8px_32px_rgba(0,0,0,0.15)] border border-apple-divider overflow-hidden animate-fade-in w-[140px]">
              {(['none', 'low', 'medium', 'high'] as const).map((priority) => (
                <button
                  key={priority}
                  onClick={() => { onSetPriority(priority); onClose(); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                    currentPriority === priority
                      ? 'bg-blue-50 text-apple-blue'
                      : 'text-gray-900 hover:bg-gray-100/80'
                  }`}
                >
                  {priority === 'high' && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#FF3B30" stroke="#FF3B30" strokeWidth="2">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                  )}
                  {priority === 'medium' && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#FF9500" stroke="#FF9500" strokeWidth="2">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                  )}
                  {priority === 'low' && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#007AFF" stroke="#007AFF" strokeWidth="2">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                  )}
                  {priorityLabels[priority]}
                </button>
              ))}
            </div>
          </div>

          <div className="h-px bg-apple-divider my-1" />

          <button
            onClick={onClose}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-900 hover:bg-gray-100/80 transition-colors opacity-50 cursor-not-allowed"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            添加位置
          </button>

          <button
            onClick={onClose}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-900 hover:bg-gray-100/80 transition-colors opacity-50 cursor-not-allowed"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
            </svg>
            通知
          </button>
        </div>
      </div>
    </div>
  );
}