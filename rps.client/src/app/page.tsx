'use client';

import { useSocket } from '@/components/providers/SocketProvider';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import HomeView from '@/components/home/HomeView';
import MessageModal from '@/components/ui/MessageModal';

// Server error strings -> localized messages
const ERROR_KEYS: Record<string, string> = {
  'Nickname already taken': 'login.nickname_taken',
  'Invalid nickname': 'login.nickname_invalid',
  'Nickname not allowed': 'login.nickname_reserved',
  'Failed to create user': 'login.create_failed',
};

export default function Home() {
  const socket = useSocket();
  const router = useRouter();
  const { t } = useTranslation();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const closeError = useCallback(() => setErrorMessage(null), []);

  useEffect(() => {
    if (!socket) return;

    socket.on('room_joined', (room: any) => {
      console.log('Joined room:', room);
      router.push(`/room/${room.id}`);
    });

    socket.on('error', (message: string) => {
      setErrorMessage(ERROR_KEYS[message] ? t(ERROR_KEYS[message]) : message);
    });

    return () => {
      socket.off('room_joined');
      socket.off('error');
    };
  }, [socket, router, t]);

  return (
    <main className="w-full">
      <HomeView />
      <MessageModal message={errorMessage} onClose={closeError} />
    </main>
  );
}
