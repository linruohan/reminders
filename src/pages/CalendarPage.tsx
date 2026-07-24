import { CalendarView } from '../components/calendar/CalendarView';
import type { ReminderResponse, ListResponse, CreateReminderRequest } from '../types/api';

interface CalendarPageProps {
  reminders: ReminderResponse[];
  lists: ListResponse[];
  onUpdateReminder: (id: string, updates: Partial<ReminderResponse>) => void;
  onDeleteReminder: (id: string) => void;
  onCreateReminder: (data: CreateReminderRequest) => Promise<{ data: ReminderResponse | null; error: string | null }>;
  showToast?: (type: 'success' | 'error' | 'info', message: string) => void;
}

export function CalendarPage({ reminders, lists, onUpdateReminder, onDeleteReminder, onCreateReminder, showToast }: CalendarPageProps) {
  return (
    <div className="flex-1 flex overflow-hidden bg-white">
      <CalendarView
        reminders={reminders}
        lists={lists}
        onUpdateReminder={onUpdateReminder}
        onDeleteReminder={onDeleteReminder}
        onCreateReminder={onCreateReminder}
        showToast={showToast}
      />
    </div>
  );
}
