import { useState } from 'react';
import type { ListResponse } from '@/types/api';

interface FilterCounts {
  all: number;
  today: number;
  planned: number;
  completed: number;
  urgent: number;
  flagged: number;
  lists: Array<{ id: string; count: number }>;
}

interface SidebarProps {
  lists: ListResponse[];
  activeFilter: string;
  filterCounts: FilterCounts;
  onFilterChange: (filter: string) => void;
  onSearch: (query: string) => void;
  onAddList: () => void;
}

const quickFilters = [
  { id: 'today', label: '今天', icon: 'calendar', bgColor: 'bg-blue-400', iconColor: 'text-blue-600' },
  { id: 'planned', label: '计划', icon: 'calendarDays', bgColor: 'bg-red-400', iconColor: 'text-red-600' },
  { id: 'all', label: '全部', icon: 'mail', bgColor: 'bg-gray-600', iconColor: 'text-gray-700' },
  { id: 'flagged', label: '旗标', icon: 'flag', bgColor: 'bg-orange-400', iconColor: 'text-orange-600' },
  { id: 'urgent', label: '紧急', icon: 'alert', bgColor: 'bg-pink-400', iconColor: 'text-pink-600' },
  { id: 'completed', label: '完成', icon: 'check', bgColor: 'bg-gray-400', iconColor: 'text-gray-600' },
];

function QuickFilterItem({ filter, active, onClick, count }: { filter: typeof quickFilters[0]; active: boolean; onClick: () => void; count: number }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex flex-col items-start px-3 py-2.5 rounded-[14px] transition-all duration-200 spring-transition ${
        active
          ? `${filter.bgColor} shadow-[0_8px_24px_rgba(0,0,0,0.25)] scale-[1.02] border-2 border-black/30`
          : `${filter.bgColor} shadow-[0_2px_8px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.15)] hover:scale-[1.02]`
      }`}
    >
      <div className="flex items-center justify-between w-full mb-1">
        <Icon name={filter.icon} size={18} className="text-white" />
        <span className="text-lg font-bold text-white/90 leading-none">{count}</span>
      </div>
      <span className="text-sm font-semibold text-white">{filter.label}</span>
    </button>
  );
}

function ListItem({ list, active, onClick, count }: { list: ListResponse; active: boolean; onClick: () => void; count: number }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-[12px] transition-all duration-200 spring-transition ${
        active
          ? 'bg-blue-50 text-apple-blue'
          : 'text-gray-700 hover:bg-white/80'
      }`}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="w-5 h-5 rounded-[6px] flex items-center justify-center shadow-sm"
          style={{ backgroundColor: list.color }}
        >
          <Icon name="list" size={10} className="text-white" />
        </div>
        <span className="text-sm font-semibold truncate">{list.name}</span>
      </div>
      <span className={`text-xs font-semibold w-5 h-5 flex items-center justify-center rounded-full ${
        active ? 'bg-apple-blue text-white' : 'bg-gray-100 text-gray-600'
      }`}>
        {count}
      </span>
    </button>
  );
}

function Icon({ name, size = 16, className = '' }: { name: string; size?: number; className?: string }) {
  const icons: Record<string, string> = {
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    calendarDays: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="14" x2="16" y2="14"/><line x1="8" y1="18" x2="16" y2="18"/>',
    flag: '<path d="M7 2v18"/><path d="M7 2c3 0 5 .5 7 1.5s3 2 3 4-1 2-3 3-5 1-7.5-.5-2-3-2-5.5"/><path d="M7 14c3.5 0 5.5.5 6.5 1"/>',
    mail: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>',
    layers: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    alert: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    chevronDown: '<polyline points="6 9 12 15 18 9"/>',
    chevronRight: '<polyline points="9 18 15 12 9 6"/>',
    sort: '<path d="M12 21l-6-6 6-6"/><path d="M18 17l-6-6 6-6"/>',
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} dangerouslySetInnerHTML={{ __html: icons[name] || icons.list }} />
  );
}

type SortOrder = 'name-asc' | 'name-desc' | 'count-asc' | 'count-desc';

