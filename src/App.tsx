import { useState, useEffect, useCallback, useRef } from 'react';
import { TitleBar } from './components/TitleBar';
import { ReminderPage } from './pages/ReminderPage';
import { CalendarPage } from './pages/CalendarPage';
import { AddReminderModal } from './components/AddReminderModal';
import { CreateListDialog } from './components/CreateListDialog';
import { ToastContainer, type ToastMessage, type ToastType } from './components/Toast';
import { useReminderData } from './hooks/useReminderData';
import { CreateReminderRequest } from './types/api';

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
    searchQuery,
    clipboard,
    isInitialLoading,
    isCalendarLoading,
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
    handleCutReminder,
    handleCopyReminder,
    handlePasteReminder,
    refreshData,
  } = useReminderData(showToast);

  const handleCreateReminderCallback = useCallback(async (data: CreateReminderRequest) => {
    const result = await handleCreateReminder(data);
    if (result.data) {
      setShowAddModal(false);
      showToast('success', '提醒事项已创建');
    } else {
      showToast('error', result.error || '创建提醒事项失败');
    }
  }, [handleCreateReminder, showToast]);

  const handleAddListCallback = useCallback(() => {
    setShowAddListDialog(true);
  }, []);

  const handleAddListSubmit = useCallback(async (name: string, icon: string) => {
    const result = await handleAddList(name, icon);
    if (result) {
      setShowAddListDialog(false);
      showToast('success', `列表 "${name}" 已创建`);
    } else {
      showToast('error', '创建列表失败');
    }
  }, [handleAddList, showToast]);

  const handleRenameList = useCallback(async (id: string, name: string) => {
    const result = await handleUpdateList(id, { name });
    if (result) {
      showToast('success', '列表已重命名');
    }
  }, [handleUpdateList, showToast]);

  const handleDeleteListCallback = useCallback(async (id: string) => {
    const success = await handleDeleteList(id);
    if (success) {
      showToast('success', '列表已删除');
    }
  }, [handleDeleteList, showToast]);

  // 使用 useRef 存储 refreshData，避免定时器因依赖变化而重复创建
  const refreshDataRef = useRef(refreshData);
  useEffect(() => {
    refreshDataRef.current = refreshData;
  }, [refreshData]);

  useEffect(() => {
    const interval = setInterval(() => {
      refreshDataRef.current();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Ctrl+N 新建提醒；Ctrl+F 由 Sidebar 处理
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
              onDeleteReminder={handleDeleteReminder}
              onCreateReminder={() => setShowAddModal(true)}
              onAddList={handleAddListCallback}
              onRenameList={handleRenameList}
              onDeleteList={handleDeleteListCallback}
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
              onDeleteReminder={handleDeleteReminder}
              onCreateReminder={handleCreateReminder}
            />
          </div>
        )}

        {showAddModal && (
          <AddReminderModal
            lists={lists}
            onClose={() => setShowAddModal(false)}
            onSubmit={handleCreateReminderCallback}
          />
        )}

        <CreateListDialog
          isOpen={showAddListDialog}
          onClose={() => setShowAddListDialog(false)}
          onSubmit={handleAddListSubmit}
        />

        <ToastContainer messages={toastMessages} onRemove={removeToast} />
      </div>
    </div>
  );
}
