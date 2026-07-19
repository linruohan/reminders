import { useState, useRef, memo } from 'react';

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
 * 统一的日期选择器组件
 * 支持 date、time、datetime-local 三种模式
 * 提供 Apple 风格的视觉设计和交互体验
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
  const inputRef = useRef<HTMLInputElement>(null);

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

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  const defaultIcon = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  );

  return (
    <div 
      className={`relative inline-flex items-center gap-2 px-3 py-2 bg-[#F2F2F7] rounded-[10px] transition-all duration-200 spring-transition ${
        isFocused ? 'ring-2 ring-apple-blue/30 bg-white' : 'hover:bg-[#E5E5EA]'
      } ${className}`}
    >
      <span className="text-gray-500 flex-shrink-0">
        {icon || defaultIcon}
      </span>
      
      <input
        ref={inputRef}
        type={mode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="bg-transparent border-none outline-none text-[13px] text-gray-700 flex-1 min-w-0 cursor-pointer"
        style={{ width: mode === 'time' ? '80px' : mode === 'datetime-local' ? '150px' : '100px' }}
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
