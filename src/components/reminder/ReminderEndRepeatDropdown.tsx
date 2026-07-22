import { memo } from 'react';
import { DatePicker } from '../DatePicker';

interface ReminderEndRepeatDropdownProps {
  editRecurrenceEndDate: string;
  onEndDateChange: (date: string) => void;
  onClose: () => void;
}

/**
 * 结束重复日期选择下拉组件
 * 提供"永不"和"指定日期"选项
 */
export const ReminderEndRepeatDropdown = memo(function ReminderEndRepeatDropdown({
  editRecurrenceEndDate,
  onEndDateChange,
  onClose
}: ReminderEndRepeatDropdownProps) {
  return (
    <div className="w-max min-w-[140px] bg-white rounded-apple-lg shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-apple-divider py-1">
      <button
        onClick={() => { onEndDateChange(''); onClose(); }}
        className={`block w-full text-left px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
          !editRecurrenceEndDate ? 'bg-apple-blue/10 text-apple-blue' : 'text-gray-700 hover:bg-gray-50'
        }`}
      >
        永不
      </button>
      <button
        onClick={() => { if (!editRecurrenceEndDate) onEndDateChange(new Date().toISOString().split('T')[0]); }}
        className={`block w-full text-left px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
          editRecurrenceEndDate ? 'bg-apple-blue/10 text-apple-blue' : 'text-gray-700 hover:bg-gray-50'
        }`}
      >
        指定日期
      </button>
      {editRecurrenceEndDate && (
        <>
          <div className="border-t border-apple-divider my-1" />
          <div className="px-3 py-2">
            <DatePicker
              value={editRecurrenceEndDate}
              onChange={onEndDateChange}
              mode="date"
              placeholder="选择日期"
              className="w-full"
            />
          </div>
        </>
      )}
    </div>
  );
});
