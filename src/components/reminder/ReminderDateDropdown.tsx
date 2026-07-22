import { memo } from 'react';
import { getTodayStr, getTomorrowStr, getWeekendStr, getNextMondayStr } from '@/utils/dateUtils';
import { DatePicker } from '../DatePicker';

interface ReminderDateDropdownProps {
  editDate: string;
  onDateChange: (date: string) => void;
  onClose: () => void;
}

/**
 * 日期选择下拉组件
 * 提供快捷日期选项（今天、明天、本周末、下周一）和自定义日期输入
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
    <div className="w-max min-w-[160px] bg-white rounded-apple-lg shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-apple-divider py-1">
      <button
        onClick={() => handleSelect(getTodayStr())}
        className={`block w-full text-left px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
          editDate === getTodayStr() ? 'bg-apple-blue/10 text-apple-blue' : 'text-gray-700 hover:bg-gray-50'
        }`}
      >
        今天
      </button>
      <button
        onClick={() => handleSelect(getTomorrowStr())}
        className={`block w-full text-left px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
          editDate === getTomorrowStr() ? 'bg-apple-blue/10 text-apple-blue' : 'text-gray-700 hover:bg-gray-50'
        }`}
      >
        明天
      </button>
      <button
        onClick={() => handleSelect(getWeekendStr())}
        className={`block w-full text-left px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
          editDate === getWeekendStr() ? 'bg-apple-blue/10 text-apple-blue' : 'text-gray-700 hover:bg-gray-50'
        }`}
      >
        本周末
      </button>
      <button
        onClick={() => handleSelect(getNextMondayStr())}
        className={`block w-full text-left px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
          editDate === getNextMondayStr() ? 'bg-apple-blue/10 text-apple-blue' : 'text-gray-700 hover:bg-gray-50'
        }`}
      >
        下周一
      </button>
      <div className="border-t border-apple-divider my-1" />
      <div className="px-3 py-2">
        <DatePicker
          value={editDate}
          onChange={handleSelect}
          mode="date"
          placeholder="选择日期"
          className="w-full"
        />
      </div>
    </div>
  );
});
