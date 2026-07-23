import { memo } from 'react';
import { TimePicker } from '../TimePicker';

interface ReminderTimeDropdownProps {
  editTime: string;
  onTimeChange: (time: string) => void;
  onClose: () => void;
}

/**
 * 时间选择下拉：直接内联 TimePicker，避免再套一层 DatePicker 触发按钮造成重复显示
 */
export const ReminderTimeDropdown = memo(function ReminderTimeDropdown({
  editTime,
  onTimeChange,
  onClose
}: ReminderTimeDropdownProps) {
  return (
    <div className="bg-white rounded-apple-lg shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-apple-divider overflow-hidden">
      <TimePicker
        value={editTime}
        onChange={(time) => {
          onTimeChange(time);
          if (time) onClose();
        }}
        onClose={onClose}
      />
    </div>
  );
});
