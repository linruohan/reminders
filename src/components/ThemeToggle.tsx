import type { Theme } from '@/hooks/useTheme';

interface ThemeToggleProps {
  theme: Theme;
  onToggle: () => void;
}

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      data-tauri-drag-region="false"
      onClick={onToggle}
      title={isDark ? '切换亮色主题' : '切换暗色主题'}
      aria-label={isDark ? '切换亮色主题' : '切换暗色主题'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: 32,
        paddingLeft: 10,
        paddingRight: 12,
        borderRadius: 16,
        border: isDark ? '1px solid rgba(255,255,255,0.16)' : '1px solid rgba(0,0,0,0.1)',
        background: isDark ? '#3a3a3c' : '#ffffff',
        color: isDark ? '#f5f5f7' : '#1d1d1f',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        flexShrink: 0,
        boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
        pointerEvents: 'auto',
      }}
    >
      {isDark ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="4" fill="currentColor" />
          <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="2" x2="12" y2="4" />
            <line x1="12" y1="20" x2="12" y2="22" />
            <line x1="4.93" y1="4.93" x2="6.34" y2="6.34" />
            <line x1="17.66" y1="17.66" x2="19.07" y2="19.07" />
            <line x1="2" y1="12" x2="4" y2="12" />
            <line x1="20" y1="12" x2="22" y2="12" />
            <line x1="4.93" y1="19.07" x2="6.34" y2="17.66" />
            <line x1="17.66" y1="6.34" x2="19.07" y2="4.93" />
          </g>
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
          <path fill="currentColor" d="M21 14.3A9 9 0 0 1 9.7 3 7.2 7.2 0 1 0 21 14.3z" />
        </svg>
      )}
      <span>{isDark ? '亮色' : '暗色'}</span>
    </button>
  );
}
