/**
 * 提醒事项表单共享选项定义
 * 消除 ReminderItem、AddReminderModal、EditReminderCard 之间的重复定义
 */

export const recurrenceOptions = [
  { value: '', label: '永不' },
  { value: 'daily', label: '每天' },
  { value: 'weekdays', label: '工作日' },
  { value: 'weekly', label: '每周' },
  { value: 'biweekly', label: '每2周' },
  { value: 'monthly', label: '每月' },
  { value: 'yearly', label: '每年' },
  { value: 'custom', label: '自定义' },
];

export const remindOptions = [
  { value: '', label: '无' },
  { value: '1d', label: '1天前' },
  { value: '2d', label: '2天前' },
  { value: '1w', label: '1周前' },
  { value: '2w', label: '2周前' },
  { value: '1M', label: '1个月前' },
  { value: 'custom', label: '自定义' },
];

export const priorityOptions = [
  { value: 'none', label: '无' },
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
];

export const customRecurrenceUnits = [
  { value: 'hour', label: '小时' },
  { value: 'day', label: '天' },
  { value: 'week', label: '周' },
  { value: 'month', label: '月' },
];

export const remindBeforeUnits = [
  { value: 'hour', label: '小时' },
  { value: 'day', label: '天' },
  { value: 'week', label: '周' },
  { value: 'month', label: '月' },
];
