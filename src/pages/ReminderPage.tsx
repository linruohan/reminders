import { Sidebar } from '../components/Sidebar';
import { ReminderList } from '../components/ReminderList';
import type { ReminderResponse, ListResponse, OwnerResponse } from '../types/api';

interface FilterCounts {
  all: number;
  today: number;
  planned: number;
  completed: number;
  lists: Array<{ id: string; count: number }>;
}

interface ReminderPageProps {
  reminders: ReminderResponse[];
  lists: ListResponse[];
  owners: OwnerResponse[];
  activeFilter: string;
  filterCounts: FilterCounts;
  onFilterChange: (filter: string) => void;
  onSearch: (query: string) => void;
  onToggleCompleted: (id: string) => void;
  onUpdateReminder: (id: string, updates: Partial<ReminderResponse>) => void;
  onDeleteReminder: (id: string) => void;
  onCreateReminder: () => void;
  onAddList: () => void;
  onEditStart: () => void;
  onEditEnd: () => void;
}

export function ReminderPage({
  reminders,
  lists,
  owners,
  activeFilter,
  filterCounts,
  onFilterChange,
  onSearch,
  onToggleCompleted,
  onUpdateReminder,
  onDeleteReminder,
  onCreateReminder,
  onAddList,
  onEditStart,
  onEditEnd,
}: ReminderPageProps) {
  return (
    <div className="flex-1 flex overflow-hidden bg-white">
      <Sidebar
        lists={lists}
        activeFilter={activeFilter}
        filterCounts={filterCounts}
        onFilterChange={onFilterChange}
        onSearch={onSearch}
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
        onEditStart={onEditStart}
        onEditEnd={onEditEnd}
      />
    </div>
  );
}