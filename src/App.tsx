import { useState, useEffect, useCallback } from 'react';
import { TitleBar } from './components/TitleBar';
import { ReminderPage } from './pages/ReminderPage';
import { CalendarPage } from './pages/CalendarPage';
import { AddReminderModal } from './components/AddReminderModal';
import { useApi } from './hooks/useApi';
import type { ReminderResponse, ListResponse, OwnerResponse } from './types/api';

export function App() {
  const [currentView, setCurrentView] = useState<'reminder' | 'calendar'>('reminder');
  const [activeFilter, setActiveFilter] = useState('today');
  const [reminders, setReminders] = useState<ReminderResponse[]>([]);
  const [lists, setLists] = useState<ListResponse[]>([]);
  const [owners, setOwners] = useState<OwnerResponse[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const {
    getReminders,
    getRemindersByList,
    getLists,
    getOwners,
    createReminder,
    updateReminder,
    deleteReminder,
    toggleReminderCompleted,
    createList,
  } = useApi();

  const loadReminders = useCallback(async () => {
    setLoading(true);
    try {
      if (activeFilter.startsWith('list:')) {
        const listId = activeFilter.split(':')[1];
        const data = await getRemindersByList(listId);
        if (data) setReminders(data);
      } else {
        const data = await getReminders(activeFilter);
        if (data) setReminders(data);
      }
    } finally {
      setLoading(false);
    }
  }, [activeFilter, getReminders, getRemindersByList]);

  const loadLists = useCallback(async () => {
    const data = await getLists();
    if (data) setLists(data);
  }, [getLists]);

  const loadOwners = useCallback(async () => {
    const data = await getOwners();
    if (data) setOwners(data);
  }, [getOwners]);

  useEffect(() => {
    loadLists();
    loadOwners();
  }, [loadLists, loadOwners]);

  useEffect(() => {
    if (currentView === 'reminder') {
      loadReminders();
    }
  }, [currentView, loadReminders]);

  const handleToggleCompleted = useCallback(async (id: string) => {
    const result = await toggleReminderCompleted(id);
    if (result) {
      setReminders((prev) => prev.map((r) => (r.id === id ? result : r)));
    }
  }, [toggleReminderCompleted]);

  const handleUpdateReminder = useCallback(async (id: string, updates: Partial<ReminderResponse>) => {
    const result = await updateReminder({ id, ...updates });
    if (result) {
      setReminders((prev) => prev.map((r) => (r.id === id ? result : r)));
    }
  }, [updateReminder]);

  const handleDeleteReminder = useCallback(async (id: string) => {
    const success = await deleteReminder(id);
    if (success) {
      setReminders((prev) => prev.filter((r) => r.id !== id));
    }
  }, [deleteReminder]);

  const handleCreateReminder = useCallback(async (data: {
    title: string;
    description?: string | null;
    due_date?: string | null;
    due_time?: string | null;
    list_id?: string | null;
  }) => {
    const result = await createReminder(data);
    if (result) {
      setReminders((prev) => [result, ...prev]);
      setShowAddModal(false);
    }
  }, [createReminder]);

  const handleAddList = useCallback(async () => {
    const name = prompt('请输入列表名称:');
    if (name) {
      const result = await createList({ name });
      if (result) {
        setLists((prev) => [...prev, result]);
      }
    }
  }, [createList]);

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      <TitleBar currentView={currentView} onViewChange={setCurrentView} />
      
      {loading && currentView === 'reminder' ? (
        <div className="flex-1 flex items-center justify-center bg-white">
          <div className="w-8 h-8 border-2 border-apple-blue border-t-transparent rounded-full animate-spin" />
        </div>
      ) : currentView === 'reminder' ? (
        <ReminderPage
          reminders={reminders}
          lists={lists}
          owners={owners}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          onToggleCompleted={handleToggleCompleted}
          onUpdateReminder={handleUpdateReminder}
          onDeleteReminder={handleDeleteReminder}
          onCreateReminder={() => setShowAddModal(true)}
          onAddList={handleAddList}
        />
      ) : (
        <CalendarPage reminders={reminders} lists={lists} />
      )}

      {showAddModal && (
        <AddReminderModal
          lists={lists}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleCreateReminder}
        />
      )}
    </div>
  );
}
