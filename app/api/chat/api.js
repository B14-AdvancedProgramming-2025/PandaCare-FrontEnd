const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

export const chatApi = {
  async getChatRoom(pacilianId, caregiverId) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/chat/room/${pacilianId}/${caregiverId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting chat room:', error);
      throw error;
    }
  },

  async getChatRoomById(roomId) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/chat/room/${roomId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting chat room by ID:', error);
      throw error;
    }
  },

  async getMessageHistory(roomId) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/chat/messages/${roomId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting message history:', error);
      throw error;
    }
  }
}; 