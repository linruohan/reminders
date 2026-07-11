import { useState, useRef, useEffect } from 'react';

interface DialogProps {
  isOpen: boolean;
  title: string;
  placeholder?: string;
  defaultValue?: string;
  onClose: () => void;
  onSubmit: (value: string) => void;
}

export function Dialog({
  isOpen,
  title,
  placeholder = '',
  defaultValue = '',
  onClose,
  onSubmit,
}: DialogProps) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen, defaultValue]);

  const handleSubmit = () => {
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

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-[16px] shadow-[0_16px_48px_rgba(0,0,0,0.16)] w-[320px] overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4">
          <div className="text-base font-semibold text-gray-900 mb-3">{title}</div>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full px-4 py-2.5 bg-[#F2F2F7] rounded-[10px] text-sm text-gray-900 placeholder-apple-gray outline-none focus:ring-2 focus:ring-apple-blue/40 focus:bg-white transition-all duration-200 spring-transition"
          />
        </div>
        
        <div className="px-5 py-3 border-t border-apple-divider flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100/80 rounded-[10px] transition-colors spring-transition"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!value.trim()}
            className="px-4 py-1.5 text-sm font-medium text-apple-blue hover:bg-blue-50/80 rounded-[10px] transition-colors spring-transition disabled:text-apple-gray disabled:opacity-50 disabled:hover:bg-transparent"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
}
