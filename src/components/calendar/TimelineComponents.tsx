import {
  HOUR_HEIGHT,
  TIMELINE_START_HOUR,
  formatHourMinute,
  hourMinuteToTop,
  minuteOfDayToTop,
  getListColor,
} from './utils';
import type { ReminderResponse, ListResponse } from '@/types/api';

export function TimelineSlot({ hour }: { hour: number }) {
  const label = formatHourMinute(hour, 0);
  return (
    <div className="flex border-b border-apple-divider" style={{ height: HOUR_HEIGHT }}>
      <div className="w-14 flex-shrink-0 flex items-center justify-end pr-2">
        <span className="text-xs text-gray-400 font-medium">{label}</span>
      </div>
      <div className="flex-1" />
    </div>
  );
}

export function HoverLine({ minute }: { minute: number }) {
  const h = TIMELINE_START_HOUR + Math.floor(minute / 60);
  const m = minute % 60;
  return (
    <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: minuteOfDayToTop(minute) }}>
      <div className="relative ml-14">
        <div className="border-t border-red-400/70" />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[20px] font-medium text-red-500 bg-white/90 px-1.5 rounded-sm leading-none whitespace-nowrap">
          {formatHourMinute(h, m)}
        </span>
      </div>
    </div>
  );
}

export function AllDaySection({
  reminders,
  lists,
  onReminderClick,
  onDoubleClick,
}: {
  reminders: ReminderResponse[];
  lists: ListResponse[];
  onReminderClick: (r: ReminderResponse) => void;
  onDoubleClick: () => void;
}) {
  return (
    <div
      className="flex border-b border-apple-divider bg-gray-50/40"
      style={{ height: HOUR_HEIGHT }}
      onDoubleClick={onDoubleClick}
    >
      <div className="w-14 flex-shrink-0 flex items-center justify-end pr-2">
        <span className="text-xs text-gray-400 font-medium">全天</span>
      </div>
      <div className="flex-1 flex items-center gap-1 overflow-x-auto px-2">
        {reminders.map(r => {
          const color = getListColor(lists, r.list_id);
          return (
            <button
              key={r.id}
              onClick={() => onReminderClick(r)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-[6px] bg-white/80 hover:bg-white hover:ring-1 hover:ring-apple-blue/45 shadow-sm text-xs transition-all whitespace-nowrap"
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
              <span className={r.is_completed ? 'text-gray-400 line-through' : 'text-gray-700'}>{r.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ReminderBlock({
  reminder,
  listColor,
  onClick,
  onPointerDown,
  dragTop,
  isDragging,
}: {
  reminder: ReminderResponse;
  listColor: string;
  onClick: (reminder: ReminderResponse) => void;
  onPointerDown?: (e: React.PointerEvent, reminder: ReminderResponse) => void;
  dragTop?: number;
  isDragging?: boolean;
}) {
  const dueTime = reminder.end_time;
  const hour = dueTime ? parseInt(dueTime.split(':')[0], 10) : 9;
  const minute = dueTime ? parseInt(dueTime.split(':')[1], 10) : 0;
  const top = dragTop ?? hourMinuteToTop(hour, minute);
  const height = (30 / 60) * HOUR_HEIGHT;

  return (
    <div
      className={`absolute left-16 right-1 z-10 cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-80 z-30' : ''}`}
      style={{ top, height }}
      onClick={(e) => {
        e.stopPropagation();
        if (!isDragging) onClick(reminder);
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        onPointerDown?.(e, reminder);
      }}
    >
      <div
        className="mx-1 h-full rounded-apple-sm border-l-[3px] bg-blue-50/60 shadow-sm hover:shadow-md hover:ring-1 hover:ring-apple-blue/50 hover:bg-blue-50 transition-all duration-200 flex items-center px-2"
        style={{ borderLeftColor: listColor }}
      >
        <div className="flex items-center gap-3 w-full">
          <span className={`flex-1 text-xs font-medium truncate ${reminder.is_completed ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
            {reminder.title}
          </span>
          {dueTime && (
            <span className="text-[10px] font-medium text-gray-400 flex-shrink-0">{dueTime}</span>
          )}
        </div>
      </div>
    </div>
  );
}
