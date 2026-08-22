import { useMemo } from 'react';
import type { ReminderResponse } from '@/types/api';
import { MiniMonth } from './MiniMonth';
import { reminderDateSet } from './utils';

interface YearViewProps {
  year: number;
  reminders: ReminderResponse[];
  onMonthClick: (year: number, month: number) => void;
}

export function YearView({
  year,
  reminders,
  onMonthClick,
}: YearViewProps) {
  const datesWithReminders = useMemo(() => reminderDateSet(reminders), [reminders]);

  return (
    <div className="flex-1 overflow-y-auto px-6 pb-6">
      <div className="max-w-[960px] mx-auto grid grid-cols-4 gap-x-8 gap-y-2">
        {Array.from({ length: 12 }, (_, i) => (
          <button key={i} onClick={() => onMonthClick(year, i)}
            className="text-left hover:opacity-80 transition-opacity spring-transition">
            <MiniMonth year={year} month={i} datesWithReminders={datesWithReminders} />
          </button>
        ))}
      </div>
    </div>
  );
}
