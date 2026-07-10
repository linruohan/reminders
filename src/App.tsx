import { useState, useEffect, useCallback } from 'react';
import { TitleBar } from './components/TitleBar';
import { ReminderPage } from './pages/ReminderPage';
import { CalendarPage } from './pages/CalendarPage';
import { AddReminderModal } from './components/AddReminderModal';
import { useReminderData } from './hooks/useReminderData';

export function App() {
  const [currentView, setCurrentView] = useState<'reminder' | 'calendar'>('reminder');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const {
    reminders,
    lists,
    owners,
    activeFilter,
    isLoading: isDataLoading,
    handleFilterChange,
    handleToggleCompleted,
    handleUpdateReminder,
    handleDeleteReminder,
    handleCreateReminder,
    handleAddList,
    refreshData,
    getFilterCounts,
  } = useReminderData();

  useEffect(() => {
    setIsLoading(isDataLoading());
  }, [isDataLoading]);

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
    }
  }, [handleCreateReminder]);

  const handleAddListCallback = useCallback(async () => {
    const name = prompt('请输入列表名称:');
    if (name) {
      await handleAddList(name);
    }
  }, [handleAddList]);

  useEffect(() => {
    const interval = setInterval(() => {
      refreshData();
    }, 60000);

    return () => clearInterval(interval);
  }, [refreshData]);

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      <TitleBar currentView={currentView} onViewChange={setCurrentView} />
      
      {isLoading && currentView === 'reminder' ? (
        <div className="flex-1 flex items-center justify-center bg-white">
          <div className="w-8 h-8 border-2 border-apple-blue border-t-transparent rounded-full animate-spin" />
        </div>
      ) : currentView === 'reminder' ? (
        <ReminderPage
          reminders={reminders}
          lists={lists}
          owners={owners}
          activeFilter={activeFilter}
          filterCounts={getFilterCounts()}
          onFilterChange={handleFilterChange}
          onToggleCompleted={handleToggleCompleted}
          onUpdateReminder={handleUpdateReminder}
          onDeleteReminder={handleDeleteReminder}
          onCreateReminder={() => setShowAddModal(true)}
          onAddList={handleAddListCallback}
        />
      ) : (
        <CalendarPage reminders={reminders} lists={lists} />
      )}

      {showAddModal && (
        <AddReminderModal
          lists={lists}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleCreateReminderCallback}
        />
      )}
    </div>
  );
}