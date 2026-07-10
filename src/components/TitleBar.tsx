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
    <header className="flex items-center justify-between px-3 h-10 bg-gray-50 border-b border-apple-divider select-none">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2">
          <button
            onClick={handleClose}
            className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors"
            title="关闭"
          />
          <button
            onClick={handleMinimize}
            className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 transition-colors"
            title="最小化"
          />
          <button
            onClick={handleMaximize}
            className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 transition-colors"
            title="最大化"
          />
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => onViewChange('reminder')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-apple-sm transition-all duration-200 text-sm font-medium ${
              currentView === 'reminder'
                ? 'bg-white shadow-apple-sm text-apple-blue'
                : 'text-apple-gray hover:text-gray-900'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <line x1="9" y1="3" x2="9" y2="21"/>
              <line x1="15" y1="3" x2="15" y2="21"/>
            </svg>
            <span>提醒事项</span>
          </button>
          <button
            onClick={() => onViewChange('calendar')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-apple-sm transition-all duration-200 text-sm font-medium ${
              currentView === 'calendar'
                ? 'bg-white shadow-apple-sm text-apple-blue'
                : 'text-apple-gray hover:text-gray-900'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
