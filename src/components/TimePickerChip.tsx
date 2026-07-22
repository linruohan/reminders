import { useState, useCallback, useRef } from 'react';
import { formatTime } from '@/utils/dateUtils';
import { DropdownPortal } from './DropdownPortal';
import { TimePicker } from './TimePicker';

interface TimePickerChipProps {
  value: string | null;
  onChange: (value: string) => void;
  onClear: () => void;
  onDateRequired: () => void;
}

export function TimePickerChip({ value, onChange, onClear, onDateRequired }: TimePickerChipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  const handleOpen = useCallback(() => {
    onDateRequired();
    setIsOpen(true);
  }, [onDateRequired]);

  const handleTimeSelect = useCallback((timeValue: string) => {
    onChange(timeValue);
    setIsOpen(false);
  }, [onChange]);

  return (
    <div className="relative time-picker-chip" ref={triggerRef}>
      <div
        className={`inline-flex items-center gap-1.5 h-8 pl-2.5 pr-1.5 bg-[#F2F2F7] rounded-[10px] text-[13px] font-medium text-gray-900 hover:bg-[#E5E5EA] transition-colors cursor-pointer ${
          isOpen ? 'ring-2 ring-apple-blue/30 bg-blue-50' : ''
        }`}
        onClick={handleOpen}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-700 flex-shrink-0">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        <span className={value ? 'text-gray-900' : 'text-apple-gray'}>
          {value ? formatTime(value) : '添加时间'}
        </span>
        {(value || isOpen) && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="ml-0.5 w-4 h-4 rounded-full flex items-center justify-center text-apple-gray hover:text-gray-700 hover:bg-black/5"
            aria-label="清除时间"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>

      <DropdownPortal
        triggerRef={triggerRef}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        minWidth={220}
      >
        <div
          className="bg-white rounded-apple-lg shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-apple-divider animate-scale-in overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <TimePicker
            value={value || ''}
            onChange={handleTimeSelect}
            onClose={() => setIsOpen(false)}
          />
        </div>
      </DropdownPortal>
    </div>
  );
}
