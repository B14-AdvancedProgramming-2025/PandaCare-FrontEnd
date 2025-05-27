'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { chatApi } from '../api/chat/api';

export default function ChatsListPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('');

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
    setUserRole(role);

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

  const getInitials = (id) => {
    return id.substring(0, 2).toUpperCase();
  };

  const getRandomColor = (id) => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500'];
    const index = id.charCodeAt(0) % colors.length;
    return colors[index];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your conversations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <div className="text-red-500 text-center">
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-lg font-semibold">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6">
            <h1 className="text-2xl font-bold text-white flex items-center">
              <svg className="w-8 h-8 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              My Conversations
            </h1>
            <p className="text-blue-100 mt-2">
              {userRole === 'PACILIAN' ? 'Chat with your caregivers' : 'Chat with your patients'}
            </p>
          </div>

          <div className="p-6">
            {rooms.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-24 h-24 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations yet</h3>
                <p className="text-gray-500">
                  {userRole === 'PACILIAN'
                    ? 'Book a consultation to start chatting with caregivers'
                    : 'Accept consultations to start chatting with patients'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {rooms.map(room => {
                  const otherId = userRole === 'PACILIAN' ? room.caregiverId : room.pacilianId;
                  const otherRole = userRole === 'PACILIAN' ? 'Caregiver' : 'Patient';

                  return (
                    <button
                      key={room.roomId}
                      className="w-full text-left p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200 flex items-center space-x-4"
                      onClick={() => openRoom(room)}
                    >
                      <div className={`w-12 h-12 rounded-full ${getRandomColor(otherId)} flex items-center justify-center text-white font-semibold`}>
                        {getInitials(otherId)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-gray-900">{otherRole}</h3>
                          <span className="text-xs text-gray-500">Room #{room.roomId.slice(-6)}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">ID: {otherId.slice(0, 8)}...</p>
                      </div>
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 