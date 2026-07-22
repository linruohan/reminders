import { useState, useRef, memo, useCallback } from 'react';
import { CalendarPicker } from './CalendarPicker';
import { DropdownPortal } from './DropdownPortal';

type DatePickerMode = 'date' | 'time' | 'datetime-local';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  mode?: DatePickerMode;
  placeholder?: string;
  className?: string;
  showClear?: boolean;
  icon?: React.ReactNode;
}

/**
 * 格式化日期显示文本
 */
function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${m}月${day}日`;
}

/**
 * 统一的日期选择器组件
 * date 模式使用自定义 Apple 风格日历弹窗
 * time / datetime-local 模式使用原生输入框
 */
export const DatePicker = memo(function DatePicker({
  value,
  onChange,
  mode = 'date',
  placeholder,
  className = '',
  showClear = true,
  icon,
}: DatePickerProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeInputRef = useRef<HTMLInputElement>(null);

  const getDefaultPlaceholder = () => {
    switch (mode) {
      case 'date':
        return '选择日期';
      case 'time':
        return '选择时间';
      case 'datetime-local':
        return '选择日期时间';
      default:
        return '选择日期';
    }
  };

  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  }, [onChange]);

  const handleCalendarChange = useCallback((dateStr: string) => {
    onChange(dateStr);
    setShowCalendar(false);
  }, [onChange]);

  const handleTimeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  const defaultIcon = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  );

  const timeIcon = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  );

  // date 模式：显示日期文本 + 点击弹出日历
  if (mode === 'date') {
    const displayText = value ? formatDisplayDate(value) : (placeholder || getDefaultPlaceholder());

    return (
      <div className="relative" ref={triggerRef}>
        <div
          className={`inline-flex items-center gap-2 px-3 py-2 bg-[#F2F2F7] rounded-[10px] transition-all duration-200 spring-transition cursor-pointer ${
            isFocused ? 'ring-2 ring-apple-blue/30 bg-white' : 'hover:bg-[#E5E5EA]'
          } ${className}`}
          onClick={() => setShowCalendar(!showCalendar)}
        >
          <span className="text-gray-500 flex-shrink-0">
            {icon || defaultIcon}
          </span>
          <span className={`text-[13px] flex-1 min-w-0 ${value ? 'text-gray-700' : 'text-apple-gray'}`}>
            {displayText}
          </span>
          {showClear && value && (
            <button
              onClick={handleClear}
              className="ml-0.5 hover:bg-gray-200 rounded-full p-0.5 transition-colors flex-shrink-0"
              aria-label="清除"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>

        <DropdownPortal
          triggerRef={triggerRef}
          isOpen={showCalendar}
          onClose={() => setShowCalendar(false)}
          minWidth={260}
        >
          <div
            className="bg-white rounded-apple-lg shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-apple-divider animate-scale-in overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <CalendarPicker
              value={value}
              onChange={handleCalendarChange}
              onClose={() => setShowCalendar(false)}
            />
          </div>
        </DropdownPortal>
      </div>
    );
  }

  // time 模式：原生时间输入框
  if (mode === 'time') {
    return (
      <div
        className={`relative inline-flex items-center gap-2 px-3 py-2 bg-[#F2F2F7] rounded-[10px] transition-all duration-200 spring-transition ${
          isFocused ? 'ring-2 ring-apple-blue/30 bg-white' : 'hover:bg-[#E5E5EA]'
        } ${className}`}
      >
        <span className="text-gray-500 flex-shrink-0">
          {icon || timeIcon}
        </span>
        <input
          ref={timeInputRef}
          type="time"
          value={value}
          onChange={handleTimeChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="bg-transparent border-none outline-none text-[13px] text-gray-700 flex-1 min-w-0 cursor-pointer time-input"
          style={{ width: '80px' }}
        />
        {!value && (
          <span className="text-[13px] text-apple-gray pointer-events-none absolute left-9">
            {placeholder || getDefaultPlaceholder()}
          </span>
        )}
        {showClear && value && (
          <button
            onClick={handleClear}
            className="ml-0.5 hover:bg-gray-200 rounded-full p-0.5 transition-colors flex-shrink-0"
            aria-label="清除"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>
    );
  }

  // datetime-local 模式：日期触发 + 时间输入
  return (
    <div className="relative" ref={triggerRef}>
      <div
        className={`inline-flex items-center gap-2 px-3 py-2 bg-[#F2F2F7] rounded-[10px] transition-all duration-200 spring-transition ${
          isFocused ? 'ring-2 ring-apple-blue/30 bg-white' : 'hover:bg-[#E5E5EA]'
        } ${className}`}
      >
        {/* 日期部分 - 点击弹出日历 */}
        <button
          type="button"
          onClick={() => setShowCalendar(!showCalendar)}
          className="flex items-center gap-1.5 text-[13px] text-gray-700 hover:text-gray-900 transition-colors flex-shrink-0"
        >
          <span className="text-gray-500">{icon || defaultIcon}</span>
          <span className={value ? 'text-gray-700' : 'text-apple-gray'}>
            {value ? formatDisplayDate(value.split('T')[0]) : (placeholder || getDefaultPlaceholder())}
          </span>
        </button>

        {/* 时间部分 - 原生输入 */}
        {value && (
          <>
            <span className="text-gray-300">|</span>
            <input
              ref={timeInputRef}
              type="time"
              value={value.includes('T') ? value.split('T')[1] : ''}
              onChange={(e) => {
                const datePart = value.split('T')[0] || '';
                onChange(`${datePart}T${e.target.value}`);
              }}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className="bg-transparent border-none outline-none text-[13px] text-gray-700 cursor-pointer time-input"
              style={{ width: '80px' }}
            />
          </>
        )}

        {showClear && value && (
          <button
            onClick={handleClear}
            className="ml-0.5 hover:bg-gray-200 rounded-full p-0.5 transition-colors flex-shrink-0"
            aria-label="清除"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>

      <DropdownPortal
        triggerRef={triggerRef}
        isOpen={showCalendar}
        onClose={() => setShowCalendar(false)}
        minWidth={260}
      >
        <div
          className="bg-white rounded-apple-lg shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-apple-divider animate-scale-in overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <CalendarPicker
            value={value ? value.split('T')[0] : ''}
            onChange={(dateStr) => {
              const timePart = value.includes('T') ? value.split('T')[1] : '09:00';
              onChange(`${dateStr}T${timePart}`);
              setShowCalendar(false);
            }}
            onClose={() => setShowCalendar(false)}
          />
        </div>
      </DropdownPortal>
    </div>
  );
});

/**
 * 日期范围选择器
 * 用于选择开始和结束日期时间
 */
interface DateRangePickerProps {
  startValue: string;
  endValue: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  mode?: DatePickerMode;
  className?: string;
}

export const DateRangePicker = memo(function DateRangePicker({
  startValue,
  endValue,
  onStartChange,
  onEndChange,
  mode = 'datetime-local',
  className = '',
}: DateRangePickerProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <DatePicker
        value={startValue}
        onChange={onStartChange}
        mode={mode}
        placeholder="开始时间"
      />
      <span className="text-xs text-gray-400">至</span>
      <DatePicker
        value={endValue}
        onChange={onEndChange}
        mode={mode}
        placeholder="结束时间"
      />
    </div>
  );
});
