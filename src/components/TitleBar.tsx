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
    <header className="flex items-center justify-between px-4 h-10 glass-card-dark select-none">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleClose}
            className="traffic-light-close"
            title="关闭"
          />
          <button
            onClick={handleMinimize}
            className="traffic-light-minimize"
            title="最小化"
          />
          <button
            onClick={handleMaximize}
            className="traffic-light-maximize"
            title="最大化"
          />
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onViewChange('reminder')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-[10px] transition-all duration-200 spring-transition text-sm font-medium ${
              currentView === 'reminder'
                ? 'bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1)] text-apple-blue'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <line x1="9" y1="3" x2="9" y2="21"/>
              <line x1="15" y1="3" x2="15" y2="21"/>
            </svg>
            <span>提醒事项</span>
          </button>
          <button
            onClick={() => onViewChange('calendar')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-[10px] transition-all duration-200 spring-transition text-sm font-medium ${
              currentView === 'calendar'
                ? 'bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1)] text-apple-blue'
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