export function Sidebar({
  lists,
  activeFilter,
  filterCounts,
  onFilterChange,
  onSearch,
  onAddList,
}: SidebarProps) {
  const [listsExpanded, setListsExpanded] = useState(true);
  const [sortOrder, setSortOrder] = useState<SortOrder>('name-asc');

  const getListCount = (listId: string) => {
    const found = filterCounts.lists.find(l => l.id === listId);
    return found?.count || 0;
  };

  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearch(e.target.value);
  };

  const handleFilterClick = (filter: string) => {
    onFilterChange(filter);
    onSearch('');
  };

  const sortedLists = [...lists].sort((a, b) => {
    const countA = getListCount(a.id);
    const countB = getListCount(b.id);
    
    switch (sortOrder) {
      case 'name-asc':
        return a.name.localeCompare(b.name);
      case 'name-desc':
        return b.name.localeCompare(a.name);
      case 'count-asc':
        return countA - countB;
      case 'count-desc':
        return countB - countA;
    }
  });

  const cycleSortOrder = () => {
    const orders: SortOrder[] = ['name-asc', 'name-desc', 'count-asc', 'count-desc'];
    const currentIndex = orders.indexOf(sortOrder);
    setSortOrder(orders[(currentIndex + 1) % orders.length]);
  };

  const getSortIndicator = () => {
    switch (sortOrder) {
      case 'name-asc':
        return '名称 A→Z';
      case 'name-desc':
        return '名称 Z→A';
      case 'count-asc':
        return '数量 少→多';
      case 'count-desc':
        return '数量 多→少';
    }
  };

  return (
    <aside className="w-60 h-full flex flex-col border-r border-white/30">
      <div className="px-3 pt-3">
        <div className="relative">
          <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-apple-gray" />
          <input
            type="text"
            placeholder="搜索"
            onChange={handleSearchInput}
            className="w-full h-9 pl-9 pr-8 bg-white/70 rounded-[12px] text-sm text-gray-900 placeholder-apple-gray focus:ring-2 focus:ring-apple-blue/30 focus:bg-white outline-none border border-white/50 shadow-sm transition-all duration-200 spring-transition"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-apple-gray bg-gray-100/80 px-1.5 py-0.5 rounded-[4px]">Ctrl+F</kbd>
        </div>
      </div>

      <div className="px-3 py-2">
        <div className="grid grid-cols-2 gap-1.5">
          {quickFilters.map((filter, index) => (
            <div key={filter.id} className="animate-fade-in-up" style={{ animationDelay: `${index * 50}ms` }}>
              <QuickFilterItem
                filter={filter}
                active={activeFilter === filter.id}
                onClick={() => handleFilterClick(filter.id)}
                count={filterCounts[filter.id as keyof FilterCounts] as number}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 py-2 mt-2 flex items-center justify-between">
        <button
          onClick={() => setListsExpanded(!listsExpanded)}
          className="flex items-center gap-2 text-xs font-semibold text-apple-gray uppercase tracking-wide hover:text-gray-700 transition-colors spring-transition"
        >
          <Icon name={listsExpanded ? 'chevronDown' : 'chevronRight'} size={14} />
          <span>我的列表</span>
          <span className="text-gray-400">({lists.length})</span>
        </button>
        {listsExpanded && lists.length > 1 && (
          <button
            onClick={cycleSortOrder}
            title={`切换排序方式（当前：${getSortIndicator()}）`}
            className="flex items-center gap-1.5 px-2 py-1 rounded-[8px] hover:bg-white/60 transition-colors spring-transition"
          >
            <Icon name="sort" size={12} className="text-apple-gray" />
            <span className="text-[10px] font-medium text-apple-gray">{getSortIndicator().slice(0, 4)}</span>
          </button>
        )}
      </div>

      {listsExpanded && (
        <div className="flex-1 overflow-y-auto px-3">
          {sortedLists.map((list, index) => (
            <div key={list.id} className="animate-fade-in-up" style={{ animationDelay: `${index * 30}ms` }}>
              <ListItem
                list={list}
                active={activeFilter === `list:${list.id}`}
                onClick={() => handleFilterClick(`list:${list.id}`)}
                count={getListCount(list.id)}
              />
            </div>
          ))}
        </div>
      )}

      <div className="px-3 py-3">
        <button
          onClick={onAddList}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-[12px] text-apple-blue hover:bg-blue-50/80 transition-all duration-200 spring-transition hover-scale"
        >
          <Icon name="plus" size={14} />
          <span className="text-sm font-medium">添加列表</span>
        </button>
      </div>
    </aside>
  );
}
