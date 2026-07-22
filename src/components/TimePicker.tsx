import { useState, useMemo, useCallback, memo } from 'react';
import { groupedTimes } from '@/utils/dateUtils';

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  onClose?: () => void;
}

const TIME_PERIODS: Array<'上午' | '中午' | '下午' | '晚上' | '夜间'> = ['上午', '中午', '下午', '晚上', '夜间'];

/**
 * 格式化时间显示文本
 */
function formatTimeDisplay(timeStr: string): string {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  const hour = parseInt(parts[0]);
  const minute = parseInt(parts[1]);
  const mm = minute.toString().padStart(2, '0');
  
  if (hour < 12) {
    return `${hour === 0 ? 12 : hour}:${mm}`;
  } else if (hour === 12) {
    return `12:${mm}`;
  } else {
    return `${hour - 12}:${mm}`;
  }
}

/**
 * Apple 风格时间选择器
 * 支持按时段分组的时间选项和清除操作
 */
export const TimePicker = memo(function TimePicker({
  value,
  onChange,
  onClose,
}: TimePickerProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'上午' | '中午' | '下午' | '晚上' | '夜间'>('上午');

  const times = useMemo(() => groupedTimes[selectedPeriod] || [], [selectedPeriod]);

  /** 选择时间 */
  const handleSelect = useCallback(
    (timeValue: string) => {
      onChange(timeValue);
    },
    [onChange]
  );

  /** 点击清除 */
  const handleClear = useCallback(() => {
    onChange('');
    onClose?.();
  }, [onChange, onClose]);

  return (
    <div className="w-[220px] select-none">
      {/* 时段标签 */}
      <div className="flex items-center gap-1 px-2 pt-2 pb-1.5 overflow-x-auto scrollbar-hide">
        {TIME_PERIODS.map((period) => (
          <button
            key={period}
            onClick={() => setSelectedPeriod(period)}
            className={`flex-shrink-0 px-3 py-1.5 text-[12px] font-medium rounded-[8px] transition-all spring-transition ${
              selectedPeriod === period
                ? 'bg-apple-blue text-white shadow-[0_2px_6px_rgba(0,122,255,0.3)]'
                : 'bg-[#F2F2F7] text-gray-700 hover:bg-gray-200'
            }`}
          >
            {period}
          </button>
        ))}
      </div>

      {/* 时间网格 */}
      <div className="grid grid-cols-4 gap-[4px] px-2 pb-2">
        {times.map((time: { value: string; label: string; period: string }) => {
          const isSelected = value === time.value;
          return (
            <button
              key={time.value}
              onClick={() => handleSelect(time.value)}
              className={`
                h-9 rounded-[8px] text-[13px] font-medium
                transition-all spring-transition
                ${isSelected
                  ? 'bg-apple-blue text-white shadow-[0_2px_8px_rgba(0,122,255,0.35)]'
                  : 'text-gray-700 hover:bg-gray-100 active:scale-95'
                }
              `}
            >
              {time.label}
            </button>
          );
        })}
      </div>

      {/* 底部操作 */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-apple-divider">
        <button
          onClick={handleClear}
          className="text-[13px] font-medium text-apple-blue hover:text-apple-blue-hover transition-colors spring-transition active:scale-95"
        >
          清除
        </button>
        {value && (
          <span className="text-[12px] text-gray-500">
            当前: {formatTimeDisplay(value)}
          </span>
        )}
      </div>
    </div>
  );
});
