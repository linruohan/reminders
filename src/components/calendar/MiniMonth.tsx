import { useEffect, useMemo, useRef } from 'react';
import { isSameDay, toISODateStr } from '@/utils/dateUtils';
import { weekDays } from './utils';

/** 年视图中的单月小日历组件 */
export function MiniMonth({
  year,
  month,
  datesWithReminders,
  onMonthTitleClick,
  onSelectDate,
  onDayDoubleClick,
}: {
  year: number;
  month: number;
  datesWithReminders: Set<string>;
  onMonthTitleClick?: () => void;
  onSelectDate?: (d: Date) => void;
  onDayDoubleClick?: (d: Date) => void;
}) {
  const days = useMemo(() => {
    const result: (Date | null)[] = [];
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    for (let i = 0; i < startPad; i++) result.push(null);
    for (let i = 1; i <= lastDay.getDate(); i++) result.push(new Date(year, month, i));
    return result;
  }, [year, month]);

  const clickTimerRef = useRef<number | null>(null);
  useEffect(() => () => {
    if (clickTimerRef.current !== null) window.clearTimeout(clickTimerRef.current);
  }, []);

  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  const handleDayClick = (d: Date) => {
    if (!onSelectDate) return;
    if (clickTimerRef.current !== null) window.clearTimeout(clickTimerRef.current);
    clickTimerRef.current = window.setTimeout(() => {
      clickTimerRef.current = null;
      onSelectDate(new Date(d));
    }, 250);
  };

  const handleDayDoubleClick = (d: Date) => {
    if (clickTimerRef.current !== null) {
      window.clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    onDayDoubleClick?.(new Date(d));
  };

  return (
    <div className="py-2 px-1">
      <button
        type="button"
        onClick={onMonthTitleClick}
        className={`block w-full text-[15px] font-bold mb-1.5 text-center hover:opacity-80 transition-opacity ${isCurrentMonth ? 'text-apple-red' : 'text-gray-800'}`}
      >
        {monthNames[month]}
      </button>
      <div className="grid grid-cols-7 gap-0">
        {weekDays.map(d => (
          <div key={d} className="text-[10px] text-gray-400 text-center h-4 leading-4 font-medium">{d}</div>
        ))}
        {days.map((d, i) => {
          if (!d) return <div key={`e-${i}`} />;
          const hasReminder = datesWithReminders.has(toISODateStr(d));
          const isToday = isSameDay(d, today);
          return (
            <button
              key={i}
              type="button"
              onClick={() => handleDayClick(d)}
              onDoubleClick={() => handleDayDoubleClick(d)}
              className="text-center h-5 leading-5 relative rounded-[6px] hover:bg-white/70 transition-colors"
            >
              <span className={`inline-block text-[12px] leading-5 ${isToday ? 'w-5 h-5 leading-5 rounded-full bg-apple-red text-white font-medium' : 'text-gray-700'}`}>
                {d.getDate()}
              </span>
              {hasReminder && !isToday && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2.5 h-[1.5px] rounded-full bg-apple-red" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
