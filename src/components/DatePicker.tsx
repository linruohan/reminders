import { useState, useEffect, useRef } from 'react';

interface DatePickerProps {
  onSelect: (date: string) => void;
  onClose: () => void;
  initialDate?: string;
}

const weekDays = ['一', '二', '三', '四', '五', '六', '日'];

/**
 * 获取指定月份的所有日期，包括前后月份的补全日期
 */
function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  for (let i = 0; i < firstDay.getDay(); i++) {
    days.push(new Date(year, month, -i));
  }
  days.reverse();

  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i));
  }

  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push(new Date(year, month + 1, i));
  }

  return days;
}

/**
 * 格式化月份年份显示
 */
function formatMonthYear(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  return `${year}年${month}月`;
}

/**
 * mac风格日期选择器组件
 */
export function DatePicker({ onSelect, onClose, initialDate }: DatePickerProps) {
  const [currentDate, setCurrentDate] = useState(initialDate ? new Date(initialDate) : new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(initialDate || null);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const days = getDaysInMonth(year, month);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleDateClick = (day: Date) => {
    const dateStr = day.toISOString().split('T')[0];
    setSelectedDate(dateStr);
    onSelect(dateStr);
    onClose();
  };

  const goToToday = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    setSelectedDate(todayStr);
    onSelect(todayStr);
    onClose();
  };

  return (
    <div
      ref={pickerRef}
      className="bg-white rounded-apple-lg shadow-apple-lg border border-apple-divider overflow-hidden min-w-[280px]"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-apple-divider">
        <button
          onClick={prevMonth}
          className="w-7 h-7 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all duration-150"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <span className="text-sm font-semibold text-gray-900">{formatMonthYear(currentDate)}</span>
        <button
          onClick={nextMonth}
          className="w-7 h-7 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all duration-150"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 px-3 py-2">
        {weekDays.map((day) => (
          <div key={day} className="text-center text-xs font-medium text-gray-500 py-1.5">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 px-3 pb-3">
        {days.map((day, index) => {
          const isCurrentMonth = day.getMonth() === month;
          const isToday = day.getTime() === today.getTime();
          const isSelected = selectedDate === day.toISOString().split('T')[0];

          return (
            <button
              key={index}
              onClick={() => handleDateClick(day)}
              className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold mx-auto
                transition-all duration-150
                ${isToday ? 'bg-apple-red text-white shadow-md shadow-red-500/30' : ''}
                ${isSelected && !isToday ? 'bg-apple-blue text-white' : ''}
                ${!isSelected && !isToday ? (isCurrentMonth ? 'text-gray-900 hover:bg-gray-100' : 'text-gray-400') : ''}
              `}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between px-4 py-2.5 border-t border-apple-divider bg-gray-50/50">
        <button
          onClick={onClose}
          className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
        >
          清除
        </button>
        <button
          onClick={goToToday}
          className="text-sm font-medium text-apple-blue hover:text-blue-700 transition-colors"
        >
          今天
        </button>
      </div>
    </div>
  );
}