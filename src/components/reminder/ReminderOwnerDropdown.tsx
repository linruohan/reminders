import { memo } from 'react';
import type { OwnerResponse } from '@/types/api';

interface ReminderOwnerDropdownProps {
  editOwnerId: string;
  owners: OwnerResponse[];
  onOwnerChange: (ownerId: string) => void;
  onClose: () => void;
}

export const ReminderOwnerDropdown = memo(function ReminderOwnerDropdown({
  editOwnerId,
  owners,
  onOwnerChange,
  onClose,
}: ReminderOwnerDropdownProps) {
  return (
    <div className="w-max min-w-[100px] bg-white rounded-apple-lg shadow-lg border border-apple-divider py-1">
      <button
        type="button"
        onClick={() => { onOwnerChange(''); onClose(); }}
        className={`block w-full text-left px-4 py-2 text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${
          !editOwnerId ? 'bg-apple-blue/10 text-apple-blue' : 'text-gray-700 hover:bg-gray-50'
        }`}
      >
        未分配
      </button>
      {owners.map(owner => (
        <button
          key={owner.id}
          type="button"
          onClick={() => { onOwnerChange(owner.id); onClose(); }}
          className={`block w-full text-left px-4 py-2 text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${
            editOwnerId === owner.id ? 'bg-apple-blue/10 text-apple-blue' : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: owner.color || '#5856D6' }} />
          {owner.name}
        </button>
      ))}
    </div>
  );
});
