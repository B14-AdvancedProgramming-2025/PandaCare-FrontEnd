'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { caregiverApi } from '../../api/scheduling/api';
import { chatApi } from '../../api/chat/api';

export default function CaregiverDashboard() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('schedules');
  const [schedules, setSchedules] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Create schedule form state
  const [newSchedule, setNewSchedule] = useState({
    date: '',
    startTime: '',
    endTime: ''
  });

  const [modifyingSchedule, setModifyingSchedule] = useState(null);
  const [modifyScheduleData, setModifyScheduleData] = useState({
    date: '',
    startTime: '',
    endTime: ''
  });

  // Handle client-side mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Check localStorage keys and values
    const allKeys = Object.keys(localStorage);
    console.log('All localStorage keys:', allKeys);

    let token = localStorage.getItem('token');
    let userType = null;

    console.log('Token found:', !!token);

    if (!token || isTokenExpired(token)) {
      localStorage.clear(); // Clear expired session
      setError('Session expired. Please login again.');
      setTimeout(() => {
        router.push('/authentication');
      }, 2000);
      return;
    }

    // Decode JWT token to get role
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      console.log('Decoded JWT payload:', payload);
      userType = payload.role || payload.userType || payload.type;

      // Store userType in localStorage for future use
      if (userType) {
        localStorage.setItem('userType', userType);
      }
    } catch (error) {
      console.error('Error decoding JWT token:', error);
      setError('Invalid authentication token. Please login again.');
      setTimeout(() => {
        router.push('/authentication');
      }, 2000);
      return;
    }

    console.log('Final user type:', userType);

    // Check if user is caregiver
    const isCaregiver = userType === 'CAREGIVER' ||
      userType === 'caregiver' ||
      userType === 'ROLE_CAREGIVER';

    if (!isCaregiver) {
      setError(`Access denied. Caregiver access required. Current role: ${userType}`);
      return;
    }

    loadData();
  }, [mounted, activeTab, router]);

  // Don't render until mounted (avoid hydration mismatch)
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

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      if (activeTab === 'schedules') {
        console.log('Loading schedules...');
        const response = await caregiverApi.getSchedules();
        console.log('Schedules response:', response);

        if (response.success) {
          setSchedules(response.schedules || []);
        } else {
          setError(response.message || 'Failed to load schedules');
        }
      } else if (activeTab === 'consultations') {
        console.log('Loading consultations...');
        const response = await caregiverApi.getConsultations();
        console.log('Consultations response:', response);

        if (response.success) {
          setConsultations(response.consultations || []);
        } else {
          setError(response.message || 'Failed to load consultations');
        }
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError(`Failed to load data: ${err.message}`);
    }

    setLoading(false);
  };

  // Helper function to format datetime for backend
  const formatDateTimeForBackend = (date, time) => {
    if (!date || !time) return '';

    try {
      // Combine date and time, then parse
      const dateTimeString = `${date}T${time}:00`; // Add seconds for parsing
      const dateObj = new Date(dateTimeString);

      if (isNaN(dateObj.getTime())) {
        console.error('Invalid date/time:', date, time);
        return '';
      }

      // Format as yyyy-MM-dd HH:mm (backend format)
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      const hours = String(dateObj.getHours()).padStart(2, '0');
      const minutes = String(dateObj.getMinutes()).padStart(2, '0');

      return `${year}-${month}-${day} ${hours}:${minutes}`;

    } catch (error) {
      console.error('Error formatting date/time:', error);
      return '';
    }
  };

  // Function to combine date and time
  const combineDateTime = (date, time) => {
    if (!date || !time) return '';
    return `${date} ${time}`;
  };

  const parseScheduleDateTime = (scheduleTimeStr) => {
    try {
      // If it's already ISO format, use it directly
      if (scheduleTimeStr.includes('T')) {
        return {
          date: scheduleTimeStr.split('T')[0],
          time: scheduleTimeStr.split('T')[1].substring(0, 5)
        };
      }

      // Otherwise, parse as Date object and extract components
      const date = new Date(scheduleTimeStr);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date format');
      }

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');

      return {
        date: `${year}-${month}-${day}`,
        time: `${hours}:${minutes}`
      };
    } catch (error) {
      console.error('Error parsing schedule time:', error, 'Input:', scheduleTimeStr);
      return { date: '', time: '' };
    }
  };

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const formattedStartTime = formatDateTimeForBackend(newSchedule.date, newSchedule.startTime);
      const formattedEndTime = formatDateTimeForBackend(newSchedule.date, newSchedule.endTime);

      console.log('Schedule inputs:', newSchedule);
      console.log('Formatted times:', formattedStartTime, formattedEndTime);

      if (!formattedStartTime || !formattedEndTime) {
        setError('Please select valid date and times');
        setLoading(false);
        return;
      }

      // Validate time order
      const startTime = new Date(`${newSchedule.date}T${newSchedule.startTime}:00`);
      const endTime = new Date(`${newSchedule.date}T${newSchedule.endTime}:00`);

      if (startTime >= endTime) {
        setError('End time must be after start time');
        setLoading(false);
        return;
      }

      // Validate duration (max 2 hours)
      const durationHours = (endTime - startTime) / (1000 * 60 * 60);
      if (durationHours > 2) {
        setError('Schedule duration cannot exceed 2 hours');
        setLoading(false);
        return;
      }

      const response = await caregiverApi.createSchedule(formattedStartTime, formattedEndTime);
      console.log('Create schedule response:', response);

      if (response.success) {
        setSuccess('Schedule created successfully');
        setNewSchedule({ date: '', startTime: '', endTime: '' });
        loadData();
      } else {
        setError(response.message || 'Failed to create schedule');
      }
    } catch (err) {
      console.error('Error creating schedule:', err);
      setError(`Failed to create schedule: ${err.message}`);
    }

    setLoading(false);
  };

  const handleAcceptConsultation = async (consultation) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Format the times for backend
      const formattedStartTime = formatDateTimeForBackend(
        consultation.startTime.split('T')[0],
        consultation.startTime.split('T')[1].substring(0, 5)
      );
      const formattedEndTime = formatDateTimeForBackend(
        consultation.endTime.split('T')[0],
        consultation.endTime.split('T')[1].substring(0, 5)
      );

      console.log('Accepting consultation:', {
        consultation,
        formattedStartTime,
        formattedEndTime
      });

      const response = await caregiverApi.acceptConsultation(
        consultation.pacilianId,
        formattedStartTime,
        formattedEndTime
      );

      if (response.success) {
        setSuccess('Consultation accepted successfully');
        loadData(); // Reload consultations
      } else {
        setError(response.message || 'Failed to accept consultation');
      }
    } catch (err) {
      console.error('Error accepting consultation:', err);
      setError(`Failed to accept consultation: ${err.message}`);
    }

    setLoading(false);
  };

  const handleRejectConsultation = async (consultation) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Format the times for backend
      const formattedStartTime = formatDateTimeForBackend(
        consultation.startTime.split('T')[0],
        consultation.startTime.split('T')[1].substring(0, 5)
      );
      const formattedEndTime = formatDateTimeForBackend(
        consultation.endTime.split('T')[0],
        consultation.endTime.split('T')[1].substring(0, 5)
      );

      console.log('Rejecting consultation:', {
        consultation,
        formattedStartTime,
        formattedEndTime
      });

      const response = await caregiverApi.rejectConsultation(
        consultation.pacilianId,
        formattedStartTime,
        formattedEndTime
      );

      if (response.success) {
        setSuccess('Consultation rejected successfully');
        loadData(); // Reload consultations
      } else {
        setError(response.message || 'Failed to reject consultation');
      }
    } catch (err) {
      console.error('Error rejecting consultation:', err);
      setError(`Failed to reject consultation: ${err.message}`);
    }

    setLoading(false);
  };

  const handleDeleteSchedule = async (schedule) => {
    if (!window.confirm('Are you sure you want to delete this schedule?')) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      console.log('Delete schedule input:', schedule);

      // Parse the schedule times properly
      const startParsed = parseScheduleDateTime(schedule.startTime);
      const endParsed = parseScheduleDateTime(schedule.endTime);

      console.log('Parsed times:', { startParsed, endParsed });

      if (!startParsed.date || !startParsed.time || !endParsed.date || !endParsed.time) {
        throw new Error('Failed to parse schedule times');
      }

      // Format for backend
      const formattedStartTime = formatDateTimeForBackend(startParsed.date, startParsed.time);
      const formattedEndTime = formatDateTimeForBackend(endParsed.date, endParsed.time);

      console.log('Deleting schedule:', {
        schedule,
        formattedStartTime,
        formattedEndTime
      });

      const response = await caregiverApi.deleteSchedule(
        formattedStartTime,
        formattedEndTime
      );

      if (response.success) {
        setSuccess('Schedule deleted successfully');
        loadData(); // Reload schedules
      } else {
        setError(response.message || 'Failed to delete schedule');
      }
    } catch (err) {
      console.error('Error deleting schedule:', err);
      setError(`Failed to delete schedule: ${err.message}`);
    }

    setLoading(false);
  };

  const handleModifySchedule = (schedule) => {
    console.log('Modifying schedule:', schedule);

    // Parse the schedule times
    const startParsed = parseScheduleDateTime(schedule.startTime);
    const endParsed = parseScheduleDateTime(schedule.endTime);

    setModifyingSchedule(schedule);
    setModifyScheduleData({
      date: startParsed.date,
      startTime: startParsed.time,
      endTime: endParsed.time
    });
  };

  const handleSubmitModifySchedule = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Parse original schedule times
      const originalStartParsed = parseScheduleDateTime(modifyingSchedule.startTime);
      const originalEndParsed = parseScheduleDateTime(modifyingSchedule.endTime);

      // Format original times for backend
      const originalStartTime = formatDateTimeForBackend(originalStartParsed.date, originalStartParsed.time);
      const originalEndTime = formatDateTimeForBackend(originalEndParsed.date, originalEndParsed.time);

      // Format new times for backend
      const newStartTime = formatDateTimeForBackend(modifyScheduleData.date, modifyScheduleData.startTime);
      const newEndTime = formatDateTimeForBackend(modifyScheduleData.date, modifyScheduleData.endTime);

      console.log('Modify schedule request:', {
        original: { originalStartTime, originalEndTime },
        new: { newStartTime, newEndTime }
      });

      if (!originalStartTime || !originalEndTime || !newStartTime || !newEndTime) {
        setError('Please select valid date and times');
        setLoading(false);
        return;
      }

      // Validate new time order
      const startTime = new Date(`${modifyScheduleData.date}T${modifyScheduleData.startTime}:00`);
      const endTime = new Date(`${modifyScheduleData.date}T${modifyScheduleData.endTime}:00`);

      if (startTime >= endTime) {
        setError('End time must be after start time');
        setLoading(false);
        return;
      }

      // Validate duration (max 2 hours)
      const durationHours = (endTime - startTime) / (1000 * 60 * 60);
      if (durationHours > 2) {
        setError('Schedule duration cannot exceed 2 hours');
        setLoading(false);
        return;
      }

      const response = await caregiverApi.modifySchedule(
        originalStartTime,
        originalEndTime,
        newStartTime,
        newEndTime
      );

      if (response.success) {
        setSuccess('Schedule modified successfully');
        setModifyingSchedule(null);
        setModifyScheduleData({ date: '', startTime: '', endTime: '' });
        loadData();
      } else {
        setError(response.message || 'Failed to modify schedule');
      }
    } catch (err) {
      console.error('Error modifying schedule:', err);
      setError(`Failed to modify schedule: ${err.message}`);
    }

    setLoading(false);
  };

  const cancelModifySchedule = () => {
    setModifyingSchedule(null);
    setModifyScheduleData({ date: '', startTime: '', endTime: '' });
  };

  const handleChatWithPacilian = async (consultation) => {
    try {
      const caregiverId = getCurrentUserId();
      const pacilianId = consultation.pacilianId;

      // Get or create chat room
      const roomResponse = await chatApi.getChatRoom(pacilianId, caregiverId);
      const roomId = roomResponse.roomId;

      // Navigate to chat page with room details
      router.push(`/chat?roomId=${roomId}&recipientId=${pacilianId}&recipientName=${consultation.pacilianName || 'Pacilian'}&recipientType=Pacilian`);
    } catch (error) {
      console.error('Error opening chat:', error);
      setError('Failed to open chat. Please try again.');
    }
  };

  // Helper function to get current user ID from token
  const getCurrentUserId = () => {
    if (typeof window === 'undefined') return null;

    const token = localStorage.getItem('token');
    if (!token) return null;

    try {
      // Decode JWT token to get user ID
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.userId || payload.sub || payload.id || payload.email;
    } catch (error) {
      console.error('Error decoding token:', error);
      return localStorage.getItem('userId'); // Fallback
    }
  };

  // Debug function to show all localStorage contents
  const debugLocalStorage = () => {
    const debug = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      debug[key] = localStorage.getItem(key);
    }
    return debug;
  };

  const handleLogout = () => {
    // Clear all localStorage
    localStorage.clear();

    // Redirect to login
    router.push('/authentication');
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


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
              Caregiver Dashboard
            </h1>
            <p className="text-gray-600 text-lg">Manage your schedules and consultations</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-medium">
            <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-6 rounded-r-xl mb-6 shadow-sm">
            <div className="flex items-start">
              <svg className="w-6 h-6 text-red-400 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-red-800 font-medium leading-relaxed">{error}</p>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border-l-4 border-green-400 p-6 rounded-r-xl mb-6 shadow-sm">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-green-800 font-medium">{success}</p>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex space-x-2 mb-8">
          <button
            onClick={() => setActiveTab('schedules')}
            className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${activeTab === 'schedules'
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg transform scale-105'
              : 'bg-white text-gray-700 hover:bg-gray-50 shadow-md hover:shadow-lg border border-gray-200'
              }`}
          >
            <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            My Schedules
          </button>
          <button
            onClick={() => setActiveTab('consultations')}
            className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${activeTab === 'consultations'
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg transform scale-105'
              : 'bg-white text-gray-700 hover:bg-gray-50 shadow-md hover:shadow-lg border border-gray-200'
              }`}
          >
            <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
            Pending Consultations
          </button>
        </div>

        {/* Enhanced Debug info */}
        {mounted && (
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 p-6 rounded-xl mb-6 text-sm shadow-sm">
            <div className="flex items-center mb-3">
              <svg className="w-5 h-5 text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="font-semibold text-gray-700">Debug Information</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-white p-3 rounded-lg border">
                <p className="text-gray-600 text-xs uppercase tracking-wide">Active Tab</p>
                <p className="font-medium text-gray-900">{activeTab}</p>
              </div>
              <div className="bg-white p-3 rounded-lg border">
                <p className="text-gray-600 text-xs uppercase tracking-wide">Loading Status</p>
                <p className="font-medium text-gray-900">{loading.toString()}</p>
              </div>
              <div className="bg-white p-3 rounded-lg border">
                <p className="text-gray-600 text-xs uppercase tracking-wide">User ID</p>
                <p className="font-medium text-gray-900 truncate">{getCurrentUserId()}</p>
              </div>
            </div>
            <details className="mt-4">
              <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900 transition-colors">Show localStorage contents</summary>
              <pre className="mt-3 text-xs bg-white p-4 rounded-lg border overflow-auto max-h-40">
                {JSON.stringify(debugLocalStorage(), null, 2)}
              </pre>
            </details>
          </div>
        )}

        {/* Only show content if not in error state */}
        {!error.includes('Access denied') && (
          <>
            {/* Schedules Tab */}
            {activeTab === 'schedules' && (
              <div className="space-y-6">
                {/* Create Schedule Form */}
                <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
                  <div className="flex items-center mb-6">
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-3 rounded-xl mr-4">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Create New Schedule</h2>
                      <p className="text-gray-600">Set your availability for consultations</p>
                    </div>
                  </div>
                  <form onSubmit={handleCreateSchedule} className="space-y-6">
                    {/* Date Picker */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Date
                      </label>
                      <input
                        type="date"
                        value={newSchedule.date}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setNewSchedule({ ...newSchedule, date: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                        required
                      />
                    </div>

                    {/* Time Pickers Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Start Time
                        </label>
                        <input
                          type="time"
                          value={newSchedule.startTime}
                          onChange={(e) => setNewSchedule({ ...newSchedule, startTime: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          End Time
                        </label>
                        <input
                          type="time"
                          value={newSchedule.endTime}
                          onChange={(e) => setNewSchedule({ ...newSchedule, endTime: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                          required
                        />
                      </div>
                    </div>

                    {/* Duration Info */}
                    {newSchedule.date && newSchedule.startTime && newSchedule.endTime && (
                      <div className="text-sm text-gray-600">
                        {(() => {
                          try {
                            const startTime = new Date(`${newSchedule.date}T${newSchedule.startTime}:00`);
                            const endTime = new Date(`${newSchedule.date}T${newSchedule.endTime}:00`);
                            const durationMinutes = (endTime - startTime) / (1000 * 60);

                            if (durationMinutes <= 0) {
                              return <span className="text-red-500">End time must be after start time</span>;
                            } else if (durationMinutes > 120) {
                              return <span className="text-red-500">Duration cannot exceed 2 hours</span>;
                            } else {
                              const hours = Math.floor(durationMinutes / 60);
                              const minutes = durationMinutes % 60;
                              return <span className="text-green-600">
                                Duration: {hours > 0 ? `${hours}h ` : ''}{minutes > 0 ? `${minutes}m` : ''}
                              </span>;
                            }
                          } catch {
                            return null;
                          }
                        })()}
                      </div>
                    )}

                    {/* Submit Button */}
                    <div className="pt-4">
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-4 px-6 rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-semibold text-lg"
                      >
                        {loading ? (
                          <div className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Creating...
                          </div>
                        ) : (
                          <div className="flex items-center justify-center">
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Create Schedule
                          </div>
                        )}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Schedules List */}
                <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
                  <div className="flex items-center mb-6">
                    <div className="bg-gradient-to-r from-green-500 to-green-600 p-3 rounded-xl mr-4">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">My Schedules</h2>
                      <p className="text-gray-600">View and manage your availability</p>
                    </div>
                  </div>
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="flex items-center space-x-3">
                        <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="text-gray-600 font-medium">Loading schedules...</p>
                      </div>
                    </div>
                  ) : schedules.length === 0 ? (
                    <div className="text-center py-12">
                      <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <p className="text-gray-500 text-lg font-medium">No schedules found</p>
                      <p className="text-gray-400 mt-2">Create your first schedule to get started</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {schedules.map((schedule, index) => (
                        <div key={index} className="bg-gradient-to-r from-gray-50 to-white p-6 border border-gray-200 rounded-xl hover:shadow-lg transition-all duration-200">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center mb-2">
                                <svg className="w-5 h-5 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p className="font-semibold text-gray-900 text-lg">
                                  {new Date(schedule.startTime).toLocaleString()} - {new Date(schedule.endTime).toLocaleString()}
                                </p>
                              </div>
                              <div className="flex items-center">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${schedule.status === 'Available' || !schedule.status
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                  <span className={`w-2 h-2 rounded-full mr-2 ${schedule.status === 'Available' || !schedule.status
                                    ? 'bg-green-400'
                                    : 'bg-yellow-400'
                                    }`}></span>
                                  {schedule.status || 'Available'}
                                </span>
                              </div>
                            </div>
                            <div className="flex space-x-3 ml-6">
                              <button
                                onClick={() => handleModifySchedule(schedule)}
                                disabled={loading}
                                className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white rounded-lg hover:from-yellow-500 hover:to-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 font-medium"
                              >
                                <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Modify
                              </button>
                              <button
                                onClick={() => handleDeleteSchedule(schedule)}
                                disabled={loading}
                                className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 font-medium"
                              >
                                <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                {loading ? 'Deleting...' : 'Delete'}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {modifyingSchedule && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold mb-4">Modify Schedule</h3>
                        <form onSubmit={handleSubmitModifySchedule} className="space-y-4">
                          {/* Date Picker */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Date
                            </label>
                            <input
                              type="date"
                              value={modifyScheduleData.date}
                              min={new Date().toISOString().split('T')[0]}
                              onChange={(e) => setModifyScheduleData({ ...modifyScheduleData, date: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              required
                            />
                          </div>

                          {/* Time Pickers */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Start Time
                              </label>
                              <input
                                type="time"
                                value={modifyScheduleData.startTime}
                                onChange={(e) => setModifyScheduleData({ ...modifyScheduleData, startTime: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                End Time
                              </label>
                              <input
                                type="time"
                                value={modifyScheduleData.endTime}
                                onChange={(e) => setModifyScheduleData({ ...modifyScheduleData, endTime: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                              />
                            </div>
                          </div>

                          {/* Duration Info */}
                          {modifyScheduleData.date && modifyScheduleData.startTime && modifyScheduleData.endTime && (
                            <div className="text-sm text-gray-600">
                              {(() => {
                                try {
                                  const startTime = new Date(`${modifyScheduleData.date}T${modifyScheduleData.startTime}:00`);
                                  const endTime = new Date(`${modifyScheduleData.date}T${modifyScheduleData.endTime}:00`);
                                  const durationMinutes = (endTime - startTime) / (1000 * 60);

                                  if (durationMinutes <= 0) {
                                    return <span className="text-red-500">End time must be after start time</span>;
                                  } else if (durationMinutes > 120) {
                                    return <span className="text-red-500">Duration cannot exceed 2 hours</span>;
                                  } else {
                                    const hours = Math.floor(durationMinutes / 60);
                                    const minutes = durationMinutes % 60;
                                    return <span className="text-green-600">
                                      Duration: {hours > 0 ? `${hours}h ` : ''}{minutes > 0 ? `${minutes}m` : ''}
                                    </span>;
                                  }
                                } catch {
                                  return null;
                                }
                              })()}
                            </div>
                          )}

                          {/* Buttons */}
                          <div className="flex space-x-2 pt-4">
                            <button
                              type="submit"
                              disabled={loading}
                              className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {loading ? 'Modifying...' : 'Save Changes'}
                            </button>
                            <button
                              type="button"
                              onClick={cancelModifySchedule}
                              disabled={loading}
                              className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Consultations Tab */}
            {activeTab === 'consultations' && (
              <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
                <div className="flex items-center mb-6">
                  <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-3 rounded-xl mr-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Pending Consultations</h2>
                    <p className="text-gray-600">Review and respond to consultation requests</p>
                  </div>
                </div>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex items-center space-x-3">
                      <svg className="animate-spin h-8 w-8 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <p className="text-gray-600 font-medium">Loading consultations...</p>
                    </div>
                  </div>
                ) : consultations.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                    <p className="text-gray-500 text-lg font-medium">No pending consultations</p>
                    <p className="text-gray-400 mt-2">New consultation requests will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {consultations.map((consultation, index) => (
                      <div key={index} className="bg-gradient-to-r from-gray-50 to-white p-6 border border-gray-200 rounded-xl hover:shadow-lg transition-all duration-200">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center mb-3">
                              <svg className="w-5 h-5 text-purple-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              <p className="font-semibold text-gray-900 text-lg">Patient: {consultation.pacilianName || consultation.pacilianId}</p>
                            </div>
                            <div className="flex items-center mb-2">
                              <svg className="w-4 h-4 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <p className="text-gray-700 font-medium">
                                {new Date(consultation.startTime).toLocaleString()} - {new Date(consultation.endTime).toLocaleString()}
                              </p>
                            </div>
                            <div className="flex items-center">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${consultation.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                consultation.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                <span className={`w-2 h-2 rounded-full mr-2 ${consultation.status === 'PENDING' ? 'bg-yellow-400' :
                                  consultation.status === 'ACCEPTED' ? 'bg-green-400' :
                                    'bg-red-400'
                                  }`}></span>
                                {consultation.status}
                              </span>
                            </div>
                          </div>
                          {consultation.status === 'PENDING' && (
                            <div className="flex space-x-3 ml-6">
                              <button
                                onClick={() => handleAcceptConsultation(consultation)}
                                disabled={loading}
                                className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 font-medium"
                              >
                                <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                {loading ? 'Processing...' : 'Accept'}
                              </button>
                              <button
                                onClick={() => handleRejectConsultation(consultation)}
                                disabled={loading}
                                className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 font-medium"
                              >
                                <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                {loading ? 'Processing...' : 'Reject'}
                              </button>
                            </div>
                          )}
                          {consultation.status === 'ACCEPTED' && (
                            <div className="flex space-x-3 ml-6">
                              <button
                                onClick={() => handleChatWithPacilian(consultation)}
                                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 font-medium"
                              >
                                <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                Chat with Pacilian
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}