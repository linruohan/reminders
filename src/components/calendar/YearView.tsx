import { useMemo } from 'react';
import type { ReminderResponse } from '@/types/api';
import { MiniMonth } from './MiniMonth';
import { reminderDateSet } from './utils';

interface YearViewProps {
  year: number;
  reminders: ReminderResponse[];
  onMonthClick: (year: number, month: number) => void;
  onSelectDate?: (d: Date) => void;
  onDayDoubleClick?: (d: Date) => void;
}

export function YearView({
  year,
  reminders,
  onMonthClick,
  onSelectDate,
  onDayDoubleClick,
}: YearViewProps) {
  const datesWithReminders = useMemo(() => reminderDateSet(reminders), [reminders]);

  return (
    <div className="flex-1 overflow-y-auto px-6 pb-6">
      <div className="max-w-[960px] mx-auto grid grid-cols-4 gap-x-8 gap-y-2">
        {Array.from({ length: 12 }, (_, i) => (
          <MiniMonth
            key={i}
            year={year}
            month={i}
            datesWithReminders={datesWithReminders}
            onMonthTitleClick={() => onMonthClick(year, i)}
            onSelectDate={onSelectDate}
            onDayDoubleClick={onDayDoubleClick}
          />
        ))}
      </div>
    </div>
  );
}
