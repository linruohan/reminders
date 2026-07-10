import { CalendarView } from '../components/CalendarView';
import type { ReminderResponse, ListResponse } from '../types/api';

interface CalendarPageProps {
  reminders: ReminderResponse[];
  lists: ListResponse[];
}

export function CalendarPage({ reminders, lists }: CalendarPageProps) {
  return (
    <div className="flex-1 flex overflow-hidden bg-white">
      <CalendarView reminders={reminders} lists={lists} />
    </div>
  );
}
