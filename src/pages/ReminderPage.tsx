import { Sidebar } from '../components/Sidebar';
import { ReminderList } from '../components/ReminderList';
import type { ReminderResponse, ListResponse, OwnerResponse, SubtaskResponse } from '../types/api';
import type { FilterCounts } from '../types/filters';

interface ReminderPageProps {
  reminders: ReminderResponse[];
  lists: ListResponse[];
  owners: OwnerResponse[];
  activeFilter: string;
  searchQuery: string;
  filterCounts: FilterCounts;
  onFilterChange: (filter: string) => void;
  onSearch: (query: string) => void;
  onToggleCompleted: (id: string) => void;
  onUpdateReminder: (id: string, updates: Partial<ReminderResponse>) => void;
  onDeleteReminder: (id: string) => void;
  onCreateReminder: () => void;
  onAddList: () => void;
  onEditList?: (list: ListResponse) => void;
  onDeleteList?: (id: string) => void;
  onAddOwner?: (name: string) => void;
  onRenameOwner?: (id: string, name: string) => void;
  onDeleteOwner?: (id: string) => void;
  onEditStart: () => void;
  onEditEnd: () => void;
  onCut: (reminder: ReminderResponse) => void;
  onCopy: (reminder: ReminderResponse) => void;
  onPaste: (listId: string | null) => void;
  canPaste: boolean;
  onCreateSubtask: (reminderId: string, title: string) => Promise<SubtaskResponse | null>;
  onUpdateSubtask: (id: string, patch: { title?: string; is_completed?: boolean }) => Promise<SubtaskResponse | null>;
  onDeleteSubtask: (id: string) => Promise<boolean>;
  showToast?: (type: 'success' | 'error' | 'info', message: string) => void;
}

export function ReminderPage({
  reminders,
  lists,
  owners,
  activeFilter,
  searchQuery,
  filterCounts,
  onFilterChange,
  onSearch,
  onToggleCompleted,
  onUpdateReminder,
  onDeleteReminder,
  onCreateReminder,
  onAddList,
  onEditList,
  onDeleteList,
  onAddOwner,
  onRenameOwner,
  onDeleteOwner,
  onEditStart,
  onEditEnd,
  onCut,
  onCopy,
  onPaste,
  canPaste,
  onCreateSubtask,
  onUpdateSubtask,
  onDeleteSubtask,
  showToast,
}: ReminderPageProps) {
  return (
    <div className="flex-1 flex overflow-hidden bg-white">
      <Sidebar
        lists={lists}
        owners={owners}
        activeFilter={activeFilter}
        filterCounts={filterCounts}
        onFilterChange={onFilterChange}
        onSearch={onSearch}
        onAddList={onAddList}
        onEditList={onEditList}
        onDeleteList={onDeleteList}
        onAddOwner={onAddOwner}
        onRenameOwner={onRenameOwner}
        onDeleteOwner={onDeleteOwner}
      />

      <ReminderList
        reminders={reminders}
        lists={lists}
        owners={owners}
        activeFilter={activeFilter}
        searchQuery={searchQuery}
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
        onCreateSubtask={onCreateSubtask}
        onUpdateSubtask={onUpdateSubtask}
        onDeleteSubtask={onDeleteSubtask}
        showToast={showToast}
      />
    </div>
  );
}
