import { memo } from 'react';
import { getTodayStr, getTomorrowStr, getWeekendStr, getNextMondayStr } from '@/utils/dateUtils';
import { CalendarPicker } from '../CalendarPicker';

interface ReminderDateDropdownProps {
  editDate: string;
  onDateChange: (date: string) => void;
  onClose: () => void;
}

/**
 * 日期选择下拉：快捷选项 + 内联日历，避免 DatePicker 触发按钮与外层 chip 重复显示当前值
 */
export const ReminderDateDropdown = memo(function ReminderDateDropdown({
  editDate,
  onDateChange,
  onClose
}: ReminderDateDropdownProps) {
  const handleSelect = (date: string) => {
    onDateChange(date);
    onClose();
  };

  return (
    <div className="w-max min-w-[260px] bg-white rounded-apple-lg shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-apple-divider overflow-hidden">
      <div className="py-1">
        <button
          type="button"
          onClick={() => handleSelect(getTodayStr())}
          className={`block w-full text-left px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
            editDate === getTodayStr() ? 'bg-apple-blue/10 text-apple-blue' : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          今天
        </button>
        <button
          type="button"
          onClick={() => handleSelect(getTomorrowStr())}
          className={`block w-full text-left px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
            editDate === getTomorrowStr() ? 'bg-apple-blue/10 text-apple-blue' : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          明天
        </button>
        <button
          type="button"
          onClick={() => handleSelect(getWeekendStr())}
          className={`block w-full text-left px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
            editDate === getWeekendStr() ? 'bg-apple-blue/10 text-apple-blue' : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          本周末
        </button>
        <button
          type="button"
          onClick={() => handleSelect(getNextMondayStr())}
          className={`block w-full text-left px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
            editDate === getNextMondayStr() ? 'bg-apple-blue/10 text-apple-blue' : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          下周一
        </button>
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
