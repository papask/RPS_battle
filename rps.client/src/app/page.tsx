'use client';

import { useSocket } from '@/components/providers/SocketProvider';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import HomeView from '@/components/home/HomeView';
import { IPlayerState } from '@/types';

export default function Home() {
  const socket = useSocket();
  const router = useRouter();

  useEffect(() => {
    if (!socket) return;

    socket.on('room_joined', (room: any) => {
      console.log('Joined room:', room);
      router.push(`/room/${room.id}`);
    });

    socket.on('error', (message: string) => {
      alert(`Error: ${message}`);
    });

    return () => {
      socket.off('room_joined');
      socket.off('error');
    };
  }, [socket, router]);

  return (
    <main className="w-full">
      <HomeView />
    </main>
  );
}
