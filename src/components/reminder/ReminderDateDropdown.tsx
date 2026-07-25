import { memo, useMemo } from 'react';
import { getTodayStr, getTomorrowStr, getWeekendStr, getNextMondayStr } from '@/utils/dateUtils';
import { CalendarPicker } from '../CalendarPicker';

interface ReminderDateDropdownProps {
  editDate: string;
  onDateChange: (date: string) => void;
  onClose: () => void;
}

/**
 * 日期选择下拉：快捷选项一行按钮 + 内联日历
 */
export const ReminderDateDropdown = memo(function ReminderDateDropdown({
  editDate,
  onDateChange,
  onClose,
}: ReminderDateDropdownProps) {
  const quickOptions = useMemo(
    () => [
      { label: '今天', value: getTodayStr() },
      { label: '明天', value: getTomorrowStr() },
      { label: '本周末', value: getWeekendStr() },
      { label: '下周一', value: getNextMondayStr() },
    ],
    [],
  );

  const handleSelect = (date: string) => {
    onDateChange(date);
    onClose();
  };

  return (
    <div className="w-max min-w-[260px] bg-white rounded-apple-lg shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-apple-divider overflow-hidden">
      <div className="flex items-center gap-1.5 px-2.5 py-2">
        {quickOptions.map(opt => {
          const active = editDate === opt.value;
          return (
            <button
              key={opt.label}
              type="button"
              onClick={() => handleSelect(opt.value)}
              className={`flex-1 px-2 py-1 text-[12px] font-medium rounded-[8px] whitespace-nowrap transition-colors ${
                active
                  ? 'bg-apple-blue text-white'
                  : 'bg-[#F2F2F7] text-gray-700 hover:bg-[#E5E5EA]'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      <div className="border-t border-apple-divider" />
      <CalendarPicker
        value={editDate}
        onChange={handleSelect}
        onClose={onClose}
      />
    </div>
  );
});
