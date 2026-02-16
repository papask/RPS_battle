
'use client';

import { useSocket } from '@/components/providers/SocketProvider';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Lobby from '@/components/lobby/Lobby';
import { IPlayerState } from '@/types'; // Ensure IUser/IPlayerState is imported if needed

export default function Home() {
  const socket = useSocket();
  const router = useRouter();
  const [me, setMe] = useState<IPlayerState | null>(null);

  useEffect(() => {
    if (!socket) return;

    // Logic moved to AuthProvider
    // Listening for room_joined is still useful for matchmaking/home redirect

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
      <Lobby />
    </main>
  );
}
