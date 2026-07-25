function formatDateToISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** 按本地时区解析 YYYY-MM-DD，避免 UTC 午夜导致日期偏移 */
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const date = parseLocalDate(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return '今天';
  if (diffDays === 1) return '明天';

  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}月${day}日`;
}

/** 统一为 HH:mm，去掉秒，便于比较与提交 */
export function normalizeTimeStr(timeStr: string | null | undefined): string | null {
  if (!timeStr) return null;
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  const hour = String(parseInt(parts[0], 10)).padStart(2, '0');
  const minute = String(parseInt(parts[1], 10)).padStart(2, '0');
  if (Number.isNaN(Number(hour)) || Number.isNaN(Number(minute))) return timeStr;
  return `${hour}:${minute}`;
}

export function formatTime(timeStr: string | null | undefined): string {
  const normalized = normalizeTimeStr(timeStr);
  if (!normalized) return '';
  const parts = normalized.split(':');
  const hour = parseInt(parts[0], 10);
  const minute = parseInt(parts[1], 10);
  const mm = minute.toString().padStart(2, '0');

  if (hour < 12) {
    return `上午 ${hour === 0 ? 12 : hour}:${mm}`;
  } else if (hour === 12) {
    return `下午 12:${mm}`;
  } else {
    return `下午 ${hour - 12}:${mm}`;
  }
}

export function getDateColor(dateStr: string | null | undefined): string {
  if (!dateStr) return 'text-apple-gray';
  const date = parseLocalDate(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  if (date < today) return 'text-apple-red';
  return 'text-apple-orange';
}

export function getTodayStr(): string {
  return formatDateToISO(new Date());
}

export function getTomorrowStr(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return formatDateToISO(tomorrow);
}

export function getWeekendStr(): string {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilWeekend = dayOfWeek === 0 ? 0 : (7 - dayOfWeek);
  const weekend = new Date(today);
  weekend.setDate(today.getDate() + daysUntilWeekend);
  return formatDateToISO(weekend);
}

export function getNextMondayStr(): string {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilMonday = dayOfWeek === 1 ? 7 : (8 - dayOfWeek);
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + daysUntilMonday);
  return formatDateToISO(nextMonday);
}

export const suggestedTimes = [
  { value: '07:00', label: '7:00', period: '上午' },
  { value: '08:00', label: '8:00', period: '上午' },
  { value: '09:00', label: '9:00', period: '上午' },
  { value: '10:00', label: '10:00', period: '上午' },
  { value: '11:00', label: '11:00', period: '上午' },
  { value: '12:00', label: '12:00', period: '下午' },
  { value: '13:00', label: '13:00', period: '下午' },
  { value: '14:00', label: '14:00', period: '下午' },
  { value: '15:00', label: '15:00', period: '下午' },
  { value: '16:00', label: '16:00', period: '下午' },
  { value: '17:00', label: '17:00', period: '下午' },
  { value: '18:00', label: '18:00', period: '晚上' },
  { value: '19:00', label: '19:00', period: '晚上' },
  { value: '20:00', label: '20:00', period: '晚上' },
  { value: '21:00', label: '21:00', period: '晚上' },
  { value: '22:00', label: '22:00', period: '夜间' },
  { value: '23:00', label: '23:00', period: '夜间' },
  { value: '00:00', label: '00:00', period: '夜间' },
];

export const groupedTimes = {
  上午: suggestedTimes.filter(t => t.period === '上午'),
  下午: suggestedTimes.filter(t => t.period === '下午'),
  晚上: suggestedTimes.filter(t => t.period === '晚上'),
  夜间: suggestedTimes.filter(t => t.period === '夜间'),
};

export function getDateLabel(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  if (dateStr === getTodayStr()) return '今天';
  if (dateStr === getTomorrowStr()) return '明天';
  if (dateStr === getWeekendStr()) return '本周末';
  if (dateStr === getNextMondayStr()) return '下周一';
  return formatDate(dateStr);
}

export function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const startPad = (firstDay.getDay() + 6) % 7;
  for (let i = 0; i < startPad; i++) {
    days.push(new Date(year, month, -i));
  }
  days.reverse();

  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i));
  }

  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push(new Date(year, month + 1, i));
  }

  return days;
}

export function formatMonthYear(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  return `${year}年${month}月`;
}

export function formatMonthYearShort(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  return `${year}/${month.toString().padStart(2, '0')}`;
}

export function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getDate() === date2.getDate() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getFullYear() === date2.getFullYear();
}

export function toISODateStr(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseISODate(dateStr: string): Date {
  const date = parseLocalDate(dateStr);
  date.setHours(0, 0, 0, 0);
  return date;
}