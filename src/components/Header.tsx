interface HeaderProps {
  currentView: 'reminder' | 'calendar';
  onViewChange: (view: 'reminder' | 'calendar') => void;
}

export function Header({ currentView, onViewChange }: HeaderProps) {
  return (
    <header className="flex items-center justify-center gap-12 px-4 h-10 bg-gray-50 border-b border-apple-divider">
      <button
        onClick={() => onViewChange('reminder')}
        className={`flex items-center gap-2 px-4 py-2 rounded-apple-sm transition-all duration-200 ${
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
        <span className="text-sm font-medium">提醒事项</span>
      </button>
      <button
        onClick={() => onViewChange('calendar')}
        className={`flex items-center gap-2 px-4 py-2 rounded-apple-sm transition-all duration-200 ${
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
        <span className="text-sm font-medium">日历</span>
      </button>
    </header>
  );
}