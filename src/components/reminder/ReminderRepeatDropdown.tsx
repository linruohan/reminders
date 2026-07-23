import { memo } from 'react';
import type { TimeUnit } from '@/types/api';
import { recurrenceOptions } from './formOptions';

interface ReminderRepeatDropdownProps {
  editRecurrenceFreq: string;
  editRecurrenceInterval: number;
  editCustomUnit: TimeUnit;
  onFreqChange: (freq: string) => void;
  onIntervalChange: (interval: number) => void;
  onUnitChange: (unit: TimeUnit) => void;
  onClose: () => void;
}

/**
 * 重复频率选择下拉组件
 * 提供预设重复选项和自定义重复配置
 */
export const ReminderRepeatDropdown = memo(function ReminderRepeatDropdown({
  editRecurrenceFreq,
  editRecurrenceInterval,
  editCustomUnit,
  onFreqChange,
  onIntervalChange,
  onUnitChange,
  onClose
}: ReminderRepeatDropdownProps) {
  return (
    <div className="w-max min-w-[100px] bg-white rounded-apple-lg shadow-lg border border-apple-divider py-1">
      {recurrenceOptions.map(o => (
        <button
          key={o.value}
          onClick={() => {
            onFreqChange(o.value);
            // 自定义需继续配置间隔/单位，不关闭下拉
            if (o.value !== 'custom') onClose();
          }}
          className={`block w-full text-left px-4 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
            editRecurrenceFreq === o.value ? 'bg-apple-blue/10 text-apple-blue' : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          {o.label}
        </button>
      ))}
      {editRecurrenceFreq === 'custom' && (
        <>
          <div className="border-t border-apple-divider my-1" />
          <div className="flex items-center gap-1.5 px-4 py-2">
            <span className="text-xs text-gray-400 whitespace-nowrap">每</span>
            <input
              type="number"
              min={1}
              value={editRecurrenceInterval}
              onChange={e => onIntervalChange(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-12 px-1 py-1 text-xs bg-[#F2F2F7] rounded-[8px] border-none outline-none text-center"
            />
            <select
              value={editCustomUnit === 'minutes' || editCustomUnit === 'hours' ? 'days' : editCustomUnit}
              onChange={e => onUnitChange(e.target.value as TimeUnit)}
              className="px-1 py-1 text-xs bg-[#F2F2F7] rounded-[8px] border-none outline-none"
            >
              <option value="days">天</option>
              <option value="weeks">周</option>
              <option value="months">月</option>
              <option value="years">年</option>
            </select>
            <button
              type="button"
              onClick={onClose}
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
