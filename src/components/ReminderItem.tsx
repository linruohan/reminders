import { useState, useCallback, useEffect, memo } from 'react';
import type { ReminderResponse, ListResponse, OwnerResponse, Priority, SubtaskHandlers, TagResponse } from '@/types/api';
import { ReminderDetailModal } from './ReminderDetailModal';
import { ContextMenu } from './ContextMenu';
import { ReminderItemViewMode } from './reminder/ReminderItemViewMode';
import { ReminderItemEditMode } from './reminder/ReminderItemEditMode';

interface ReminderItemProps {
  reminder: ReminderResponse;
  lists: ListResponse[];
  owners: OwnerResponse[];
  knownTags: TagResponse[];
  isEditing: boolean;
  highlighted?: boolean;
  onToggleCompleted: (id: string) => void;
  onDelete: (id: string) => void;
  onStartEditing: (id: string) => void;
  onSaveAndStopEditing: (id: string, updates: Partial<ReminderResponse>) => void;
  onCancelEditing: () => void;
  onChange: (updates: Partial<ReminderResponse>) => void;
  onUpdateReminder: (id: string, updates: Partial<ReminderResponse>) => void;
  onCut: (reminder: ReminderResponse) => void;
  onCopy: (reminder: ReminderResponse) => void;
  onPaste: (listId: string | null) => void;
  canPaste: boolean;
  onAddChildReminder?: (parent: ReminderResponse) => void;
  subtaskHandlers: SubtaskHandlers;
  showToast?: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const ReminderItem = memo(function ReminderItem({ 
  reminder, 
  lists, 
  owners,
  knownTags,
  isEditing,
  highlighted = false,
  onToggleCompleted, 
  onDelete, 
  onStartEditing, 
  onSaveAndStopEditing, 
  onCancelEditing,
  onChange,
  onUpdateReminder,
  onCut,
  onCopy,
  onPaste,
  canPaste,
  onAddChildReminder,
  subtaskHandlers,
  showToast,
}: ReminderItemProps) {
  const [showDetail, setShowDetail] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ isOpen: boolean; x: number; y: number }>({ isOpen: false, x: 0, y: 0 });

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ isOpen: true, x: e.clientX, y: e.clientY });
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu({ isOpen: false, x: 0, y: 0 });
  }, []);

  const handleToggleCompletedFromMenu = useCallback(() => {
    onToggleCompleted(reminder.id);
  }, [onToggleCompleted, reminder.id]);

  const handleSetPriority = (priority: Priority) => {
    onUpdateReminder(reminder.id, { priority });
  };

  const handleMoveToList = (listId: string) => {
    onUpdateReminder(reminder.id, { list_id: listId });
  };

  const handleSetDueDate = (date: string) => {
    onUpdateReminder(reminder.id, reminder.end_time
      ? { end_date: date }
      : { end_date: date, end_time: '', is_all_day: true });
  };

  const handleShowDetail = useCallback(() => setShowDetail(true), []);

  useEffect(() => {
    if (highlighted) setShowDetail(true);
  }, [highlighted]);

  if (isEditing) {
    return (
      <div data-reminder-id={reminder.id}>
        <ReminderItemEditMode
          reminder={reminder}
          lists={lists}
          owners={owners}
          knownTags={knownTags}
          onToggleCompleted={onToggleCompleted}
          onSaveAndStopEditing={onSaveAndStopEditing}
          onCancelEditing={onCancelEditing}
          onChange={onChange}
          onAddChildReminder={onAddChildReminder}
          subtaskHandlers={subtaskHandlers}
          showToast={showToast}
        />
      </div>
    );
  }

  return (
    <>
      <div
        data-reminder-id={reminder.id}
        onContextMenu={handleContextMenu}
        className={highlighted ? 'rounded-apple ring-2 ring-apple-blue/40' : undefined}
      >
        <ReminderItemViewMode
          reminder={reminder}
          ownerName={owners.find(o => o.id === reminder.owner_id)?.name}
          onToggleCompleted={onToggleCompleted}
          onStartEditing={onStartEditing}
          onShowDetail={handleShowDetail}
          subtaskHandlers={subtaskHandlers}
        />
      </div>
      
      <ReminderDetailModal
        reminder={reminder}
        lists={lists}
        owners={owners}
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        onDelete={onDelete}
        onToggleCompleted={onToggleCompleted}
        onEdit={onStartEditing}
        onUpdateReminder={onUpdateReminder}
        subtaskHandlers={subtaskHandlers}
      />

      <ContextMenu
        isOpen={contextMenu.isOpen}
        x={contextMenu.x}
        y={contextMenu.y}
        onClose={handleCloseContextMenu}
        onToggleCompleted={handleToggleCompletedFromMenu}
        onShowDetail={handleShowDetail}
        onDelete={() => onDelete(reminder.id)}
        onSetPriority={handleSetPriority}
        onMoveToList={handleMoveToList}
        onSetDueDate={handleSetDueDate}
        onCut={() => onCut(reminder)}
        onCopy={() => onCopy(reminder)}
        onPaste={onPaste}
        canPaste={canPaste}
        lists={lists}
        currentPriority={reminder.priority}
        isCompleted={reminder.is_completed}
      />
    </>
  );
});
