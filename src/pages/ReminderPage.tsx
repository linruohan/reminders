import { Sidebar } from '../components/Sidebar';
import { ReminderList } from '../components/ReminderList';
import type { ReminderResponse, ListResponse, OwnerResponse } from '../types/api';

interface FilterCounts {
  all: number;
  today: number;
  planned: number;
  overdue: number;
  completed: number;
  urgent: number;
  flagged: number;
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
  onRenameList?: (id: string, name: string) => void;
  onDeleteList?: (id: string) => void;
  onEditStart: () => void;
  onEditEnd: () => void;
  onCut: (reminder: ReminderResponse) => void;
  onCopy: (reminder: ReminderResponse) => void;
  onPaste: (listId: string | null) => void;
  canPaste: boolean;
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
  onRenameList,
  onDeleteList,
  onEditStart,
  onEditEnd,
  onCut,
  onCopy,
  onPaste,
  canPaste,
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
        onRenameList={onRenameList}
        onDeleteList={onDeleteList}
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
        onCut={onCut}
        onCopy={onCopy}
        onPaste={onPaste}
        canPaste={canPaste}
      />
    </div>
  );
}