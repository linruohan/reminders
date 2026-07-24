import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { ListResponse, OwnerResponse } from '@/types/api';
import type { FilterCounts } from '@/types/filters';
import { Dialog } from './Dialog';

interface SidebarProps {
  lists: ListResponse[];
  owners: OwnerResponse[];
  activeFilter: string;
  filterCounts: FilterCounts;
  onFilterChange: (filter: string) => void;
  onSearch: (query: string) => void;
  onAddList: () => void;
  onEditList?: (list: ListResponse) => void;
  onDeleteList?: (id: string) => void;
  onAddOwner?: (name: string) => void;
  onRenameOwner?: (id: string, name: string) => void;
  onDeleteOwner?: (id: string) => void;
}

const quickFilters = [
  { id: 'today', label: '今天', icon: 'calendar', color: '#007AFF', gradient: 'linear-gradient(135deg, #60A5FA, #3B82F6)' },
  { id: 'planned', label: '计划', icon: 'calendarDays', color: '#FF3B30', gradient: 'linear-gradient(135deg, #F87171, #EF4444)' },
  { id: 'all', label: '全部', icon: 'mail', color: '#8E8E93', gradient: 'linear-gradient(135deg, #9CA3AF, #6B7280)' },
  { id: 'flagged', label: '旗标', icon: 'flag', color: '#FF9500', gradient: 'linear-gradient(135deg, #FB923C, #F97316)' },
  { id: 'urgent', label: '紧急', icon: 'alert', color: '#FF2D55', gradient: 'linear-gradient(135deg, #F472B6, #EC4899)' },
  { id: 'overdue', label: '逾期', icon: 'calendarDays', color: '#AF52DE', gradient: 'linear-gradient(135deg, #C084FC, #A855F7)' },
  { id: 'completed', label: '完成', icon: 'check', color: '#C7C7CC', gradient: 'linear-gradient(135deg, #D1D5DB, #9CA3AF)' },
];

type CtxMenu =
  | { kind: 'list'; item: ListResponse; x: number; y: number }
  | { kind: 'owner'; item: OwnerResponse; x: number; y: number }
  | null;

type DialogState =
  | { kind: 'add-owner' }
  | { kind: 'delete-list'; item: ListResponse }
  | { kind: 'rename-owner'; item: OwnerResponse }
  | { kind: 'delete-owner'; item: OwnerResponse }
  | null;

function QuickFilterItem({ filter, active, onClick, count }: { filter: typeof quickFilters[0]; active: boolean; onClick: () => void; count: number }) {
  return (
    <button
      onClick={onClick}
      aria-label={`${filter.label}，${count} 项`}
      aria-current={active ? 'page' : undefined}
      style={{ background: filter.gradient }}
      className={`w-full flex flex-col items-start px-3 py-3 rounded-[16px] shadow-[0_2px_8px_rgba(0,0,0,0.12)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.2)] hover:scale-[1.02] transition-all duration-300 spring-transition ${
        active
          ? 'ring-[3px] ring-black/80 shadow-[0_8px_28px_rgba(0,0,0,0.3)] scale-[1.03]'
          : ''
      }`}
    >
      <div className="flex items-center justify-between w-full mb-1">
        <Icon name={filter.icon} size={18} className="text-white" />
        <span className="text-lg font-bold leading-none text-white/90">{count}</span>
      </div>
      <span className="text-sm font-semibold text-white">{filter.label}</span>
    </button>
  );
}

