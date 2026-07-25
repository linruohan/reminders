import { memo } from 'react';
import { CalendarPicker } from '../CalendarPicker';

interface ReminderEndRepeatDropdownProps {
  editRecurrenceEndDate: string;
  onEndDateChange: (date: string) => void;
  onClose: () => void;
}

/**
 * 结束重复日期选择：选项 + 内联日历，避免 DatePicker 触发按钮重复显示当前日期
 */
export const ReminderEndRepeatDropdown = memo(function ReminderEndRepeatDropdown({
  editRecurrenceEndDate,
  onEndDateChange,
  onClose
}: ReminderEndRepeatDropdownProps) {
  return (
    <div className="w-max min-w-[260px] bg-white rounded-apple-lg shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-apple-divider overflow-hidden">
      <div className="py-1">
        <button
          type="button"
          onClick={() => { onEndDateChange(''); onClose(); }}
          className={`block w-full text-left px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
            !editRecurrenceEndDate ? 'bg-apple-blue/10 text-apple-blue' : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          永不
        </button>
        <button
          type="button"
          onClick={() => {
            if (!editRecurrenceEndDate) {
              onEndDateChange(new Date().toISOString().split('T')[0]);
            }
          }}
          className={`block w-full text-left px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
            editRecurrenceEndDate ? 'bg-apple-blue/10 text-apple-blue' : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          指定日期
        </button>
      </div>
      {editRecurrenceEndDate && (
        <>
          <div className="border-t border-apple-divider" />
          <CalendarPicker
            value={editRecurrenceEndDate}
            onChange={(date) => {
              onEndDateChange(date);
              onClose();
            }}
            onClose={onClose}
          />
        </>
      )}
    </div>
  );
});
