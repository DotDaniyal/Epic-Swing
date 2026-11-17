import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-lg border border-orange-500/40 bg-[#0B1324] px-3.5 py-2 text-xs font-medium text-orange-200 shadow-lg pointer-events-none"
    >
      <WifiOff className="w-3.5 h-3.5 text-orange-400 shrink-0" />
      <span>Offline Ready — Playing from local cache</span>
    </div>
  );
};