function ListItem({
  list,
  active,
  onClick,
  count,
  onContextMenu,
}: {
  list: ListResponse;
  active: boolean;
  onClick: () => void;
  count: number;
  onContextMenu: (e: React.MouseEvent, list: ListResponse) => void;
}) {
  return (
    <button
      onClick={onClick}
      onContextMenu={(e) => onContextMenu(e, list)}
      aria-label={`${list.name}，${count} 项`}
      aria-current={active ? 'page' : undefined}
      className={`w-full flex items-center justify-between px-4 py-2.5 rounded-[14px] transition-all duration-250 spring-transition ${
        active
          ? 'bg-apple-blue/10 text-apple-blue shadow-[0_2px_8px_rgba(0,122,255,0.12)]'
          : 'text-gray-700 hover:bg-white/90'
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-5 h-5 rounded-[8px] flex items-center justify-center shadow-sm"
          style={{ backgroundColor: list.color }}
        >
          <Icon name={list.icon || 'list'} size={11} className="text-white" />
        </div>
        <span className="text-sm font-semibold truncate">{list.name}</span>
      </div>
      <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full transition-all ${
        active ? 'bg-apple-blue text-white' : 'bg-gray-100 text-gray-600'
      }`}>
        {count}
      </span>
    </button>
  );
}

function OwnerItem({
  owner,
  active,
  count,
  onClick,
  onContextMenu,
}: {
  owner: OwnerResponse;
  active: boolean;
  count: number;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent, owner: OwnerResponse) => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onContextMenu={(e) => onContextMenu(e, owner)}
      aria-label={`负责人 ${owner.name}，${count} 项`}
      aria-current={active ? 'page' : undefined}
      className={`w-full flex items-center justify-between px-4 py-2 rounded-[14px] transition-all duration-250 spring-transition ${
        active
          ? 'bg-apple-blue/10 text-apple-blue shadow-[0_2px_8px_rgba(0,122,255,0.12)]'
          : 'text-gray-700 hover:bg-white/90'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-5 h-5 rounded-full shadow-sm shrink-0"
          style={{ backgroundColor: owner.color }}
        />
        <span className="text-sm font-semibold truncate">{owner.name}</span>
      </div>
      <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full transition-all shrink-0 ${
        active ? 'bg-apple-blue text-white' : 'bg-gray-100 text-gray-600'
      }`}>
        {count}
      </span>
    </button>
  );
}

