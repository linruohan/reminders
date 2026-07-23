import { useState, useRef, useEffect } from 'react';

interface DialogProps {
  isOpen: boolean;
  title: string;
  /** input 模式：输入框占位；confirm 模式忽略 */
  placeholder?: string;
  defaultValue?: string;
  /** confirm 模式说明文案 */
  message?: string;
  mode?: 'input' | 'confirm';
  confirmLabel?: string;
  /** 危险操作（删除）用红色强调 */
  danger?: boolean;
  /** confirm 模式可不校验输入 */
  onClose: () => void;
  onSubmit: (value: string) => void;
}

export function Dialog({
  isOpen,
  title,
  placeholder = '',
  defaultValue = '',
  message,
  mode = 'input',
  confirmLabel = '确定',
  danger = false,
  onClose,
  onSubmit,
}: DialogProps) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue);
      if (mode === 'input') {
        setTimeout(() => {
          inputRef.current?.focus();
          inputRef.current?.select();
        }, 50);
      }
    }
  }, [isOpen, defaultValue, mode]);

  const handleSubmit = () => {
    if (mode === 'confirm') {
      onSubmit('');
      return;
    }
    if (value.trim()) {
      onSubmit(value.trim());
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

  const canSubmit = mode === 'confirm' || Boolean(value.trim());

  return (
    <div
      className="fixed inset-0 bg-black/25 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className="bg-white rounded-[20px] shadow-[0_20px_60px_rgba(0,0,0,0.18)] w-[340px] overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="px-6 py-4">
          <div id="dialog-title" className="text-[17px] font-semibold text-gray-900 mb-3">{title}</div>
          {mode === 'confirm' ? (
            message ? (
              <p className="text-[15px] text-gray-600 leading-relaxed">{message}</p>
            ) : null
          ) : (
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="w-full px-4 py-3 bg-[#F2F2F7] rounded-[14px] text-[15px] text-gray-900 placeholder-apple-gray outline-none focus:ring-2 focus:ring-apple-blue/30 focus:bg-white focus:shadow-[0_0_0_3px_rgba(0,122,255,0.1)] transition-all duration-250 spring-transition"
            />
          )}
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
            disabled={!canSubmit}
            className={`px-5 py-2 text-sm font-semibold rounded-[12px] transition-all duration-200 spring-transition disabled:opacity-50 disabled:hover:bg-transparent ${
              danger
                ? 'text-red-500 hover:bg-red-50/90 disabled:text-apple-gray'
                : 'text-apple-blue hover:bg-blue-50/90 disabled:text-apple-gray'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
