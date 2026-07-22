import { useState, useRef, useEffect, useCallback } from 'react';
import type { ReminderResponse, ListResponse, Priority } from '@/types/api';
import { DatePicker } from '../DatePicker';

interface EditReminderCardProps {
  reminder: ReminderResponse;
  lists: ListResponse[];
  onSave: (id: string, updates: Partial<ReminderResponse>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function EditReminderCard({
  reminder,
  lists,
  onSave,
  onDelete,
  onClose,
}: EditReminderCardProps) {
  const [title, setTitle] = useState(reminder.title);
  const [description, setDescription] = useState(reminder.description || '');
  const [url, setUrl] = useState(reminder.url || '');
  const [endDateTime, setEndDateTime] = useState(
    reminder.end_date && reminder.end_time ? `${reminder.end_date}T${reminder.end_time}` : reminder.end_date || ''
  );
  const [isAllDay, setIsAllDay] = useState(reminder.is_all_day ?? false);
  const [selectedListId, setSelectedListId] = useState(reminder.list_id || '');
  const [isFlagged, setIsFlagged] = useState(reminder.is_flagged ?? false);
  const [priority, setPriority] = useState<Priority>(reminder.priority || 'none');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  function splitDateTime(dt: string): { date: string; time: string } | null {
    if (!dt) return null;
    const parts = dt.split('T');
    if (parts.length !== 2) return { date: parts[0], time: '' };
    return { date: parts[0], time: parts[1] || '' };
  }

  const handleSave = useCallback(() => {
    const updates: Partial<ReminderResponse> = {};
    const end = splitDateTime(endDateTime);
    if (title !== reminder.title) updates.title = title;
    if ((description || null) !== reminder.description) updates.description = description || null;
    if ((url || null) !== reminder.url) updates.url = url || null;
    if ((end?.date || null) !== reminder.end_date) updates.end_date = end?.date || null;
    if ((isAllDay ? null : (end?.time || null)) !== reminder.end_time) updates.end_time = isAllDay ? null : (end?.time || null);
    if (isAllDay !== reminder.is_all_day) updates.is_all_day = isAllDay;
    if (selectedListId !== (reminder.list_id || '')) updates.list_id = selectedListId || null;
    if (isFlagged !== reminder.is_flagged) updates.is_flagged = isFlagged;
    if (priority !== reminder.priority) updates.priority = priority;
    onSave(reminder.id, updates);
    onClose();
  }, [title, description, url, endDateTime, isAllDay, selectedListId, isFlagged, priority, reminder, onSave, onClose]);

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-apple-lg shadow-[0_16px_48px_rgba(0,0,0,0.16)] w-[380px] overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-apple-divider">
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-all">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <span className="text-sm font-semibold text-gray-900">编辑提醒</span>
          <div className="flex gap-2">
            <button onClick={() => { onDelete(reminder.id); onClose(); }} className="text-sm font-medium text-red-500 hover:text-red-600 transition-colors">删除</button>
            <button onClick={handleSave} className="text-sm font-semibold text-apple-blue transition-opacity">完成</button>
          </div>
        </div>
        <div className="p-4 max-h-[460px] overflow-y-auto">
          <input ref={inputRef} type="text" value={title} onChange={e => setTitle(e.target.value)}
            placeholder="标题" className="w-full text-[17px] font-semibold text-gray-900 placeholder-apple-gray bg-transparent border-none outline-none" />
          <input type="text" value={description} onChange={e => setDescription(e.target.value)}
            placeholder="备注" className="w-full mt-1 text-[13px] text-apple-gray placeholder-apple-gray bg-transparent border-none outline-none" />
          <input type="url" value={url} onChange={e => setUrl(e.target.value)}
            placeholder="URL" className="w-full mt-0.5 text-[13px] text-apple-blue placeholder-apple-gray bg-transparent border-none outline-none" />
          <div className="border-t border-apple-divider my-3" />
          <div className="flex items-center gap-2 mb-3">
            <button onClick={() => { setIsAllDay(true); setEndDateTime(''); }}
              className={`px-3 py-1 text-xs rounded-[8px] font-medium ${isAllDay ? 'bg-apple-blue text-white' : 'bg-[#F2F2F7] text-gray-600'}`}>全天</button>
            <button onClick={() => setIsAllDay(false)}
              className={`px-3 py-1 text-xs rounded-[8px] font-medium ${!isAllDay ? 'bg-apple-blue text-white' : 'bg-[#F2F2F7] text-gray-600'}`}>指定时间</button>
          </div>
          <DatePicker
            value={endDateTime}
            onChange={setEndDateTime}
            mode={isAllDay ? 'date' : 'datetime-local'}
            placeholder={isAllDay ? '选择截止日期' : '选择截止时间'}
          />
          <div className="mt-3 pt-3 border-t border-apple-divider">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500">列表</span>
              <button onClick={() => setIsFlagged(!isFlagged)}
                className={`w-8 h-[18px] rounded-full transition-colors relative ${isFlagged ? 'bg-apple-blue' : 'bg-gray-300'}`}>
                <div className={`absolute top-0.5 w-[14px] h-[14px] bg-white rounded-full shadow-sm transition-transform ${isFlagged ? 'translate-x-[16px]' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              {lists.map(list => (
                <button key={list.id} onClick={() => setSelectedListId(selectedListId === list.id ? '' : list.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-[10px] text-sm font-medium transition-colors spring-transition ${
                    selectedListId === list.id ? 'bg-blue-50 text-apple-blue' : 'text-gray-700 hover:bg-gray-100'
                  }`}>
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: list.color }} />
                  {list.name}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              {[{ value: 'none', label: '无' }, { value: 'low', label: '低' }, { value: 'medium', label: '中' }, { value: 'high', label: '高' }].map(opt => (
                <button key={opt.value} onClick={() => setPriority(opt.value as Priority)}
                  className={`px-2.5 py-1 text-xs rounded-[8px] font-medium transition-colors ${
                    priority === opt.value
                      ? opt.value === 'high' ? 'bg-red-50 text-red-600' : opt.value === 'medium' ? 'bg-orange-50 text-orange-600' : opt.value === 'low' ? 'bg-green-50 text-green-600' : 'bg-[#F2F2F7] text-gray-700'
                      : 'bg-[#F2F2F7] text-gray-500'
                  }`}>{opt.label}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
