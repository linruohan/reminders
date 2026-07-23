import { useState, useRef, useEffect } from 'react';

export const LIST_ICONS = [
  { id: 'list', label: '列表' },
  { id: 'flag', label: '旗标' },
  { id: 'calendar', label: '日历' },
  { id: 'mail', label: '邮件' },
  { id: 'check', label: '完成' },
  { id: 'alert', label: '提醒' },
] as const;

export const LIST_COLORS = [
  '#007AFF',
  '#34C759',
  '#FF9500',
  '#FF3B30',
  '#AF52DE',
  '#5856D6',
  '#FF2D55',
  '#00C7BE',
  '#A2845E',
  '#8E8E93',
] as const;

export interface ListEditorValues {
  name: string;
  icon: string;
  color: string;
}

interface ListEditorDialogProps {
  isOpen: boolean;
  mode?: 'create' | 'edit';
  initial?: Partial<ListEditorValues>;
  onClose: () => void;
  onSubmit: (values: ListEditorValues) => void;
}

/** 新建 / 编辑列表（名称 + 颜色 + 图标） */
export function ListEditorDialog({
  isOpen,
  mode = 'create',
  initial,
  onClose,
  onSubmit,
}: ListEditorDialogProps) {
  const [value, setValue] = useState('');
  const [icon, setIcon] = useState('list');
  const [color, setColor] = useState<string>(LIST_COLORS[0]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setValue(initial?.name ?? '');
      setIcon(initial?.icon ?? 'list');
      setColor(initial?.color ?? LIST_COLORS[0]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, initial?.name, initial?.icon, initial?.color]);

  const handleSubmit = () => {
    if (value.trim()) {
      onSubmit({ name: value.trim(), icon, color });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/25 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="list-editor-title"
        className="bg-white rounded-[20px] shadow-[0_20px_60px_rgba(0,0,0,0.18)] w-[360px] overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4">
          <div id="list-editor-title" className="text-[17px] font-semibold text-gray-900 mb-3">
            {mode === 'edit' ? '编辑列表' : '新建列表'}
          </div>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入列表名称"
            className="w-full px-4 py-3 bg-[#F2F2F7] rounded-[14px] text-[15px] text-gray-900 placeholder-apple-gray outline-none focus:ring-2 focus:ring-apple-blue/30 focus:bg-white focus:shadow-[0_0_0_3px_rgba(0,122,255,0.1)] transition-all duration-250 spring-transition"
          />

          <div className="mt-3">
            <div className="text-xs font-medium text-apple-gray mb-2">颜色</div>
            <div className="flex flex-wrap gap-2">
              {LIST_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`颜色 ${c}`}
                  aria-pressed={color === c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-all ${
                    color === c ? 'ring-2 ring-offset-2 ring-apple-blue scale-110' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="mt-3">
            <div className="text-xs font-medium text-apple-gray mb-2">图标</div>
            <div className="flex flex-wrap gap-2">
              {LIST_ICONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-label={item.label}
                  aria-pressed={icon === item.id}
                  onClick={() => setIcon(item.id)}
                  className={`w-10 h-10 rounded-[12px] flex items-center justify-center transition-all ${
                    icon === item.id
                      ? 'text-white shadow-sm'
                      : 'bg-[#F2F2F7] text-gray-600 hover:bg-gray-200'
                  }`}
                  style={icon === item.id ? { backgroundColor: color } : undefined}
                >
                  <ListIconGlyph name={item.id} />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-3 border-t border-apple-divider flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100/90 rounded-[12px] transition-all duration-200 spring-transition"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!value.trim()}
            className="px-5 py-2 text-sm font-semibold text-apple-blue hover:bg-blue-50/90 rounded-[12px] transition-all duration-200 spring-transition disabled:text-apple-gray disabled:opacity-50 disabled:hover:bg-transparent"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
}

/** @deprecated 使用 ListEditorDialog；保留别名以免旧引用断裂 */
export const CreateListDialog = ListEditorDialog;

function ListIconGlyph({ name }: { name: string }) {
  const paths: Record<string, string> = {
    list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
    flag: '<path d="M7 2v18"/><path d="M7 2c3 0 5 .5 7 1.5s3 2 3 4-1 2-3 3-5 1-7.5-.5-2-3-2-5.5"/><path d="M7 14c3.5 0 5.5.5 6.5 1"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    mail: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    alert: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  };
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: paths[name] || paths.list }} />
  );
}
