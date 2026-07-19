import { memo } from 'react';
import { remindOptions } from './formOptions';

interface ReminderRemindDropdownProps {
  editRemindValue: string;
  onRemindChange: (value: string) => void;
  onClose: () => void;
}

/**
 * 提醒时间选择下拉组件
 * 提供预设提醒选项和自定义提醒配置
 */
export const ReminderRemindDropdown = memo(function ReminderRemindDropdown({
  editRemindValue,
  onRemindChange,
  onClose
}: ReminderRemindDropdownProps) {
  return (
    <div className="w-max min-w-[100px] bg-white rounded-apple-lg shadow-lg border border-apple-divider py-1">
      {remindOptions.map(o => (
        <button
          key={o.value}
          onClick={() => { onRemindChange(o.value); onClose(); }}
          className={`block w-full text-left px-4 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
            editRemindValue === o.value ? 'bg-apple-blue/10 text-apple-blue' : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          {o.label}
        </button>
      ))}
      {editRemindValue === 'custom' && (
        <>
          <div className="border-t border-apple-divider my-1" />
          <div className="flex items-center gap-1.5 px-4 py-2">
            <span className="text-xs text-gray-400 whitespace-nowrap">提前</span>
            <input
              type="number"
              min={1}
              defaultValue={1}
              className="w-12 px-1 py-1 text-xs bg-[#F2F2F7] rounded-[8px] border-none outline-none text-center"
            />
            <select
              defaultValue="day"
              className="px-1 py-1 text-xs bg-[#F2F2F7] rounded-[8px] border-none outline-none"
            >
              <option value="hour">小时</option>
              <option value="day">天</option>
              <option value="week">周</option>
              <option value="month">月</option>
            </select>
          </div>
        </>
      )}
    </div>
  );
});
