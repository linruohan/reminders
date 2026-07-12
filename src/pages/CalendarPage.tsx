import { CalendarView } from '../components/CalendarView';
import type { ReminderResponse, ListResponse } from '../types/api';

interface CalendarPageProps {
  reminders: ReminderResponse[];
  lists: ListResponse[];
  onUpdateReminder: (id: string, updates: Partial<ReminderResponse>) => void;
  onDeleteReminder: (id: string) => void;
  onCreateReminder: (data: {
    title: string;
    description?: string | null;
    due_date?: string | null;
    due_time?: string | null;
    list_id?: string | null;
    is_all_day?: boolean;
  }) => Promise<ReminderResponse | null>;
}

export function CalendarPage({ reminders, lists, onUpdateReminder, onDeleteReminder, onCreateReminder }: CalendarPageProps) {
  return (
    <div className="flex-1 flex overflow-hidden bg-white">
      <CalendarView
        reminders={reminders}
        lists={lists}
        onUpdateReminder={onUpdateReminder}
        onDeleteReminder={onDeleteReminder}
        onCreateReminder={onCreateReminder}
      />
    </div>
  );
}
