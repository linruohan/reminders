import { memo } from 'react';
import { DatePicker } from '../DatePicker';

interface ReminderTimeDropdownProps {
  editTime: string;
  onTimeChange: (time: string) => void;
  onClose: () => void;
}

/**
 * 时间选择下拉组件
 * 提供自定义时间输入
 */
export const ReminderTimeDropdown = memo(function ReminderTimeDropdown({
  editTime,
  onTimeChange,
  onClose
}: ReminderTimeDropdownProps) {
  const handleSelect = (time: string) => {
    onTimeChange(time);
    onClose();
  };

  return (
    <div className="w-max min-w-[160px] bg-white rounded-apple-lg shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-apple-divider py-1">
      <div className="px-3 py-2">
        <DatePicker
          value={editTime}
          onChange={handleSelect}
          mode="time"
          placeholder="选择时间"
          className="w-full"
        />
      </div>
    </div>
  );
});
