'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { chatApi } from '../api/chat/api';

export default function ChatsListPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Not authenticated');
      setLoading(false);
      return;
    }
    let payload;
    try {
      payload = JSON.parse(atob(token.split('.')[1]));
    } catch {
      setError('Invalid token');
      setLoading(false);
      return;
    }
    const userId = payload.userId || payload.sub;
    const role = payload.role || payload.userType || payload.type;
    const fetchRooms = role === 'PACILIAN'
      ? chatApi.getPacilianChatRooms(userId)
      : chatApi.getCaregiverChatRooms(userId);

    fetchRooms
      .then(response => {
        if (response.success) {
          setRooms(response.rooms || []);
        } else {
          setError(response.message || 'Failed to load chat rooms');
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const openRoom = (room) => {
    const token = localStorage.getItem('token');
    const payload = JSON.parse(atob(token.split('.')[1]));
    const role = payload.role || payload.userType || payload.type;
    const otherId = role === 'PACILIAN' ? room.caregiverId : room.pacilianId;
    router.push(`/chat?roomId=${room.roomId}&recipientId=${otherId}`);
  };

  if (loading) return <p className="p-4">Loading chat rooms...</p>;
  if (error) return <p className="p-4 text-red-500">{error}</p>;

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-xl font-semibold mb-4">My Chat Rooms</h1>
      {rooms.length === 0 ? (
        <p>No chat rooms yet.</p>
      ) : (
        <ul className="space-y-2">
          {rooms.map(room => (
            <li key={room.roomId}>
              <button
                className="w-full text-left px-4 py-2 bg-gray-100 rounded hover:bg-gray-200"
                onClick={() => openRoom(room)}
              >
                Room: {room.roomId}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
} 