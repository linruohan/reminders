import { Sidebar } from '../components/Sidebar';
import { ReminderList } from '../components/ReminderList';
import type { ReminderResponse, ListResponse, OwnerResponse } from '../types/api';

interface ReminderPageProps {
  reminders: ReminderResponse[];
  lists: ListResponse[];
  owners: OwnerResponse[];
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  onToggleCompleted: (id: string) => void;
  onUpdateReminder: (id: string, updates: Partial<ReminderResponse>) => void;
  onDeleteReminder: (id: string) => void;
  onCreateReminder: () => void;
  onAddList: () => void;
}

export function ReminderPage({
  reminders,
  lists,
  owners,
  activeFilter,
  onFilterChange,
  onToggleCompleted,
  onUpdateReminder,
  onDeleteReminder,
  onCreateReminder,
  onAddList,
}: ReminderPageProps) {
  return (
    <div className="flex-1 flex overflow-hidden bg-white">
      <Sidebar
        lists={lists}
        activeFilter={activeFilter}
        onFilterChange={onFilterChange}
        onAddList={onAddList}
      />
      
      <ReminderList
        reminders={reminders}
        lists={lists}
        owners={owners}
        activeFilter={activeFilter}
        onToggleCompleted={onToggleCompleted}
        onUpdateReminder={onUpdateReminder}
        onDeleteReminder={onDeleteReminder}
        onCreateReminder={onCreateReminder}
      />
    </div>
  );
}
