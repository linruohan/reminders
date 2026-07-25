import { memo } from 'react';
import type { ReminderResponse, SubtaskResponse } from '@/types/api';
import { formatDate, formatTime } from '@/utils/dateUtils';
import { ReminderSubtasks } from './ReminderSubtasks';

export const ReminderItemViewMode = memo(function ReminderItemViewMode({ 
  reminder, 
  onToggleCompleted, 
  onStartEditing, 
  onShowDetail,
  onCreateSubtask,
  onUpdateSubtask,
  onDeleteSubtask,
}: {
  reminder: ReminderResponse;
  onToggleCompleted: (id: string) => void;
  onStartEditing: (id: string) => void;
  onShowDetail: () => void;
  onCreateSubtask: (reminderId: string, title: string) => Promise<SubtaskResponse | null>;
  onUpdateSubtask: (id: string, patch: { title?: string; is_completed?: boolean }) => Promise<SubtaskResponse | null>;
  onDeleteSubtask: (id: string) => Promise<boolean>;
}) {
  return (
    <div
      className={`reminder-item px-5 py-3.5 rounded-[16px] hover:bg-white/90 transition-all duration-250 spring-transition cursor-pointer group ${
        reminder.is_completed ? 'bg-gray-50/50' : 'bg-white/60'
      }`}
      onClick={() => onStartEditing(reminder.id)}
    >
      <div className="flex items-center gap-4">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleCompleted(reminder.id);
          }}
          className={`w-[22px] h-[22px] rounded-[6px] border-2 flex items-center justify-center flex-shrink-0 transition-all duration-250 spring-transition ${
            reminder.is_completed
              ? 'bg-apple-blue border-apple-blue shadow-[0_2px_8px_rgba(0,122,255,0.35)]'
              : 'border-apple-gray-dark hover:border-apple-blue hover:shadow-[0_1px_4px_rgba(0,122,255,0.2)]'
          }`}
        >
          {reminder.is_completed && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          )}
        </button>
        
        <div className="flex-1 min-w-0">
          <div className={`text-[17px] font-semibold truncate ${
            reminder.is_completed
              ? 'text-apple-gray line-through'
              : 'text-gray-900'
          }`}>
            {reminder.title}
          </div>
          {reminder.parent_title && (
            <div className="text-[12px] text-apple-gray mt-0.5 truncate">
              父任务：{reminder.parent_title}
            </div>
          )}
          
          <div className="flex items-center gap-3 mt-1">
            {reminder.description && (
              <span className="text-[13px] text-apple-gray truncate max-w-[220px]">
                {reminder.description}
              </span>
            )}
            {reminder.end_date && (
              <span className="text-[13px] font-medium flex items-center gap-1 text-apple-gray">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                {formatDate(reminder.end_date)}
                {reminder.end_time && <> {formatTime(reminder.end_time)}</>}
              </span>
            )}
            {reminder.tags && reminder.tags.length > 0 && (
              <span className="flex items-center gap-1">
                {reminder.tags.map(t => (
                  <span key={t.name} className="inline-flex items-center px-2 py-0.5 bg-apple-blue/10 text-apple-blue text-xs font-medium rounded-full">
                    #{t.name}
                  </span>
                ))}
              </span>
            )}
          </div>

          <ReminderSubtasks
            reminderId={reminder.id}
            parentTitle={reminder.title}
            subtasks={reminder.subtasks ?? []}
            mode="view"
            onCreate={onCreateSubtask}
            onUpdate={onUpdateSubtask}
            onDelete={onDeleteSubtask}
          />
        </div>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            onShowDetail();
          }}
          className="w-9 h-9 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-gray-100/90 transition-all duration-250 spring-transition text-apple-gray"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
        </button>
      </div>
    </div>
  );
});
