import { getCurrentWindow } from '@tauri-apps/api/window';

interface TitleBarProps {
  currentView: 'reminder' | 'calendar';
  onViewChange: (view: 'reminder' | 'calendar') => void;
}

export function TitleBar({ currentView, onViewChange }: TitleBarProps) {
  const handleMinimize = async () => {
    const window = getCurrentWindow();
    await window.minimize();
  };

  const handleMaximize = async () => {
    const window = getCurrentWindow();
    await window.toggleMaximize();
  };

  const handleClose = async () => {
    const window = getCurrentWindow();
    await window.close();
  };

  return (
    <header className="flex items-center justify-between px-4 h-11 select-none">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2">
          <button
            onClick={handleClose}
            className="w-3 h-3 rounded-full bg-[#FF5F56] hover:bg-[#FF3B30] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_1px_0_rgba(0,0,0,0.1)] transition-all duration-200 spring-transition hover:scale-110 active:scale-95"
            title="关闭到托盘"
          />
          <button
            onClick={handleMinimize}
            className="w-3 h-3 rounded-full bg-[#FFBD2E] hover:bg-[#FFCC00] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_1px_0_rgba(0,0,0,0.1)] transition-all duration-200 spring-transition hover:scale-110 active:scale-95"
            title="最小化"
          />
          <button
            onClick={handleMaximize}
            className="w-3 h-3 rounded-full bg-[#27C93F] hover:bg-[#4CD964] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_1px_0_rgba(0,0,0,0.1)] transition-all duration-200 spring-transition hover:scale-110 active:scale-95"
            title="最大化"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onViewChange('reminder')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-[12px] transition-all duration-250 spring-transition text-sm font-medium ${
              currentView === 'reminder'
                ? 'bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] text-apple-blue'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 11 3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            <span>提醒事项</span>
          </button>
          <button
            onClick={() => onViewChange('calendar')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-[12px] transition-all duration-250 spring-transition text-sm font-medium ${
              currentView === 'calendar'
                ? 'bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] text-apple-blue'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span>日历</span>
          </button>
        </div>
      </div>

      <div data-tauri-drag-region className="flex-1 h-full" />
    </header>
  );
}
