import { memo, useState } from 'react';
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
  const [customNum, setCustomNum] = useState(1);
  const [customUnit, setCustomUnit] = useState('days');

  const handleCustomConfirm = () => {
    const unitMap: Record<string, string> = { hours: 'h', days: 'd', weeks: 'w', months: 'M', years: 'y' };
    const suffix = unitMap[customUnit] || 'd';
    onRemindChange(`${customNum}${suffix}`);
    onClose();
  };

  return (
    <div className="w-max min-w-[100px] bg-white rounded-apple-lg shadow-lg border border-apple-divider py-1">
      {remindOptions.map(o => (
        <button
          key={o.value}
          onClick={() => {
            onRemindChange(o.value);
            // 自定义需继续配置数值/单位，不关闭下拉
            if (o.value !== 'custom') onClose();
          }}
          className={`block w-full text-left px-4 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
            editRemindValue === o.value || (o.value === 'custom' && editRemindValue === 'custom')
              ? 'bg-apple-blue/10 text-apple-blue'
              : 'text-gray-700 hover:bg-gray-50'
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
              value={customNum}
              onChange={e => setCustomNum(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-12 px-1 py-1 text-xs bg-[#F2F2F7] rounded-[8px] border-none outline-none text-center"
            />
            <select
              value={customUnit}
              onChange={e => setCustomUnit(e.target.value)}
              className="px-1 py-1 text-xs bg-[#F2F2F7] rounded-[8px] border-none outline-none"
            >
              <option value="hours">小时</option>
              <option value="days">天</option>
              <option value="weeks">周</option>
              <option value="months">月</option>
              <option value="years">年</option>
            </select>
            <button
              onClick={handleCustomConfirm}
              className="px-2 py-1 text-xs bg-apple-blue text-white rounded-[8px] hover:bg-[#0066CC] transition-colors"
            >
              确定
            </button>
          </div>
        </>
      )}
    </div>
  );
});
