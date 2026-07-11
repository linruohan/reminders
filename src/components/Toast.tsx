import { useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastProps {
  message: ToastMessage;
  onRemove: (id: string) => void;
}

function ToastItem({ message, onRemove }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(message.id);
    }, 3000);

    return () => clearTimeout(timer);
  }, [message.id, onRemove]);

  const bgColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  }[message.type];

  const icon = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
  }[message.type];

  return (
    <div
      className={`${bgColor} text-white px-4 py-3 rounded-apple-md shadow-lg flex items-center gap-3 min-w-[280px] animate-slide-in`}
      onClick={() => onRemove(message.id)}
    >
      <span className="text-xl">{icon}</span>
      <span className="text-sm font-medium">{message.message}</span>
    </div>
  );
}

interface ToastContainerProps {
  messages: ToastMessage[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ messages, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {messages.map((msg) => (
        <ToastItem key={msg.id} message={msg} onRemove={onRemove} />
      ))}
    </div>
  );
}