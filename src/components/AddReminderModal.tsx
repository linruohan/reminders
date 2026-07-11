import { useState, useRef, useEffect } from 'react';
import type { ListResponse } from '@/types/api';
import { getTodayStr, getTomorrowStr, formatTime, suggestedTimes, getDateLabel } from '@/utils/dateUtils';

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
}

export function AddReminderModal({ lists, onClose, onSubmit }: AddReminderModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSubmit = () => {
    if (!title.trim()) return;
    
    onSubmit({
      title: title.trim(),
      description: description.trim() || null,
      due_date: dueDate || null,
      due_time: dueTime || null,
      list_id: selectedListId,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const formatDisplayTime = (timeStr: string | undefined): string => {
    return formatTime(timeStr).replace(' ', '');
  };

  return (
    <div className="fixed inset-0 bg-black/20 flex items-end justify-center z-50" onClick={onClose}>
      <div
        className="glass-card-light rounded-t-[24px] w-full max-w-lg shadow-[0_16px_48px_rgba(0,0,0,0.16)] overflow-hidden animate-slide-up"
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

        <div className="p-5">
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="标题"
            className="w-full text-xl font-semibold text-gray-900 placeholder-apple-gray bg-transparent border-none outline-none mb-4"
          />

          {description && (
            <div className="mb-4">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="备注"
                className="w-full text-sm text-gray-700 placeholder-apple-gray bg-transparent border-none outline-none resize-none h-20"
              />
            </div>
          )}

          <div className="flex items-center flex-wrap gap-2">
            {dueDate && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F2F2F7] rounded-[10px] text-sm font-medium text-gray-700">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                {getDateLabel(dueDate) || dueDate}
                <button
                  onClick={() => setDueDate('')}
                  className="ml-1 w-4 h-4 rounded-full flex items-center justify-center hover:bg-gray-200/80 transition-colors spring-transition"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </span>
            )}

            {dueDate && dueTime && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F2F2F7] rounded-[10px] text-sm font-medium text-apple-orange">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                {formatDisplayTime(dueTime)}
                <button
                  onClick={() => setDueTime('')}
                  className="ml-1 w-4 h-4 rounded-full flex items-center justify-center hover:bg-gray-200/80 transition-colors spring-transition"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </span>
            )}

            {!dueDate && (
              <>
                <button
                  onClick={() => setDueDate(getTodayStr())}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F2F2F7] rounded-[10px] text-sm font-medium text-gray-700 hover:bg-[#E5E5EA] transition-colors spring-transition"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                  今天
                </button>
                <button
                  onClick={() => setDueDate(getTomorrowStr())}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F2F2F7] rounded-[10px] text-sm font-medium text-gray-700 hover:bg-[#E5E5EA] transition-colors spring-transition"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                  明天
                </button>
                <div className="relative">
                  <button
                    onClick={() => setShowDatePicker(!showDatePicker)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F2F2F7] rounded-[10px] text-sm font-medium text-gray-700 hover:bg-[#E5E5EA] transition-colors spring-transition"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    选择日期
                  </button>
                  
                  {showDatePicker && (
                    <div className="absolute bottom-full left-0 mb-2 z-20 animate-scale-in">
                      <div className="bg-white rounded-[14px] shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-apple-divider min-w-[200px] overflow-hidden">
                        <div className="p-2">
                          {[
                            { value: getTodayStr(), label: '今天' },
                            { value: getTomorrowStr(), label: '明天' },
                          ].map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => {
                                setDueDate(opt.value);
                                setShowDatePicker(false);
                              }}
                              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-[8px] text-[13px] font-medium transition-colors spring-transition ${
                                dueDate === opt.value
                                  ? 'bg-apple-blue text-white'
                                  : 'text-gray-900 hover:bg-gray-100'
                              }`}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                <line x1="3" y1="10" x2="21" y2="10"/>
                              </svg>
                              {opt.label}
                            </button>
                          ))}
                          <div className="border-t border-apple-divider my-1" />
                          <div className="px-3 py-2">
                            <input
                              type="date"
                              value={dueDate}
                              onChange={(e) => {
                                setDueDate(e.target.value);
                                setShowDatePicker(false);
                              }}
                              className="w-full px-2.5 py-1.5 bg-[#F2F2F7] rounded-[8px] text-[13px] text-gray-900 outline-none focus:ring-2 focus:ring-apple-blue/40"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {dueDate && !dueTime && (
              <div className="relative">
                <button
                  onClick={() => setShowTimePicker(!showTimePicker)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F2F2F7] rounded-[10px] text-sm font-medium text-gray-700 hover:bg-[#E5E5EA] transition-colors spring-transition"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                  添加时间
                </button>
                
                {showTimePicker && (
                  <div className="absolute bottom-full left-0 mb-2 bg-white rounded-[14px] shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-apple-divider z-10 min-w-[200px] animate-scale-in">
                    <div className="p-1">
                      <div className="px-3 py-2 text-xs font-semibold text-apple-gray uppercase tracking-wide">建议</div>
                      {suggestedTimes.map((time) => (
                        <button
                          key={time.value}
                          onClick={() => {
                            setDueTime(time.value);
                            setShowTimePicker(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-[10px] text-sm font-medium transition-all spring-transition ${
                            dueTime === time.value
                              ? 'bg-apple-blue text-white'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10"/>
                              <polyline points="12 6 12 12 16 14"/>
                            </svg>
                            <span>{time.label}</span>
                          </div>
                          <span className={`text-xs font-medium ${
                            dueTime === time.value ? 'text-white/70' : 'text-apple-gray'
                          }`}>
                            {time.period}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F2F2F7] rounded-[10px] text-sm font-medium text-gray-700 hover:bg-[#E5E5EA] transition-colors spring-transition opacity-60 cursor-not-allowed"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              添加位置
            </button>
          </div>

          <div className="mt-5 pt-5 border-t border-apple-divider">
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
