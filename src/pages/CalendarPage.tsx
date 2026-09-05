import { CalendarView } from '../components/calendar/CalendarView';
import type { ReminderResponse, ListResponse, CreateReminderRequest, TagResponse, OwnerResponse, SubtaskHandlers } from '../types/api';

interface CalendarPageProps {
  reminders: ReminderResponse[];
  lists: ListResponse[];
  owners?: OwnerResponse[];
  knownTags?: TagResponse[];
  onUpdateReminder: (id: string, updates: Partial<ReminderResponse>) => void;
  onDeleteReminder: (id: string) => void;
  onCreateReminder: (data: CreateReminderRequest) => Promise<{ data: ReminderResponse | null; error: string | null }>;
  subtaskHandlers?: SubtaskHandlers;
  showToast?: (type: 'success' | 'error' | 'info', message: string) => void;
}

export function CalendarPage({ reminders, lists, owners, knownTags, onUpdateReminder, onDeleteReminder, onCreateReminder, subtaskHandlers, showToast }: CalendarPageProps) {
  return (
    <div className="flex-1 flex overflow-hidden bg-white">
      <CalendarView
        reminders={reminders}
        lists={lists}
        owners={owners}
        knownTags={knownTags}
        onUpdateReminder={onUpdateReminder}
        onDeleteReminder={onDeleteReminder}
        onCreateReminder={onCreateReminder}
        subtaskHandlers={subtaskHandlers}
        showToast={showToast}
      />
    </div>
  );
}
