import { useState, useMemo, useCallback, memo } from 'react';
import { getTodayStr, parseLocalDate, toISODateStr, getDaysInMonth } from '@/utils/dateUtils';

interface CalendarPickerProps {
  value: string;
  onChange: (value: string) => void;
  onClose?: () => void;
}

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];
const MONTH_NAMES = [
  '一月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '十一月', '十二月',
];

/**
 * 解析日期字符串为 Date 对象
 */
function parseDate(str: string): Date | null {
  if (!str) return null;
  const d = parseLocalDate(str);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Apple 风格日历选择器
 * 支持月份切换、日期选择、今天/清除快捷操作
 */
export const CalendarPicker = memo(function CalendarPicker({
  value,
  onChange,
  onClose,
}: CalendarPickerProps) {
  const selectedDate = useMemo(() => parseDate(value), [value]);
  const todayStr = getTodayStr();

  const [viewYear, setViewYear] = useState(
    selectedDate ? selectedDate.getFullYear() : parseLocalDate(todayStr).getFullYear()
  );
  const [viewMonth, setViewMonth] = useState(
    selectedDate ? selectedDate.getMonth() : parseLocalDate(todayStr).getMonth()
  );
  const selectedStr = value;

  /** 切换到上一个月 */
  const goToPrevMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }, []);

  /** 切换到下一个月 */
  const goToNextMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }, []);

  /** 选择日期（含上/下月格子，避免把日期算进当前月） */
  const handleSelect = useCallback(
    (dateStr: string) => {
      const d = parseLocalDate(dateStr);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
      onChange(dateStr);
    },
    [onChange]
  );

  /** 点击今天 */
  const handleToday = useCallback(() => {
    const d = new Date();
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    onChange(toISODateStr(d));
  }, [onChange]);

  /** 点击清除 */
  const handleClear = useCallback(() => {
    onChange('');
    onClose?.();
  }, [onChange, onClose]);

  /** 构建日历网格 */
  const calendarDays = useMemo(() => {
    return getDaysInMonth(viewYear, viewMonth).map((d) => {
      const y = d.getFullYear();
      const m = d.getMonth();
      const month: 'prev' | 'current' | 'next' =
        y < viewYear || (y === viewYear && m < viewMonth)
          ? 'prev'
          : y > viewYear || (y === viewYear && m > viewMonth)
            ? 'next'
            : 'current';
      return { day: d.getDate(), month, dateStr: toISODateStr(d) };
    });
  }, [viewYear, viewMonth]);

  return (
    <div className="w-[260px] select-none">
      {/* 月份导航 */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <button
          onClick={goToPrevMonth}
          className="w-7 h-7 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors spring-transition active:scale-90"
          aria-label="上个月"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <span className="text-[13px] font-semibold text-gray-900">
          {viewYear}年{MONTH_NAMES[viewMonth]}
        </span>

        <button
          onClick={goToNextMonth}
          className="w-7 h-7 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors spring-transition active:scale-90"
          aria-label="下个月"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* 星期标题 */}
      <div className="grid grid-cols-7 px-2 mb-1">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="text-center text-[11px] font-medium text-apple-gray py-1"
          >
            {label}
          </div>
        ))}
      </div>

      {/* 日期网格 */}
      <div className="grid grid-cols-7 px-2 gap-[2px]">
        {calendarDays.map((item, idx) => {
          const isToday = item.dateStr === todayStr;
          const isSelected = item.dateStr === selectedStr;
          const isCurrentMonth = item.month === 'current';

          return (
            <button
              key={idx}
              onClick={() => handleSelect(item.dateStr)}
              className={`
                relative h-8 w-full rounded-full text-[13px] font-medium
                transition-all spring-transition
                ${!isCurrentMonth ? 'text-apple-gray/50' : 'text-gray-900'}
                ${isSelected
                  ? 'bg-apple-blue text-white font-semibold shadow-[0_2px_8px_rgba(0,122,255,0.35)]'
                  : isToday
                    ? 'bg-apple-blue/10 text-apple-blue font-semibold'
                    : 'hover:bg-gray-100 active:scale-90'
                }
              `}
            >
              {item.day}
            </button>
          );
        })}
      </div>

      {/* 底部操作 */}
      <div className="flex items-center justify-between px-3 py-2.5 mt-1 border-t border-apple-divider">
        <button
          onClick={handleClear}
          className="text-[13px] font-medium text-apple-blue hover:text-apple-blue-hover transition-colors spring-transition active:scale-95"
        >
          清除
        </button>
        <button
          onClick={handleToday}
          className="text-[13px] font-medium text-apple-blue hover:text-apple-blue-hover transition-colors spring-transition active:scale-95"
        >
          今天
        </button>
      </div>
    </div>
  );
});
