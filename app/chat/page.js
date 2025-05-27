'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';

function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState([]);
  const [messageContent, setMessageContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);

  const stompClientRef = useRef(null);
  const messagesEndRef = useRef(null);

  const roomId = searchParams.get('roomId');
  const recipientId = searchParams.get('recipientId');
  const recipientName = searchParams.get('recipientName');
  const recipientType = searchParams.get('recipientType');

  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const token = localStorage.getItem('token');
    if (!token || isTokenExpired(token)) {
      localStorage.clear();
      setError('Session expired. Please login again.');
      setTimeout(() => {
        router.push('/authentication');
      }, 2000);
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.userId || payload.sub || payload.id || payload.email;
      const userType = payload.role || payload.userType || payload.type;

      setCurrentUser({
        id: userId,
        type: userType
      });
    } catch (error) {
      console.error('Error decoding token:', error);
      setError('Invalid authentication token.');
      return;
    }

    if (!roomId || !recipientId) {
      setError('Invalid chat session. Missing required parameters.');
      return;
    }

    connectWebSocket();

    return () => {
      if (stompClientRef.current && stompClientRef.current.connected) {
        stompClientRef.current.disconnect();
      }
    };
  }, [mounted, roomId, recipientId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const connectWebSocket = () => {
    const socket = new SockJS(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080'}/ws`);
    const stompClient = Stomp.over(socket);

    stompClient.debug = () => { };

    stompClient.connect(
      {},
      (frame) => {
        console.log('Connected to WebSocket');
        setConnected(true);
        setLoading(false);

        stompClient.subscribe(`/topic/chat/${roomId}`, (message) => {
          const messageBody = JSON.parse(message.body);
          console.log('Received message:', messageBody);

          setMessages(prev => [...prev, {
            ...messageBody,
            timestamp: messageBody.timestamp || new Date().toISOString()
          }]);
        });

        stompClient.subscribe(`/app/chat/${roomId}`, (message) => {
          const messageHistory = JSON.parse(message.body);
          console.log('Loaded message history:', messageHistory);
          setMessages(messageHistory);
        });
      },
      (error) => {
        console.error('WebSocket connection error:', error);
        setError('Failed to connect to chat server');
        setLoading(false);
        setConnected(false);
      }
    );

    stompClientRef.current = stompClient;
  };

  const sendMessage = (e) => {
    e.preventDefault();

    if (!messageContent.trim() || !stompClientRef.current || !connected) {
      return;
    }

    const message = {
      sender: currentUser.id,
      recipient: recipientId,
      content: messageContent.trim()
    };

    stompClientRef.current.send(
      `/app/chat/${roomId}`,
      {},
      JSON.stringify(message)
    );

    setMessageContent('');
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';

    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const handleBack = () => {
    const userType = currentUser?.type;
    if (userType === 'CAREGIVER' || userType === 'caregiver') {
      router.push('/scheduling/caregiver');
    } else {
      router.push('/scheduling/pacilian');
    }
  };

  const isTokenExpired = (token) => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp && payload.exp < currentTime;
    } catch {
      return true;
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 rounded-full p-4 mx-auto w-fit mb-4">
            <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={handleBack}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Chat with {recipientName || recipientType || 'User'}
              </h1>
              <p className="text-sm text-gray-500">
                {connected ? 'Online' : 'Connecting...'}
              </p>
            </div>
          </div>
          <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-400'}`} />
        </div>
      </div>

      <div className="flex-1 max-w-4xl mx-auto w-full flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-gray-500">Loading messages...</p>
            </div>
          )}

          {!loading && messages.length === 0 && (
            <div className="text-center py-8">
              <div className="bg-gray-100 rounded-full p-4 mx-auto w-fit mb-4">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-gray-500">No messages yet. Start the conversation!</p>
            </div>
          )}

          {messages.map((message, index) => {
            const isOwnMessage = message.sender === currentUser?.id;

            return (
              <div
                key={index}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${isOwnMessage
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-900'
                    }`}
                >
                  <p className="break-words">{message.content}</p>
                  <p className={`text-xs mt-1 ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={sendMessage} className="p-4 bg-white border-t">
          <div className="flex space-x-4">
            <input
              type="text"
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={!connected}
            />
            <button
              type="submit"
              disabled={!connected || !messageContent.trim()}
              className="px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading chat...</p>
        </div>
      </div>
    }>
      <ChatContent />
    </Suspense>
  );
} 