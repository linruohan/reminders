import { useState, useCallback, useRef, useEffect } from 'react';
import { formatTime, suggestedTimes, groupedTimes } from '@/utils/dateUtils';
import { DropdownPortal } from './DropdownPortal';

interface TimePickerChipProps {
  value: string | null;
  onChange: (value: string) => void;
  onClear: () => void;
  onDateRequired: () => void;
}

export function TimePickerChip({ value, onChange, onClear, onDateRequired }: TimePickerChipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setInputValue(value ? formatTime(value) : '');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, value]);

  const handleOpen = useCallback(() => {
    onDateRequired();
    setIsOpen(true);
  }, [onDateRequired]);

  const handleTimeSelect = useCallback((timeValue: string) => {
    onChange(timeValue);
    setIsOpen(false);
  }, [onChange]);

  const handleInputKeyDown = useCallback((e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Escape') {
      setIsOpen(false);
      return;
    }
    if (e.key === 'Enter') {
      const match = suggestedTimes.find(
        (t) => t.label === inputValue.trim() || t.value === inputValue.trim()
      );
      if (match) handleTimeSelect(match.value);
      else setIsOpen(false);
    }
  }, [inputValue, handleTimeSelect]);

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
        {isOpen ? (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleInputKeyDown}
            className="w-[72px] bg-[#B3D7FF] text-gray-900 text-[13px] font-medium outline-none rounded-[4px] px-0.5 selection:bg-[#007AFF] selection:text-white"
          />
        ) : (
          <span className={value ? 'text-gray-900' : 'text-apple-gray'}>
            {value ? formatTime(value) : '添加时间'}
          </span>
        )}
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
          className="bg-white rounded-[12px] shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-apple-divider animate-scale-in overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {Object.entries(groupedTimes).map(([period, times]) => (
            <div key={period}>
              <div className="px-3 pt-2.5 pb-1 text-[11px] font-semibold text-apple-gray">
                {period}
              </div>
              <div className="grid grid-cols-5 gap-1 px-2 pb-1.5">
                {times.map((time) => (
                  <button
                    key={time.value}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTimeSelect(time.value);
                    }}
                    className={`h-8 text-xs font-medium rounded-[6px] transition-all ${
                      value === time.value
                        ? 'bg-apple-blue text-white shadow-sm'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {time.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DropdownPortal>
    </div>
  );
}
