import { useState, useCallback, useRef } from 'react';
import { getTodayStr, getTomorrowStr, getWeekendStr, getNextMondayStr, getDateLabel } from '@/utils/dateUtils';
import { DropdownPortal } from './DropdownPortal';
import { DatePicker } from './DatePicker';

interface DatePickerChipProps {
  value: string | null;
  onChange: (value: string) => void;
  onClear: () => void;
}

export function DatePickerChip({ value, onChange, onClear }: DatePickerChipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  const todayStr = getTodayStr();
  const tomorrowStr = getTomorrowStr();
  const weekendStr = getWeekendStr();
  const nextMondayStr = getNextMondayStr();

  const handleDateSelect = useCallback((dateValue: string) => {
    onChange(dateValue);
    setIsOpen(false);
  }, [onChange]);

  return (
    <div className="relative date-picker-chip" ref={triggerRef}>
      <div
        className={`inline-flex items-center gap-1.5 h-8 pl-2.5 pr-1.5 bg-[#F2F2F7] rounded-[10px] text-[13px] font-medium text-gray-900 hover:bg-[#E5E5EA] transition-colors cursor-pointer ${
          isOpen ? 'ring-2 ring-apple-blue/30 bg-blue-50' : ''
        }`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-700 flex-shrink-0">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <span className={value ? 'text-gray-900' : 'text-apple-gray'}>
          {value ? getDateLabel(value) : '添加日期'}
        </span>
        {value && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="ml-0.5 w-4 h-4 rounded-full flex items-center justify-center text-apple-gray hover:text-gray-700 hover:bg-black/5"
            aria-label="清除日期"
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
        minWidth={200}
      >
        <div
          className="bg-white rounded-[12px] shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-apple-divider animate-scale-in overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-1">
            {[
              { value: todayStr, label: '今天' },
              { value: tomorrowStr, label: '明天' },
              { value: weekendStr, label: '本周末' },
              { value: nextMondayStr, label: '下周一' },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDateSelect(opt.value);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-[8px] text-[13px] font-medium transition-colors ${
                  value === opt.value
                    ? 'bg-apple-blue text-white'
                    : 'text-gray-900 hover:bg-gray-100'
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                {opt.label}
              </button>
            ))}
            <div className="border-t border-apple-divider my-1" />
            <div className="px-3 py-2">
              <DatePicker
                value={value || ''}
                onChange={handleDateSelect}
                mode="date"
                placeholder="选择日期"
                className="w-full"
              />
            </div>
          </div>
        </div>
      </DropdownPortal>
    </div>
  );
}
