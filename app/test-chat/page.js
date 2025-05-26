'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TestChat() {
  const router = useRouter();
  const [roomId, setRoomId] = useState('test-room-123');
  const [recipientId, setRecipientId] = useState('recipient-123');
  const [recipientName, setRecipientName] = useState('Test User');
  const [recipientType, setRecipientType] = useState('Caregiver');

  const handleOpenChat = () => {
    const params = new URLSearchParams({
      roomId,
      recipientId,
      recipientName,
      recipientType
    });

    router.push(`/chat?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Test Chat Integration</h1>

        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Room ID
            </label>
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recipient ID
            </label>
            <input
              type="text"
              value={recipientId}
              onChange={(e) => setRecipientId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recipient Name
            </label>
            <input
              type="text"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recipient Type
            </label>
            <select
              value={recipientType}
              onChange={(e) => setRecipientType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Caregiver">Caregiver</option>
              <option value="Pacilian">Pacilian</option>
            </select>
          </div>

          <button
            onClick={handleOpenChat}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
          >
            Open Chat
          </button>
        </div>

        <div className="mt-6 bg-yellow-50 p-4 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> Make sure the backend is running on http://localhost:8080 and you have a valid JWT token in localStorage.
          </p>
        </div>
      </div>
    </div>
  );
} 