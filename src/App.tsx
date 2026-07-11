import { useState, useEffect, useCallback } from 'react';
import { TitleBar } from './components/TitleBar';
import { ReminderPage } from './pages/ReminderPage';
import { CalendarPage } from './pages/CalendarPage';
import { AddReminderModal } from './components/AddReminderModal';
import { Dialog } from './components/Dialog';
import { ToastContainer, type ToastMessage, type ToastType } from './components/Toast';
import { useReminderData } from './hooks/useReminderData';

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
  const [showAddListDialog, setShowAddListDialog] = useState(false);
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
    clipboard,
    isInitialLoading,
    setIsEditing,
    filterCounts,
    handleFilterChange,
    handleSearch,
    handleToggleCompleted,
    handleUpdateReminder,
    handleDeleteReminder,
    handleCreateReminder,
    handleAddList,
    handleCutReminder,
    handleCopyReminder,
    handlePasteReminder,
    refreshData,
  } = useReminderData();

  const handleCreateReminderCallback = useCallback(async (data: {
    title: string;
    description?: string | null;
    due_date?: string | null;
    due_time?: string | null;
    list_id?: string | null;
  }) => {
    const result = await handleCreateReminder(data);
    if (result) {
      setShowAddModal(false);
      showToast('success', '提醒事项已创建');
    } else {
      showToast('error', '创建提醒事项失败');
    }
  }, [handleCreateReminder, showToast]);

  const handleAddListCallback = useCallback(() => {
    setShowAddListDialog(true);
  }, []);

  const handleAddListSubmit = useCallback(async (name: string) => {
    const result = await handleAddList(name);
    if (result) {
      setShowAddListDialog(false);
      showToast('success', `列表 "${name}" 已创建`);
    } else {
      showToast('error', '创建列表失败');
    }
  }, [handleAddList, showToast]);

  useEffect(() => {
    const interval = setInterval(() => {
      refreshData();
    }, 60000);

    return () => clearInterval(interval);
  }, [refreshData]);

  return (
    <div className="h-screen w-screen flex flex-col bg-apple-bg overflow-hidden relative">
      <AuroraBackground />
      
      <div className="relative z-10 h-full flex flex-col">
        <TitleBar currentView={currentView} onViewChange={setCurrentView} />

        {isInitialLoading && currentView === 'reminder' ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-apple-blue border-t-transparent rounded-full animate-spin" />
          </div>
        ) : currentView === 'reminder' ? (
          <div className="flex-1 flex overflow-hidden glass-card-dark rounded-apple-xl mx-4 mb-4">
            <ReminderPage
              reminders={reminders}
              lists={lists}
              owners={owners}
              activeFilter={activeFilter}
              filterCounts={filterCounts}
              onFilterChange={handleFilterChange}
              onSearch={handleSearch}
              onToggleCompleted={handleToggleCompleted}
              onUpdateReminder={handleUpdateReminder}
              onDeleteReminder={handleDeleteReminder}
              onCreateReminder={() => setShowAddModal(true)}
              onAddList={handleAddListCallback}
              onEditStart={() => setIsEditing(true)}
              onEditEnd={() => setIsEditing(false)}
              onCut={handleCutReminder}
              onCopy={handleCopyReminder}
              onPaste={handlePasteReminder}
              canPaste={clipboard !== null}
            />
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden glass-card-dark rounded-apple-xl mx-4 mb-4">
            <CalendarPage reminders={allReminders} lists={lists} />
          </div>
        )}

        {showAddModal && (
          <AddReminderModal
            lists={lists}
            onClose={() => setShowAddModal(false)}
            onSubmit={handleCreateReminderCallback}
          />
        )}

        <Dialog
          isOpen={showAddListDialog}
          title="新建列表"
          placeholder="输入列表名称"
          onClose={() => setShowAddListDialog(false)}
          onSubmit={handleAddListSubmit}
        />

        <ToastContainer messages={toastMessages} onRemove={removeToast} />
      </div>
    </div>
  );
}
