import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { TitleBar } from './components/TitleBar';
import { ReminderPage } from './pages/ReminderPage';
import { CalendarPage } from './pages/CalendarPage';
import { AddReminderModal } from './components/AddReminderModal';
import { ListEditorDialog, type ListEditorValues } from './components/CreateListDialog';
import { Dialog } from './components/Dialog';
import { ToastContainer, type ToastMessage, type ToastType } from './components/Toast';
import { useReminderData } from './hooks/useReminderData';
import type { CreateReminderRequest, ListResponse } from './types/api';

function AuroraBackground() {
  return (
    <div className="aurora-bg">
      <div className="aurora-orb aurora-orb-1" />
      <div className="aurora-orb aurora-orb-2" />
      <div className="aurora-orb aurora-orb-3" />
    </div>
  );
}

export function App() {
  const [currentView, setCurrentView] = useState<'reminder' | 'calendar'>('reminder');
  const [showAddModal, setShowAddModal] = useState(false);
  const [listEditor, setListEditor] = useState<
    { mode: 'create' } | { mode: 'edit'; list: ListResponse } | null
  >(null);
  const [pendingDeleteReminderId, setPendingDeleteReminderId] = useState<string | null>(null);
  const [toastMessages, setToastMessages] = useState<ToastMessage[]>([]);

  const showToast = useCallback((type: ToastType, message: string) => {
    const id = crypto.randomUUID();
    setToastMessages(prev => [...prev, { id, type, message }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToastMessages(prev => prev.filter(msg => msg.id !== id));
  }, []);

  const {
    reminders,
    allReminders,
    lists,
    owners,
    activeFilter,
    searchQuery,
    clipboard,
    isInitialLoading,
    isCalendarLoading,
    isEditing,
    setIsEditing,
    filterCounts,
    handleFilterChange,
    handleSearch,
    handleToggleCompleted,
    handleUpdateReminder,
    handleDeleteReminder,
    handleCreateReminder,
    handleAddList,
    handleUpdateList,
    handleDeleteList,
    handleAddOwner,
    handleUpdateOwner,
    handleDeleteOwner,
    handleCutReminder,
    handleCopyReminder,
    handlePasteReminder,
    refreshData,
  } = useReminderData(showToast);

  const pendingDeleteTitle = useMemo(() => {
    if (!pendingDeleteReminderId) return '';
    const fromView = reminders.find(r => r.id === pendingDeleteReminderId);
    if (fromView) return fromView.title;
    return allReminders.find(r => r.id === pendingDeleteReminderId)?.title ?? '';
  }, [pendingDeleteReminderId, reminders, allReminders]);

  const handleCreateReminderCallback = useCallback(async (data: CreateReminderRequest) => {
    const result = await handleCreateReminder(data);
    if (result.data) {
      setShowAddModal(false);
      showToast('success', '提醒事项已创建');
    } else {
      showToast('error', result.error || '创建提醒事项失败');
    }
  }, [handleCreateReminder, showToast]);

  const handleListEditorSubmit = useCallback(async (values: ListEditorValues) => {
    if (!listEditor) return;
    if (listEditor.mode === 'create') {
      const result = await handleAddList(values.name, values.icon, values.color);
      if (result) {
        setListEditor(null);
        showToast('success', `列表「${values.name}」已创建`);
      } else {
        showToast('error', '创建列表失败');
      }
      return;
    }
    const result = await handleUpdateList(listEditor.list.id, {
      name: values.name,
      icon: values.icon,
      color: values.color,
    });
    if (result) {
      setListEditor(null);
      showToast('success', '列表已更新');
    } else {
      showToast('error', '更新列表失败');
    }
  }, [listEditor, handleAddList, handleUpdateList, showToast]);

  const handleDeleteListCallback = useCallback(async (id: string) => {
    const success = await handleDeleteList(id);
    if (success) {
      showToast('success', '列表已删除');
    }
  }, [handleDeleteList, showToast]);

  const handleAddOwnerCallback = useCallback(async (name: string) => {
    const result = await handleAddOwner(name);
    if (result) {
      showToast('success', `负责人「${name}」已添加`);
    } else {
      showToast('error', '添加负责人失败');
    }
  }, [handleAddOwner, showToast]);

  const handleRenameOwner = useCallback(async (id: string, name: string) => {
    const result = await handleUpdateOwner(id, { name });
    if (result) {
      showToast('success', '负责人已重命名');
    }
  }, [handleUpdateOwner, showToast]);

  const handleDeleteOwnerCallback = useCallback(async (id: string) => {
    const success = await handleDeleteOwner(id);
    if (success) {
      showToast('success', '负责人已删除');
    }
  }, [handleDeleteOwner, showToast]);

  const requestDeleteReminder = useCallback((id: string) => {
    setPendingDeleteReminderId(id);
  }, []);

  const confirmDeleteReminder = useCallback(async () => {
    if (!pendingDeleteReminderId) return;
    const id = pendingDeleteReminderId;
    setPendingDeleteReminderId(null);
    await handleDeleteReminder(id);
  }, [pendingDeleteReminderId, handleDeleteReminder]);

  const refreshDataRef = useRef(refreshData);
  const isEditingRef = useRef(isEditing);
  useEffect(() => {
    refreshDataRef.current = refreshData;
  }, [refreshData]);
  useEffect(() => {
    isEditingRef.current = isEditing;
  }, [isEditing]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isEditingRef.current) {
        refreshDataRef.current();
      }
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setShowAddModal(true);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col bg-apple-bg overflow-hidden relative">
      <AuroraBackground />

      <div className="relative z-10 h-full flex flex-col">
        <TitleBar currentView={currentView} onViewChange={setCurrentView} />

        {isInitialLoading && currentView === 'reminder' ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="relative">
              <div className="w-10 h-10 border-3 border-apple-blue border-t-transparent rounded-full animate-spin" />
              <div className="absolute inset-0 w-10 h-10 border-3 border-apple-blue/30 border-t-transparent rounded-full animate-spin" style={{ animationDuration: '1.5s' }} />
            </div>
          </div>
        ) : currentView === 'reminder' ? (
          <div className="flex-1 flex overflow-hidden">
            <ReminderPage
              reminders={reminders}
              lists={lists}
              owners={owners}
              activeFilter={activeFilter}
              searchQuery={searchQuery}
              filterCounts={filterCounts}
              onFilterChange={handleFilterChange}
              onSearch={handleSearch}
              onToggleCompleted={handleToggleCompleted}
              onUpdateReminder={handleUpdateReminder}
              onDeleteReminder={requestDeleteReminder}
              onCreateReminder={() => setShowAddModal(true)}
              onAddList={() => setListEditor({ mode: 'create' })}
              onEditList={(list) => setListEditor({ mode: 'edit', list })}
              onDeleteList={handleDeleteListCallback}
              onAddOwner={handleAddOwnerCallback}
              onRenameOwner={handleRenameOwner}
              onDeleteOwner={handleDeleteOwnerCallback}
              onEditStart={() => setIsEditing(true)}
              onEditEnd={() => setIsEditing(false)}
              onCut={handleCutReminder}
              onCopy={handleCopyReminder}
              onPaste={handlePasteReminder}
              canPaste={clipboard !== null}
            />
          </div>
        ) : isCalendarLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="relative">
              <div className="w-10 h-10 border-3 border-apple-blue border-t-transparent rounded-full animate-spin" />
              <div className="absolute inset-0 w-10 h-10 border-3 border-apple-blue/30 border-t-transparent rounded-full animate-spin" style={{ animationDuration: '1.5s' }} />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            <CalendarPage
              reminders={allReminders}
              lists={lists}
              onUpdateReminder={handleUpdateReminder}
              onDeleteReminder={requestDeleteReminder}
              onCreateReminder={handleCreateReminder}
              showToast={showToast}
            />
          </div>
        )}

        {showAddModal && (
          <AddReminderModal
            lists={lists}
            initialListId={activeFilter.startsWith('list:') ? activeFilter.slice('list:'.length) : null}
            onClose={() => setShowAddModal(false)}
            onSubmit={handleCreateReminderCallback}
            showToast={showToast}
          />
        )}

        <ListEditorDialog
          isOpen={listEditor !== null}
          mode={listEditor?.mode === 'edit' ? 'edit' : 'create'}
          initial={
            listEditor?.mode === 'edit'
              ? {
                  name: listEditor.list.name,
                  icon: listEditor.list.icon,
                  color: listEditor.list.color,
                }
              : undefined
          }
          onClose={() => setListEditor(null)}
          onSubmit={handleListEditorSubmit}
        />

        <Dialog
          isOpen={pendingDeleteReminderId !== null}
          mode="confirm"
          title="删除提醒"
          message={
            pendingDeleteTitle
              ? `确定删除「${pendingDeleteTitle}」？此操作无法撤销。`
              : '确定删除此提醒事项？此操作无法撤销。'
          }
          confirmLabel="删除"
          danger
          onClose={() => setPendingDeleteReminderId(null)}
          onSubmit={confirmDeleteReminder}
        />

        <ToastContainer messages={toastMessages} onRemove={removeToast} />
      </div>
    </div>
  );
}
