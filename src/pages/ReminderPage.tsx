import { Sidebar } from '../components/Sidebar';
import { ReminderList } from '../components/ReminderList';
import type { ReminderResponse, ListResponse, OwnerResponse, SubtaskHandlers, TagResponse } from '../types/api';
import type { FilterCounts } from '../types/filters';

interface ReminderPageProps {
  reminders: ReminderResponse[];
  lists: ListResponse[];
  owners: OwnerResponse[];
  knownTags: TagResponse[];
  activeFilter: string;
  searchQuery: string;
  filterCounts: FilterCounts;
  onFilterChange: (filter: string) => void;
  onSearch: (query: string) => void;
  onToggleCompleted: (id: string) => void;
  onUpdateReminder: (id: string, updates: Partial<ReminderResponse>) => void;
  onDeleteReminder: (id: string) => void;
  onCreateReminder: () => void;
  onAddChildReminder?: (parent: {
    id: string;
    title: string;
    listId: string | null;
    endDate: string | null;
    endTime: string | null;
    isAllDay: boolean;
  }) => void;
  onAddList: () => void;
  onEditList?: (list: ListResponse) => void;
  onDeleteList?: (id: string) => void;
  onAddOwner?: (name: string) => void;
  onRenameOwner?: (id: string, name: string) => void;
  onDeleteOwner?: (id: string) => void;
  onRenameTag?: (id: string, name: string) => void;
  onDeleteTag?: (id: string) => void;
  onEditStart: () => void;
  onEditEnd: () => void;
  onCut: (reminder: ReminderResponse) => void;
  onCopy: (reminder: ReminderResponse) => void;
  onPaste: (listId: string | null) => void;
  canPaste: boolean;
  subtaskHandlers: SubtaskHandlers;
  showToast?: (type: 'success' | 'error' | 'info', message: string) => void;
}

export function ReminderPage({
  reminders,
  lists,
  owners,
  knownTags,
  activeFilter,
  searchQuery,
  filterCounts,
  onFilterChange,
  onSearch,
  onToggleCompleted,
  onUpdateReminder,
  onDeleteReminder,
  onCreateReminder,
  onAddChildReminder,
  onAddList,
  onEditList,
  onDeleteList,
  onAddOwner,
  onRenameOwner,
  onDeleteOwner,
  onRenameTag,
  onDeleteTag,
  onEditStart,
  onEditEnd,
  onCut,
  onCopy,
  onPaste,
  canPaste,
  subtaskHandlers,
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
        onRenameTag={onRenameTag}
        onDeleteTag={onDeleteTag}
      />

      <ReminderList
        reminders={reminders}
        lists={lists}
        owners={owners}
        knownTags={knownTags}
        activeFilter={activeFilter}
        searchQuery={searchQuery}
        onToggleCompleted={onToggleCompleted}
        onUpdateReminder={onUpdateReminder}
        onDeleteReminder={onDeleteReminder}
        onCreateReminder={onCreateReminder}
        onAddChildReminder={onAddChildReminder}
        onEditStart={onEditStart}
        onEditEnd={onEditEnd}
        onCut={onCut}
        onCopy={onCopy}
        onPaste={onPaste}
        canPaste={canPaste}
        subtaskHandlers={subtaskHandlers}
        showToast={showToast}
      />
    </div>
  );
}
