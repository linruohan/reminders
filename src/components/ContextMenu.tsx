import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { getTomorrowStr } from '@/utils/dateUtils';
import type { Priority } from '@/types/api';

interface ContextMenuProps {
  isOpen: boolean;
  x: number;
  y: number;
  onClose: () => void;
  onToggleCompleted: () => void;
  onShowDetail: () => void;
  onDelete: () => void;
  onSetPriority: (priority: Priority) => void;
  onMoveToList: (listId: string) => void;
  onSetDueDate: (date: string) => void;
  onCut: () => void;
  onCopy: () => void;
  onPaste: (listId: string | null) => void;
  canPaste: boolean;
  lists: Array<{ id: string; name: string; color: string }>;
  currentPriority: string;
  isCompleted: boolean;
}

/** 菜单关闭后短暂吞掉 click，避免穿透到下方复选框导致「完成」被触发两次 */
function suppressNextClick() {
  const suppress = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  document.addEventListener('click', suppress, true);
  document.addEventListener('mouseup', suppress, true);
  window.setTimeout(() => {
    document.removeEventListener('click', suppress, true);
    document.removeEventListener('mouseup', suppress, true);
  }, 100);
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
  onSetDueDate,
  onCut,
  onCopy,
  onPaste,
  canPaste,
  lists,
  currentPriority,
  isCompleted,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [expandedSubmenu, setExpandedSubmenu] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setExpandedSubmenu(null);
      return;
    }

    const handlePointerOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    // 延迟绑定，避免打开菜单的那次右键立刻关闭
    const timer = window.setTimeout(() => {
      document.addEventListener('mousedown', handlePointerOutside);
      document.addEventListener('contextmenu', handlePointerOutside);
      document.addEventListener('keydown', handleKeyDown);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('mousedown', handlePointerOutside);
      document.removeEventListener('contextmenu', handlePointerOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const runAction = useCallback((action: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    suppressNextClick();
    action();
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  const menuWidth = 230;
  const menuApproxHeight = 380;
  const adjustedX = Math.min(Math.max(8, x), window.innerWidth - menuWidth - 8);
  const adjustedY = Math.min(Math.max(8, y), window.innerHeight - menuApproxHeight - 8);

  const priorityLabels: Record<string, string> = {
    none: '无优先级',
    high: '高优先级',
    medium: '中优先级',
    low: '低优先级',
  };

  const itemClass =
    'w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-900 hover:bg-gray-100/90 transition-all duration-150 spring-transition';

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-label="提醒操作"
      className="fixed z-[10000] bg-white rounded-[16px] shadow-[0_12px_48px_rgba(0,0,0,0.18)] border border-apple-divider animate-scale-in"
      style={{ left: adjustedX, top: adjustedY, width: menuWidth }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="py-1">
        <button type="button" onClick={runAction(onToggleCompleted)} className={itemClass}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          {isCompleted ? '标记为未完成' : '标记为完成'}
        </button>

        <button type="button" onClick={runAction(onShowDetail)} className={itemClass}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
          显示简介
        </button>

        <div className="h-px bg-apple-divider my-0.5" />

        <button
          type="button"
          onClick={runAction(onDelete)}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50/80 transition-all duration-150 spring-transition"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
          删除
        </button>

        <div className="h-px bg-apple-divider my-0.5" />

        <button type="button" onClick={runAction(onCut)} className={itemClass}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 17v-4a4 4 0 0 0-4-4H5"/>
            <line x1="9" y1="9" x2="20" y2="20"/>
            <path d="M20 20V10a2 2 0 0 0-2-2h-6"/>
          </svg>
          剪切
        </button>

        <button type="button" onClick={runAction(onCopy)} className={itemClass}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          拷贝
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setExpandedSubmenu(expandedSubmenu === 'paste' ? null : 'paste')}
            className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-all duration-150 spring-transition ${
              canPaste ? 'text-gray-900 hover:bg-gray-100/90' : 'text-gray-400 cursor-not-allowed'
            }`}
            disabled={!canPaste}
          >
            <span className="flex items-center gap-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="12" y="12" width="13" height="13" rx="2" ry="2"/>
                <path d="M19 12H9a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2z"/>
              </svg>
              粘贴
            </span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`transition-transform duration-200 ${expandedSubmenu === 'paste' ? 'rotate-90' : ''}`}
            >
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
          {expandedSubmenu === 'paste' && canPaste && (
            <div className="absolute left-full top-0 ml-1 bg-white rounded-[14px] shadow-[0_12px_48px_rgba(0,0,0,0.18)] border border-apple-divider overflow-hidden animate-slide-left w-[170px]">
              <button type="button" onClick={runAction(() => onPaste(null))} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-900 hover:bg-gray-100/90">
                <span className="inline-block w-2 h-2 rounded-full bg-gray-400" />
                原列表
              </button>
              {lists.map((list) => (
                <button
                  key={list.id}
                  type="button"
                  onClick={runAction(() => onPaste(list.id))}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-900 hover:bg-gray-100/90"
                >
                  <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: list.color }} />
                  {list.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="h-px bg-apple-divider my-0.5" />

        <button type="button" onClick={runAction(() => onSetDueDate(getTomorrowStr()))} className={itemClass}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          明天到期
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setExpandedSubmenu(expandedSubmenu === 'move' ? null : 'move')}
            className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-gray-900 hover:bg-gray-100/90"
          >
            <span className="flex items-center gap-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="9" y1="3" x2="9" y2="21"/>
                <line x1="15" y1="3" x2="15" y2="21"/>
              </svg>
              移到列表
            </span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`transition-transform duration-200 ${expandedSubmenu === 'move' ? 'rotate-90' : ''}`}
            >
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
          {expandedSubmenu === 'move' && (
            <div className="absolute left-full top-0 ml-1 bg-white rounded-[14px] shadow-[0_12px_48px_rgba(0,0,0,0.18)] border border-apple-divider overflow-hidden animate-slide-left w-[170px]">
              {lists.map((list) => (
                <button
                  key={list.id}
                  type="button"
                  onClick={runAction(() => onMoveToList(list.id))}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-900 hover:bg-gray-100/90"
                >
                  <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: list.color }} />
                  {list.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setExpandedSubmenu(expandedSubmenu === 'priority' ? null : 'priority')}
            className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-gray-900 hover:bg-gray-100/90"
          >
            <span className="flex items-center gap-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="3 11 22 2 13 21 11 13 3 11"/>
              </svg>
              优先级
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-apple-gray">{priorityLabels[currentPriority]}</span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`transition-transform duration-200 ${expandedSubmenu === 'priority' ? 'rotate-90' : ''}`}
              >
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
          </button>
          {expandedSubmenu === 'priority' && (
            <div className="absolute left-full top-0 ml-1 bg-white rounded-[14px] shadow-[0_12px_48px_rgba(0,0,0,0.18)] border border-apple-divider overflow-hidden animate-slide-left w-[150px]">
              {(['none', 'low', 'medium', 'high'] as const).map((priority) => (
                <button
                  key={priority}
                  type="button"
                  onClick={runAction(() => onSetPriority(priority))}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm ${
                    currentPriority === priority ? 'bg-blue-50 text-apple-blue' : 'text-gray-900 hover:bg-gray-100/90'
                  }`}
                >
                  {priorityLabels[priority]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
