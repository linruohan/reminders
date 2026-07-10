import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  getDaysInMonth, 
  formatMonthYear, 
  isSameDay, 
  toISODateStr 
} from '@/utils/dateUtils';

interface DatePickerProps {
  onSelect: (date: string) => void;
  onClose: () => void;
  initialDate?: string;
}

const weekDays = ['一', '二', '三', '四', '五', '六', '日'];

/**
 * mac风格日期选择器组件
 */
export function DatePicker({ onSelect, onClose, initialDate }: DatePickerProps) {
  const [currentDate, setCurrentDate] = useState(initialDate ? new Date(initialDate) : new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(initialDate || null);
  const [showYearPicker, setShowYearPicker] = useState(false);
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
  const days = useMemo(() => getDaysInMonth(year, month), [year, month]);

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleDateClick = (day: Date) => {
    const dateStr = toISODateStr(day);
    setSelectedDate(dateStr);
    onSelect(dateStr);
    onClose();
  };

  const goToToday = () => {
    const todayStr = toISODateStr(new Date());
    setSelectedDate(todayStr);
    onSelect(todayStr);
    onClose();
  };

  const selectMonth = (m: number) => {
    setCurrentDate(new Date(year, m, 1));
    setShowYearPicker(false);
  };

  const selectYear = (y: number) => {
    setCurrentDate(new Date(y, month, 1));
    setShowYearPicker(false);
  };

  return (
    <div
      ref={pickerRef}
      className="bg-white rounded-apple-lg shadow-apple-lg border border-apple-divider overflow-hidden min-w-[280px]"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-apple-divider">
        <button
          onClick={prevMonth}
          className="w-7 h-7 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all duration-150 active:scale-95"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>

        <div className="relative">
          <button
            onClick={() => setShowYearPicker(!showYearPicker)}
            className="flex items-center gap-1 px-2 py-1 rounded-apple-sm hover:bg-gray-100/60 transition-colors"
          >
            <span className="text-sm font-semibold text-gray-900">{formatMonthYear(currentDate)}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {showYearPicker && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white rounded-apple-lg shadow-apple-lg border border-apple-divider p-3 min-w-[250px] z-50 animate-slide-down">
              <div className="flex items-center justify-between mb-2">
                <button
                  onClick={() => selectYear(year - 12)}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6"/>
                  </svg>
                </button>
                <span className="text-xs font-semibold text-gray-600">{year - 5} - {year + 6}</span>
                <button
                  onClick={() => selectYear(year + 12)}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-0.5 mb-2">
                {months.map((m, i) => (
                  <button
                    key={m}
                    onClick={() => selectMonth(i)}
                    className={`
                      py-1 text-xs font-medium rounded-apple-sm transition-all
                      ${i === month ? 'bg-apple-blue text-white' : 'text-gray-600 hover:bg-gray-100'}
                    `}
                  >
                    {m}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-4 gap-0.5">
                {Array.from({ length: 12 }, (_, i) => year - 5 + i).map((y) => (
                  <button
                    key={y}
                    onClick={() => selectYear(y)}
                    className={`
                      py-1 text-xs font-medium rounded-apple-sm transition-all
                      ${y === year ? 'bg-apple-blue text-white' : 'text-gray-600 hover:bg-gray-100'}
                    `}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={nextMonth}
          className="w-7 h-7 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all duration-150 active:scale-95"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 px-3 py-2 bg-gray-50/50">
        {weekDays.map((day) => (
          <div key={day} className="text-center text-xs font-semibold text-gray-500 py-1.5">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 px-3 pb-3">
        {days.map((day, index) => {
          const isCurrentMonth = day.getMonth() === month;
          const isToday = isSameDay(day, today);
          const isSelected = selectedDate === toISODateStr(day);

          return (
            <button
              key={index}
              onClick={() => handleDateClick(day)}
              className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold mx-auto
                transition-all duration-150 active:scale-95
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
