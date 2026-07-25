import { useCallback, useEffect, useRef, useState } from 'react';
import type { SubtaskResponse } from '@/types/api';

interface ReminderSubtasksProps {
  /** 父任务 ID（创建子任务时写入 reminder_id） */
  reminderId: string;
  /** 可选：父任务标题，用于展示层级关系 */
  parentTitle?: string;
  subtasks: SubtaskResponse[];
  /** view：只读勾选；edit：可改标题 / 新增 / 删除 */
  mode?: 'view' | 'edit';
  /** 紧凑模式：无分区标题与顶部分隔线 */
  compact?: boolean;
  /** 隐藏底部「添加」输入行（由外部加号触发添加时使用） */
  hideAddInput?: boolean;
  /** 递增时聚焦添加输入框并展开编辑区 */
  focusAddToken?: number;
  onCreate: (reminderId: string, title: string) => Promise<SubtaskResponse | null>;
  onUpdate: (id: string, patch: { title?: string; is_completed?: boolean }) => Promise<SubtaskResponse | null>;
  onDelete: (id: string) => Promise<boolean>;
}

export function ReminderSubtasks({
  reminderId,
  parentTitle,
  subtasks: initial,
  mode = 'view',
  compact = false,
  hideAddInput = false,
  focusAddToken,
  onCreate,
  onUpdate,
  onDelete,
}: ReminderSubtasksProps) {
  const [items, setItems] = useState(initial);
  const [draft, setDraft] = useState('');
  const [editingNewId, setEditingNewId] = useState<string | null>(null);
  const draftRef = useRef<HTMLInputElement>(null);
  const newInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setItems(initial);
  }, [initial]);

  useEffect(() => {
    if (focusAddToken == null || focusAddToken <= 0 || mode !== 'edit') return;
    if (hideAddInput) {
      void (async () => {
        const created = await onCreate(reminderId, '新子任务');
        if (created) {
          setItems(prev => (prev.some(s => s.id === created.id) ? prev : [...prev, created]));
          setEditingNewId(created.id);
        }
      })();
      return;
    }
    const t = setTimeout(() => {
      draftRef.current?.focus();
    }, 30);
    return () => clearTimeout(t);
  }, [focusAddToken, hideAddInput, mode, onCreate, reminderId]);

  useEffect(() => {
    if (!editingNewId) return;
    const t = setTimeout(() => {
      newInputRef.current?.focus();
      newInputRef.current?.select();
    }, 30);
    return () => clearTimeout(t);
  }, [editingNewId]);

  const toggle = useCallback(async (item: SubtaskResponse) => {
    const next = !item.is_completed;
    setItems(prev => prev.map(s => (s.id === item.id ? { ...s, is_completed: next } : s)));
    const result = await onUpdate(item.id, { is_completed: next });
    if (!result) {
      setItems(prev => prev.map(s => (s.id === item.id ? { ...s, is_completed: item.is_completed } : s)));
    }
  }, [onUpdate]);

  const rename = useCallback(async (item: SubtaskResponse, title: string) => {
    const trimmed = title.trim();
    if (!trimmed || trimmed === item.title) {
      setItems(prev => prev.map(s => (s.id === item.id ? { ...s, title: item.title } : s)));
      setEditingNewId(null);
      return;
    }
    setItems(prev => prev.map(s => (s.id === item.id ? { ...s, title: trimmed } : s)));
    const result = await onUpdate(item.id, { title: trimmed });
    if (!result) {
      setItems(prev => prev.map(s => (s.id === item.id ? { ...s, title: item.title } : s)));
    }
    setEditingNewId(null);
  }, [onUpdate]);

  const remove = useCallback(async (id: string) => {
    const prev = items;
    setItems(list => list.filter(s => s.id !== id));
    const ok = await onDelete(id);
    if (!ok) setItems(prev);
  }, [items, onDelete]);

  const add = useCallback(async () => {
    const title = draft.trim();
    if (!title) return;
    setDraft('');
    const created = await onCreate(reminderId, title);
    if (created) {
      setItems(prev => [...prev, created]);
    } else {
      setDraft(title);
    }
  }, [draft, onCreate, reminderId]);

  if (mode === 'view' && items.length === 0) return null;

  const done = items.filter(s => s.is_completed).length;
  const showPanel = mode === 'edit' || items.length > 0;

  if (!showPanel) return null;

  return (
    <div
      className={
        compact
          ? ''
          : mode === 'edit'
            ? 'mt-3 pt-3 border-t border-apple-divider'
            : 'mt-2'
      }
      onClick={(e) => e.stopPropagation()}
    >
      {mode === 'edit' && !compact && (
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-semibold text-gray-500">
            子任务{items.length > 0 ? ` · ${done}/${items.length}` : ''}
          </div>
          {parentTitle && (
            <div className="text-[11px] text-apple-gray truncate max-w-[50%]" title={`父任务：${parentTitle}`}>
              父任务：{parentTitle}
            </div>
          )}
        </div>
      )}
      {mode === 'view' && items.length > 0 && (
        <div className="text-[12px] text-apple-gray mb-1">{done}/{items.length} 已完成</div>
      )}

      <ul className={`space-y-1 ${mode === 'view' || mode === 'edit' ? 'pl-3 border-l-2 border-apple-divider/80' : ''}`}>
        {items.map(item => (
          <li key={item.id} className="flex items-center gap-2 group/sub">
            <button
              type="button"
              onClick={() => toggle(item)}
              className={`w-[16px] h-[16px] rounded-[4px] border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                item.is_completed
                  ? 'bg-apple-blue border-apple-blue'
                  : 'border-apple-gray-dark hover:border-apple-blue'
              }`}
              aria-label={item.is_completed ? '标记未完成' : '完成子任务'}
            >
              {item.is_completed && (
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
            {mode === 'edit' ? (
              <>
                <input
                  ref={item.id === editingNewId ? newInputRef : undefined}
                  type="text"
                  defaultValue={item.title}
                  key={`${item.id}-${item.title}`}
                  onBlur={(e) => rename(item, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                  }}
                  className={`flex-1 min-w-0 text-[13px] bg-transparent border-none outline-none ${
                    item.is_completed ? 'text-apple-gray line-through' : 'text-gray-800'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  className="opacity-0 group-hover/sub:opacity-100 text-apple-gray hover:text-red-500 p-0.5 transition-opacity"
                  aria-label="删除子任务"
                  title="删除子任务"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </>
            ) : (
              <span className={`text-[13px] truncate ${item.is_completed ? 'text-apple-gray line-through' : 'text-gray-700'}`}>
                {item.title}
              </span>
            )}
          </li>
        ))}
      </ul>

      {mode === 'edit' && !hideAddInput && (
        <div className="flex items-center gap-2 mt-2 pl-3">
          <input
            ref={draftRef}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add();
              }
            }}
            placeholder="添加子任务"
            className="flex-1 px-2.5 py-1.5 text-[13px] bg-[#F2F2F7] rounded-[8px] border-none outline-none text-gray-700 placeholder-apple-gray"
          />
          <button
            type="button"
            onClick={add}
            disabled={!draft.trim()}
            className="text-[13px] font-medium text-apple-blue disabled:text-apple-gray px-1"
          >
            添加
          </button>
        </div>
      )}
    </div>
  );
}
