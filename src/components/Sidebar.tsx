import type { ListResponse } from '@/types/api';

interface SidebarProps {
  lists: ListResponse[];
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  onAddList: () => void;
}

const quickFilters = [
  { id: 'today', label: '今天', icon: 'clock' },
  { id: 'planned', label: '计划', icon: 'list' },
];

function QuickFilterItem({ filter, active, onClick, count }: { filter: typeof quickFilters[0]; active: boolean; onClick: () => void; count: number }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-apple-md transition-all duration-150 ${
        active
          ? 'bg-apple-blue text-white shadow-[0_2px_8px_rgba(0,122,255,0.3)]'
          : 'bg-white/60 text-gray-700 hover:bg-white/80'
      }`}
    >
      <div className="flex items-center gap-2.5">
        <Icon name={filter.icon} size={16} />
        <span className="text-sm font-semibold">{filter.label}</span>
      </div>
      <span className={`text-xs font-semibold w-5 h-5 flex items-center justify-center rounded-full ${
        active ? 'bg-white/20 text-white' : 'bg-gray-200/50 text-gray-600'
      }`}>
        {count}
      </span>
    </button>
  );
}

function AllFilterItem({ active, onClick, count }: { active: boolean; onClick: () => void; count: number }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-apple-md transition-all duration-150 ${
        active
          ? 'bg-blue-50 text-apple-blue'
          : 'text-gray-700 hover:bg-gray-50/60'
      }`}
    >
      <div className="flex items-center gap-2.5">
        <Icon name="layers" size={16} />
        <span className="text-sm font-semibold">全部</span>
      </div>
      <span className={`text-xs font-semibold w-5 h-5 flex items-center justify-center rounded-full ${
        active ? 'bg-apple-blue text-white' : 'bg-gray-200/50 text-gray-600'
      }`}>
        {count}
      </span>
    </button>
  );
}

function ListItem({ list, active, onClick, count }: { list: ListResponse; active: boolean; onClick: () => void; count: number }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-apple-md transition-all duration-150 ${
        active
          ? 'bg-blue-50 text-apple-blue'
          : 'text-gray-700 hover:bg-gray-50/60'
      }`}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="w-5 h-5 rounded-sm flex items-center justify-center shadow-sm"
          style={{ backgroundColor: list.color }}
        >
          <Icon name="list" size={10} className="text-white" />
        </div>
        <span className="text-sm font-semibold">{list.name}</span>
      </div>
      <span className={`text-xs font-semibold w-5 h-5 flex items-center justify-center rounded-full ${
        active ? 'bg-apple-blue text-white' : 'bg-gray-200/50 text-gray-600'
      }`}>
        {count}
      </span>
    </button>
  );
}

function Icon({ name, size = 16, className = '' }: { name: string; size?: number; className?: string }) {
  const icons: Record<string, string> = {
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
    alert: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    layers: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    close: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={icons[name] || icons.list} />
    </svg>
  );
}

export function Sidebar({
  lists,
  activeFilter,
  onFilterChange,
  onAddList,
}: SidebarProps) {
  return (
    <aside className="w-60 h-full glass-effect-dark border-r border-apple-divider flex flex-col">
      <div className="px-3 pt-3">
        <div className="relative">
          <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-apple-gray" />
          <input
            type="text"
            placeholder="搜索"
            className="w-full h-8 pl-9 pr-3.5 bg-white/60 rounded-apple-md text-sm text-gray-900 placeholder-apple-gray focus:ring-2 focus:ring-apple-blue/30 outline-none border border-gray-100/50 shadow-sm"
          />
        </div>
      </div>

      <div className="px-3 py-3">
        {quickFilters.map((filter) => (
          <QuickFilterItem
            key={filter.id}
            filter={filter}
            active={activeFilter === filter.id}
            onClick={() => onFilterChange(filter.id)}
            count={0}
          />
        ))}
      </div>

      <div className="px-3 pb-2">
        <AllFilterItem
          active={activeFilter === 'all'}
          onClick={() => onFilterChange('all')}
          count={0}
        />
      </div>

      <div className="px-4 py-2 mt-2">
        <span className="text-xs font-semibold text-apple-gray uppercase tracking-wide">我的列表</span>
      </div>

      <div className="flex-1 overflow-y-auto px-3">
        {lists.map((list) => (
          <ListItem
            key={list.id}
            list={list}
            active={activeFilter === `list:${list.id}`}
            onClick={() => onFilterChange(`list:${list.id}`)}
            count={0}
          />
        ))}
      </div>

      <div className="px-3 py-3">
        <button
          onClick={onAddList}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-apple-md text-apple-blue hover:bg-blue-50/60 transition-all duration-150"
        >
          <Icon name="plus" size={14} />
          <span className="text-sm font-medium">添加列表</span>
        </button>
      </div>
    </aside>
  );
}
