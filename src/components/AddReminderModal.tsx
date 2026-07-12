import { useState, useRef, useEffect, useCallback } from 'react';
import type { ListResponse } from '@/types/api';
import { DatePickerChip } from './DatePickerChip';
import { TimePickerChip } from './TimePickerChip';

interface AddReminderModalProps {
  lists: ListResponse[];
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description?: string | null;
    due_date?: string | null;
    due_time?: string | null;
    list_id?: string | null;
  }) => void;
  initialDate?: string;
  initialTime?: string;
}

export function AddReminderModal({ lists, onClose, onSubmit, initialDate, initialTime }: AddReminderModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(initialDate || '');
  const [dueTime, setDueTime] = useState(initialTime || '');
  const [selectedListId, setSelectedListId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSubmit = useCallback(() => {
    if (!title.trim()) return;
    
    onSubmit({
      title: title.trim(),
      description: description.trim() || null,
      due_date: dueDate || null,
      due_time: dueTime || null,
      list_id: selectedListId,
    });
  }, [title, description, dueDate, dueTime, selectedListId, onSubmit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  }, [handleSubmit, onClose]);

  const handleDateChange = useCallback((value: string) => {
    setDueDate(value);
    if (!value) {
      setDueTime('');
    }
  }, []);

  const handleClearDate = useCallback(() => {
    setDueDate('');
    setDueTime('');
  }, []);

  const handleClearTime = useCallback(() => {
    setDueTime('');
  }, []);

  const handleDateRequired = useCallback(() => {
    if (!dueDate) {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      setDueDate(todayStr);
    }
  }, [dueDate]);

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-apple-lg shadow-[0_16px_48px_rgba(0,0,0,0.16)] w-[320px] overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-apple-divider">
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100/80 transition-all spring-transition"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <span className="text-sm font-semibold text-gray-900">新建提醒事项</span>
          <button
            onClick={handleSubmit}
            disabled={!title.trim()}
            className="text-sm font-semibold text-apple-blue disabled:text-apple-gray disabled:opacity-50 transition-opacity spring-transition"
          >
            完成
          </button>
        </div>

        <div className="p-4">
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="标题"
            className="w-full text-[17px] font-semibold text-gray-900 placeholder-apple-gray bg-transparent border-none outline-none"
          />
          
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="备注"
            className="w-full mt-0.5 text-[13px] text-apple-gray placeholder-apple-gray bg-transparent border-none outline-none"
          />

          <div className="border-t border-apple-divider mt-3 mb-3" />
          
          <div className="flex items-center gap-2 flex-wrap">
            <DatePickerChip
              value={dueDate || null}
              onChange={handleDateChange}
              onClear={handleClearDate}
            />
            
            <TimePickerChip
              value={dueTime || null}
              onChange={(value) => setDueTime(value)}
              onClear={handleClearTime}
              onDateRequired={handleDateRequired}
            />
            
            <div className="inline-flex items-center gap-1.5 h-8 pl-2.5 pr-1.5 bg-[#F2F2F7] rounded-[10px] text-[13px] font-medium text-gray-900 cursor-default opacity-60">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-700 flex-shrink-0">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <span className="text-apple-gray">添加位置</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-apple-divider">
            <div className="flex items-center gap-2 mb-3">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="9" y1="3" x2="9" y2="21"/>
                <line x1="15" y1="3" x2="15" y2="21"/>
              </svg>
              <span className="text-sm font-semibold text-gray-700">列表</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {lists.map((list) => (
                <button
                  key={list.id}
                  onClick={() => setSelectedListId(selectedListId === list.id ? null : list.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-[10px] text-sm font-medium transition-colors spring-transition ${
                    selectedListId === list.id
                      ? 'bg-blue-50 text-apple-blue'
                      : 'text-gray-700 hover:bg-gray-100/80'
                  }`}
                >
                  <span className="inline-block w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: list.color }} />
                  {list.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}