function TagItem({
  name,
  active,
  count,
  onClick,
}: {
  name: string;
  active: boolean;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`标签 ${name}，${count} 项`}
      aria-current={active ? 'page' : undefined}
      className={`w-full flex items-center justify-between px-4 py-2 rounded-[14px] transition-all duration-250 spring-transition ${
        active
          ? 'bg-apple-blue/10 text-apple-blue shadow-[0_2px_8px_rgba(0,122,255,0.12)]'
          : 'text-gray-700 hover:bg-white/90'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-xs font-bold text-apple-gray shrink-0">#</span>
        <span className="text-sm font-semibold truncate">{name}</span>
      </div>
      <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full transition-all shrink-0 ${
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
  owners,
  activeFilter,
  filterCounts,
  onFilterChange,
  onSearch,
  onAddList,
  onEditList,
  onDeleteList,
  onAddOwner,
  onRenameOwner,
  onDeleteOwner,
}: SidebarProps) {
  const [listsExpanded, setListsExpanded] = useState(true);
  const [ownersExpanded, setOwnersExpanded] = useState(true);
  const [tagsExpanded, setTagsExpanded] = useState(true);
  const [sortOrder, setSortOrder] = useState<SortOrder>('name-asc');
  const [ctxMenu, setCtxMenu] = useState<CtxMenu>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [ctxMenu]);

  const getListCount = (listId: string) => {
    const found = filterCounts.lists.find(l => l.id === listId);
    return found?.count || 0;
  };

  const getOwnerCount = (ownerId: string) => {
    const found = filterCounts.owners?.find(o => o.id === ownerId);
    return found?.count || 0;
  };

  const tagCounts = filterCounts.tags ?? [];

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

  const openListMenu = (e: React.MouseEvent, list: ListResponse) => {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ kind: 'list', item: list, x: e.clientX, y: e.clientY });
  };

  const openOwnerMenu = (e: React.MouseEvent, owner: OwnerResponse) => {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ kind: 'owner', item: owner, x: e.clientX, y: e.clientY });
  };

  const handleDialogSubmit = (value: string) => {
    if (!dialog) return;
    switch (dialog.kind) {
      case 'add-owner':
        onAddOwner?.(value);
        break;
      case 'delete-list':
        onDeleteList?.(dialog.item.id);
        break;
      case 'rename-owner':
        if (value && value !== dialog.item.name) onRenameOwner?.(dialog.item.id, value);
        break;
      case 'delete-owner':
        onDeleteOwner?.(dialog.item.id);
        break;
    }
    setDialog(null);
  };

  const dialogTitle =
    dialog?.kind === 'add-owner' ? '添加负责人'
      : dialog?.kind === 'delete-list' ? '删除列表'
        : dialog?.kind === 'rename-owner' ? '重命名负责人'
          : dialog?.kind === 'delete-owner' ? '删除负责人'
            : '';

  const dialogMessage =
    dialog?.kind === 'delete-list'
      ? `确定删除列表「${dialog.item.name}」？列表内提醒不会被删除。`
      : dialog?.kind === 'delete-owner'
        ? `确定删除负责人「${dialog.item.name}」？`
        : undefined;

  const isConfirm = dialog?.kind === 'delete-list' || dialog?.kind === 'delete-owner';

  return (
    <aside className="w-60 h-full flex flex-col" aria-label="侧边栏">
      <div className="px-4 pt-4">
        <div className="relative">
          <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-apple-gray" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="搜索"
            aria-label="搜索提醒"
            onChange={handleSearchInput}
            className="w-full h-10 pl-10 pr-10 bg-white/80 rounded-[14px] text-sm text-gray-900 placeholder-apple-gray focus:ring-2 focus:ring-apple-blue/30 focus:bg-white focus:shadow-[0_0_0_3px_rgba(0,122,255,0.1)] outline-none border border-white/60 shadow-sm transition-all duration-250 spring-transition"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-apple-gray bg-gray-100/80 px-1.5 py-0.5 rounded-[4px]">Ctrl+F</kbd>
        </div>
      </div>

      <div className="px-3 py-3">
        <div className="grid grid-cols-2 gap-2">
          {quickFilters.map((filter, index) => (
            <div key={filter.id} className="animate-fade-in-up" style={{ animationDelay: `${index * 60}ms` }}>
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

      <div className="px-4 py-2 flex items-center justify-between">
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
            className="flex items-center gap-1.5 px-2 py-1 rounded-[10px] hover:bg-white/70 transition-all duration-200 spring-transition"
          >
            <Icon name="sort" size={12} className="text-apple-gray" />
            <span className="text-[10px] font-medium text-apple-gray">{getSortIndicator().slice(0, 4)}</span>
          </button>
        )}
      </div>

      {listsExpanded && (
        <div className="max-h-[40%] overflow-y-auto px-3 pb-2 space-y-0.5">
          {sortedLists.map((list, index) => (
            <div key={list.id} className="animate-fade-in-up" style={{ animationDelay: `${index * 40}ms` }}>
              <ListItem
                list={list}
                active={activeFilter === `list:${list.id}`}
                onClick={() => handleFilterClick(`list:${list.id}`)}
                count={getListCount(list.id)}
                onContextMenu={openListMenu}
              />
            </div>
          ))}
        </div>
      )}

      <div className="px-4 py-2 flex items-center justify-between">
        <button
          onClick={() => setOwnersExpanded(!ownersExpanded)}
          className="flex items-center gap-2 text-xs font-semibold text-apple-gray uppercase tracking-wide hover:text-gray-700 transition-colors spring-transition"
        >
          <Icon name={ownersExpanded ? 'chevronDown' : 'chevronRight'} size={14} />
          <span>负责人</span>
          <span className="text-gray-400">({owners.length})</span>
        </button>
      </div>

      {ownersExpanded && (
        <div className="max-h-[28%] overflow-y-auto px-3 pb-2 space-y-0.5">
          {owners.map((owner) => (
            <OwnerItem
              key={owner.id}
              owner={owner}
              active={activeFilter === `owner:${owner.id}`}
              count={getOwnerCount(owner.id)}
              onClick={() => handleFilterClick(`owner:${owner.id}`)}
              onContextMenu={openOwnerMenu}
            />
          ))}
          {onAddOwner && (
            <button
              type="button"
              onClick={() => setDialog({ kind: 'add-owner' })}
              className="w-full flex items-center gap-2 px-4 py-2 rounded-[14px] text-apple-blue hover:bg-blue-50/90 transition-all duration-250 spring-transition"
            >
              <Icon name="plus" size={14} />
              <span className="text-sm font-semibold">添加负责人</span>
            </button>
          )}
        </div>
      )}

      {tagCounts.length > 0 && (
        <>
          <div className="px-4 py-2 flex items-center justify-between">
            <button
              onClick={() => setTagsExpanded(!tagsExpanded)}
              className="flex items-center gap-2 text-xs font-semibold text-apple-gray uppercase tracking-wide hover:text-gray-700 transition-colors spring-transition"
            >
              <Icon name={tagsExpanded ? 'chevronDown' : 'chevronRight'} size={14} />
              <span>标签</span>
              <span className="text-gray-400">({tagCounts.length})</span>
            </button>
          </div>

          {tagsExpanded && (
            <div className="flex-1 overflow-y-auto px-3 pb-2 space-y-0.5 min-h-0">
              {tagCounts.map((tag) => (
                <TagItem
                  key={tag.name}
                  name={tag.name}
                  active={activeFilter === `tag:${encodeURIComponent(tag.name)}`}
                  count={tag.count}
                  onClick={() => handleFilterClick(`tag:${encodeURIComponent(tag.name)}`)}
                />
              ))}
            </div>
          )}
        </>
      )}

      <div className="px-3 py-3">
        <button
          onClick={onAddList}
          className="w-full flex items-center gap-2 px-4 py-2.5 rounded-[14px] text-apple-blue hover:bg-blue-50/90 transition-all duration-250 spring-transition hover:scale-[1.02] active:scale-[0.98]"
        >
          <Icon name="plus" size={16} />
          <span className="text-sm font-semibold">添加列表</span>
        </button>
      </div>

      {ctxMenu && createPortal(
        <div
          className="fixed z-[10000] min-w-[140px] bg-white rounded-[12px] shadow-[0_8px_28px_rgba(0,0,0,0.16)] border border-apple-divider py-1 overflow-hidden"
          style={{ top: ctxMenu.y, left: ctxMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            onClick={() => {
              if (ctxMenu.kind === 'list') {
                onEditList?.(ctxMenu.item);
              } else {
                setDialog({ kind: 'rename-owner', item: ctxMenu.item });
              }
              setCtxMenu(null);
            }}
          >
            {ctxMenu.kind === 'list' ? '编辑' : '重命名'}
          </button>
          <button
            type="button"
            className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50"
            onClick={() => {
              if (ctxMenu.kind === 'list') setDialog({ kind: 'delete-list', item: ctxMenu.item });
              else setDialog({ kind: 'delete-owner', item: ctxMenu.item });
              setCtxMenu(null);
            }}
          >
            删除
          </button>
        </div>,
        document.body
      )}

      <Dialog
        isOpen={dialog !== null}
        title={dialogTitle}
        mode={isConfirm ? 'confirm' : 'input'}
        message={dialogMessage}
        placeholder={dialog?.kind === 'add-owner' ? '输入姓名' : '输入名称'}
        defaultValue={
          dialog?.kind === 'rename-owner' ? dialog.item.name : ''
        }
        confirmLabel={isConfirm ? '删除' : '确定'}
        danger={isConfirm}
        onClose={() => setDialog(null)}
        onSubmit={handleDialogSubmit}
      />
    </aside>
  );
}
