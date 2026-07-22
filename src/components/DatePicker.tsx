import { useState, useRef, memo, useCallback } from 'react';
import { CalendarPicker } from './CalendarPicker';
import { TimePicker } from './TimePicker';
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
 * 格式化时间显示文本
 */
function formatDisplayTime(timeStr: string): string {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  const hour = parseInt(parts[0]);
  const minute = parseInt(parts[1]);
  const mm = minute.toString().padStart(2, '0');
  
  if (hour < 12) {
    return `上午 ${hour === 0 ? 12 : hour}:${mm}`;
  } else if (hour === 12) {
    return `下午 12:${mm}`;
  } else {
    return `下午 ${hour - 12}:${mm}`;
  }
}

/**
 * 统一的日期时间选择器组件
 * date 模式使用自定义 Apple 风格日历弹窗
 * time 模式使用自定义 Apple 风格时间选择器
 * datetime-local 模式结合日期和时间选择
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
  const [showTimePicker, setShowTimePicker] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

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
    if (mode === 'datetime-local') {
      const timePart = value.includes('T') ? value.split('T')[1] : '09:00';
      onChange(`${dateStr}T${timePart}`);
    } else {
      onChange(dateStr);
    }
    setShowCalendar(false);
  }, [onChange, mode, value]);

  const handleTimeChange = useCallback((timeStr: string) => {
    if (mode === 'datetime-local') {
      const datePart = value.includes('T') ? value.split('T')[0] : '';
      onChange(`${datePart}T${timeStr}`);
    } else {
      onChange(timeStr);
    }
    setShowTimePicker(false);
  }, [onChange, mode, value]);

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
            isFocused || showCalendar ? 'ring-2 ring-apple-blue/30 bg-white' : 'hover:bg-[#E5E5EA]'
          } ${className}`}
          onClick={() => setShowCalendar(!showCalendar)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          tabIndex={0}
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
          onClose={() => { setShowCalendar(false); setIsFocused(false); }}
          minWidth={260}
        >
          <div
            className="bg-white rounded-apple-lg shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-apple-divider animate-scale-in overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <CalendarPicker
              value={value}
              onChange={handleCalendarChange}
              onClose={() => { setShowCalendar(false); setIsFocused(false); }}
            />
          </div>
        </DropdownPortal>
      </div>
    );
  }

  // time 模式：自定义时间选择器
  if (mode === 'time') {
    const displayText = value ? formatDisplayTime(value) : (placeholder || getDefaultPlaceholder());

    return (
      <div className="relative" ref={triggerRef}>
        <div
          className={`inline-flex items-center gap-2 px-3 py-2 bg-[#F2F2F7] rounded-[10px] transition-all duration-200 spring-transition cursor-pointer ${
            isFocused || showTimePicker ? 'ring-2 ring-apple-blue/30 bg-white' : 'hover:bg-[#E5E5EA]'
          } ${className}`}
          onClick={() => setShowTimePicker(!showTimePicker)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          tabIndex={0}
        >
          <span className="text-gray-500 flex-shrink-0">
            {icon || timeIcon}
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
          isOpen={showTimePicker}
          onClose={() => { setShowTimePicker(false); setIsFocused(false); }}
          minWidth={200}
        >
          <div
            className="bg-white rounded-apple-lg shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-apple-divider animate-scale-in overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <TimePicker
              value={value}
              onChange={handleTimeChange}
              onClose={() => { setShowTimePicker(false); setIsFocused(false); }}
            />
          </div>
        </DropdownPortal>
      </div>
    );
  }

  // datetime-local 模式：日期触发 + 时间选择
  const datePart = value.includes('T') ? value.split('T')[0] : '';
  const timePart = value.includes('T') ? value.split('T')[1] : '';

  return (
    <div className="relative" ref={triggerRef}>
      <div
        className={`inline-flex items-center gap-2 px-3 py-2 bg-[#F2F2F7] rounded-[10px] transition-all duration-200 spring-transition ${
          isFocused || showCalendar || showTimePicker ? 'ring-2 ring-apple-blue/30 bg-white' : 'hover:bg-[#E5E5EA]'
        } ${className}`}
      >
        {/* 日期部分 - 点击弹出日历 */}
        <button
          type="button"
          onClick={() => { setShowCalendar(true); setShowTimePicker(false); }}
          className="flex items-center gap-1.5 text-[13px] hover:text-gray-900 transition-colors flex-shrink-0"
        >
          <span className="text-gray-500">{icon || defaultIcon}</span>
          <span className={datePart ? 'text-gray-700' : 'text-apple-gray'}>
            {datePart ? formatDisplayDate(datePart) : (placeholder || getDefaultPlaceholder())}
          </span>
        </button>

        {/* 时间部分 - 点击弹出时间选择器 */}
        {datePart && (
          <>
            <span className="text-gray-300">|</span>
            <button
              type="button"
              onClick={() => { setShowTimePicker(true); setShowCalendar(false); }}
              className="flex items-center gap-1 text-[13px] text-gray-700 hover:text-gray-900 transition-colors flex-shrink-0"
            >
              <span className="text-gray-500">{timeIcon}</span>
              <span className={timePart ? 'text-gray-700' : 'text-apple-gray'}>
                {timePart ? formatDisplayTime(timePart) : '选择时间'}
              </span>
            </button>
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

      {/* 日历弹窗 */}
      <DropdownPortal
        triggerRef={triggerRef}
        isOpen={showCalendar}
        onClose={() => { setShowCalendar(false); setIsFocused(false); }}
        minWidth={260}
      >
        <div
          className="bg-white rounded-apple-lg shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-apple-divider animate-scale-in overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <CalendarPicker
            value={datePart}
            onChange={handleCalendarChange}
            onClose={() => { setShowCalendar(false); setIsFocused(false); }}
          />
        </div>
      </DropdownPortal>

      {/* 时间弹窗 */}
      <DropdownPortal
        triggerRef={triggerRef}
        isOpen={showTimePicker}
        onClose={() => { setShowTimePicker(false); setIsFocused(false); }}
        minWidth={200}
      >
        <div
          className="bg-white rounded-apple-lg shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-apple-divider animate-scale-in overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <TimePicker
            value={timePart}
            onChange={handleTimeChange}
            onClose={() => { setShowTimePicker(false); setIsFocused(false); }}
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
