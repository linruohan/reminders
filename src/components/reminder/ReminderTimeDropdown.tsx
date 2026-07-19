import { memo } from 'react';
import { groupedTimes } from '@/utils/dateUtils';
import { DatePicker } from '../DatePicker';

interface ReminderTimeDropdownProps {
  editTime: string;
  onTimeChange: (time: string) => void;
  onClose: () => void;
}

/**
 * 时间选择下拉组件
 * 提供按时段分组的时间选项和自定义时间输入
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
    <div className="w-max min-w-[120px] bg-white rounded-apple-lg shadow-lg border border-apple-divider py-1 max-h-56 overflow-y-auto">
      {(['上午', '中午', '下午', '晚上', '夜间'] as const).flatMap(period =>
        groupedTimes[period]?.map(t => (
          <button
            key={t.value}
            onClick={() => handleSelect(t.value)}
            className={`block w-full text-left px-4 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
              editTime === t.value ? 'bg-apple-blue/10 text-apple-blue' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            {t.period === '上午' ? '早上' : t.period === '中午' ? '中午' : t.period === '下午' ? '下午' : t.period === '晚上' ? '晚上' : '夜间'} {t.label}
          </button>
        ))
      )}
      <div className="border-t border-apple-divider my-1" />
      <div className="flex items-center gap-2 px-4 py-2">
        <span className="text-xs text-gray-400 whitespace-nowrap">指定时间</span>
        <DatePicker
          value={editTime}
          onChange={handleSelect}
          mode="time"
          placeholder="选择时间"
          className="w-[110px]"
        />
      </div>
      {editTime && (
        <button
          onClick={() => handleSelect('')}
          className="block w-full text-left px-4 py-2 text-xs text-red-500 whitespace-nowrap hover:bg-red-50"
        >
          移除时间
        </button>
      )}
    </div>
  );
});
