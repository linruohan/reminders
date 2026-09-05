import { memo, useMemo, useState } from 'react';
import { parseRemindValue, remindOptions } from './formOptions';

interface ReminderRemindDropdownProps {
  editRemindValue: string;
  onRemindChange: (value: string) => void;
  onClose: () => void;
}

const PRESET_VALUES = remindOptions
  .filter(o => o.value && o.value !== 'custom')
  .map(o => o.value);

export const ReminderRemindDropdown = memo(function ReminderRemindDropdown({
  editRemindValue,
  onRemindChange,
  onClose,
}: ReminderRemindDropdownProps) {
  const encodedIsCustom = editRemindValue === 'custom'
    || (!!editRemindValue && !PRESET_VALUES.includes(editRemindValue));

  const parsed = useMemo(() => parseRemindValue(editRemindValue), [editRemindValue]);
  const [showCustom, setShowCustom] = useState(encodedIsCustom);
  const [customNum, setCustomNum] = useState(parsed.remind_before_value ?? 1);
  const [customUnit, setCustomUnit] = useState<string>(parsed.remind_before_unit || 'minutes');

  const handleCustomConfirm = () => {
    const unitMap: Record<string, string> = {
      minutes: 'm',
      hours: 'h',
      days: 'd',
      weeks: 'w',
      months: 'M',
      years: 'y',
    };
    const suffix = unitMap[customUnit] || 'm';
    onRemindChange(`${customNum}${suffix}`);
    onClose();
  };

  return (
    <div className="w-max min-w-[100px] bg-white rounded-apple-lg shadow-lg border border-apple-divider py-1">
      {remindOptions.map(o => (
        <button
          key={o.value}
          type="button"
          onClick={() => {
            if (o.value === 'custom') {
              setShowCustom(true);
              return;
            }
            setShowCustom(false);
            onRemindChange(o.value);
            onClose();
          }}
          className={`block w-full text-left px-4 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
            o.value === 'custom'
              ? (showCustom ? 'bg-apple-blue/10 text-apple-blue' : 'text-gray-700 hover:bg-gray-50')
              : editRemindValue === o.value
                ? 'bg-apple-blue/10 text-apple-blue'
                : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          {o.label}
        </button>
      ))}
      {showCustom && (
        <>
          <div className="border-t border-apple-divider my-1" />
          <div className="flex items-center gap-1.5 px-4 py-2">
            <span className="text-xs text-gray-400 whitespace-nowrap">提前</span>
            <input
              type="number"
              min={1}
              value={customNum}
              onChange={e => setCustomNum(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-12 px-1 py-1 text-xs bg-[#F2F2F7] rounded-[8px] border-none outline-none text-center"
            />
            <select
              value={customUnit}
              onChange={e => setCustomUnit(e.target.value)}
              className="px-1 py-1 text-xs bg-[#F2F2F7] rounded-[8px] border-none outline-none"
            >
              <option value="minutes">分钟</option>
              <option value="hours">小时</option>
              <option value="days">天</option>
              <option value="weeks">周</option>
              <option value="months">月</option>
              <option value="years">年</option>
            </select>
            <button
              type="button"
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
