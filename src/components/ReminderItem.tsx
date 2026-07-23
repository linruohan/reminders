import { useState, useCallback, memo } from 'react';
import type { ReminderResponse, ListResponse, OwnerResponse, Priority } from '@/types/api';
import { ReminderDetailModal } from './ReminderDetailModal';
import { ContextMenu } from './ContextMenu';
import { ReminderItemViewMode } from './reminder/ReminderItemViewMode';
import { ReminderItemEditMode } from './reminder/ReminderItemEditMode';

interface ReminderItemProps {
  reminder: ReminderResponse;
  lists: ListResponse[];
  owners: OwnerResponse[];
  isEditing: boolean;
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
}

export const ReminderItem = memo(function ReminderItem({ 
  reminder, 
  lists, 
  owners,
  isEditing, 
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
}: ReminderItemProps) {
  const [showDetail, setShowDetail] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ isOpen: boolean; x: number; y: number }>({ isOpen: false, x: 0, y: 0 });

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ isOpen: true, x: e.clientX, y: e.clientY });
  };

  const handleCloseContextMenu = () => {
    setContextMenu({ isOpen: false, x: 0, y: 0 });
  };

  const handleSetPriority = (priority: Priority) => {
    onUpdateReminder(reminder.id, { priority });
  };

  const handleMoveToList = (listId: string) => {
    onUpdateReminder(reminder.id, { list_id: listId });
  };

  const handleSetDueDate = (date: string) => {
    onUpdateReminder(reminder.id, { end_date: date });
  };

  const handleShowDetail = useCallback(() => setShowDetail(true), []);

  if (isEditing) {
    return (
      <ReminderItemEditMode
        reminder={reminder}
        lists={lists}
        owners={owners}
        onToggleCompleted={onToggleCompleted}
        onSaveAndStopEditing={onSaveAndStopEditing}
        onCancelEditing={onCancelEditing}
        onChange={onChange}
      />
    );
  }

  return (
    <>
      <div onContextMenu={handleContextMenu}>
        <ReminderItemViewMode
          reminder={reminder}
          onToggleCompleted={onToggleCompleted}
          onStartEditing={onStartEditing}
          onShowDetail={handleShowDetail}
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
      />

      <ContextMenu
        isOpen={contextMenu.isOpen}
        x={contextMenu.x}
        y={contextMenu.y}
        onClose={handleCloseContextMenu}
        onToggleCompleted={() => onToggleCompleted(reminder.id)}
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
