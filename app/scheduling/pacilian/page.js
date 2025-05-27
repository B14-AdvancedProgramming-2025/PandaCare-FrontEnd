'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { pacilianApi } from '../../api/scheduling/api';
import { chatApi } from '../../api/chat/api';

export default function PacilianDashboard() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('search');
  const [consultations, setConsultations] = useState([]);
  const [availableCaregivers, setAvailableCaregivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Updated search filters - single date with separate times
  const [filters, setFilters] = useState({
    date: '',
    startTime: '',
    endTime: '',
    specialty: 'all',
    dayOnly: false
  });

  const specialties = [
    'all',
    'Cardiology',
    'Dermatology',
    'Neurology',
    'Pediatrics',
    'Psychiatry',
    'General Medicine'
  ];

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

    // Check if user is Pacilian
    const isPacilian = userType === 'PACILIAN' ||
      userType === 'pacilian' ||
      userType === 'PACILIAN';

    if (!isPacilian) {
      setError(`Access denied. Pacilian access required. Current role: ${userType}`);
      return;
    }

    // Load data based on active tab
    if (activeTab === 'consultations') {
      loadConsultations();
    }
  }, [mounted, activeTab, router]);

  // Format datetime for backend (yyyy-MM-dd HH:mm)
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

  const loadConsultations = async () => {
    setLoading(true);
    setError('');

    try {
      console.log('Loading consultations...');
      const response = await pacilianApi.getConsultations();
      console.log('Consultations response:', response);

      if (response.success) {
        setConsultations(response.consultations || []);
        console.log('Loaded consultations:', response.consultations);
      } else {
        setError(response.message || 'Failed to load consultations');
      }
    } catch (err) {
      console.error('Error loading consultations:', err);
      setError(`Failed to load consultations: ${err.message}`);
    }

    setLoading(false);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    setAvailableCaregivers([]);

    try {
      let startTime, endTime;

      if (filters.dayOnly) {
        // If day only, set time to full day (00:00 to 23:59)
        startTime = formatDateTimeForBackend(filters.date, '00:00');
        endTime = formatDateTimeForBackend(filters.date, '23:59');
      } else {
        // Use specific date and time
        startTime = formatDateTimeForBackend(filters.date, filters.startTime);
        endTime = formatDateTimeForBackend(filters.date, filters.endTime);
      }

      console.log('Search filters:', filters);
      console.log('Formatted times for backend:', { startTime, endTime });

      if (!startTime || !endTime) {
        setError('Please select valid date and times');
        setLoading(false);
        return;
      }

      // Validate time order (only if not day-only search)
      if (!filters.dayOnly) {
        const startTimeObj = new Date(`${filters.date}T${filters.startTime}:00`);
        const endTimeObj = new Date(`${filters.date}T${filters.endTime}:00`);

        if (startTimeObj >= endTimeObj) {
          setError('End time must be after start time');
          setLoading(false);
          return;
        }
      }

      const response = await pacilianApi.findAvailableCaregivers(
        startTime,
        endTime,
        filters.specialty === 'all' ? null : filters.specialty
      );

      console.log('Raw search response:', response);

      if (response.success) {
        console.log('Available caregivers data:', response.caregivers);

        // Debug each caregiver's schedules
        response.caregivers.forEach((caregiver, index) => {
          console.log(`Caregiver ${index} (${caregiver.name}):`, {
            id: caregiver.id,
            name: caregiver.name,
            specialty: caregiver.specialty,
            email: caregiver.email,
            availableSlots: caregiver.availableSlots,
            scheduleCount: caregiver.schedules ? caregiver.availableSlots.length : 0
          });
        });

        setAvailableCaregivers(response.caregivers);
        if (response.caregivers.length === 0) {
          setError('No available caregivers found for the selected criteria');
        }
      } else {
        setError(response.message);
      }
    } catch (err) {
      console.error('Error searching caregivers:', err);
      setError('Failed to search for caregivers');
    }

    setLoading(false);
  };

  const handleBookConsultation = async (caregiver, schedule) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Convert ISO format to backend format (yyyy-MM-dd HH:mm)
      const formatForBackend = (isoDateTime) => {
        try {
          const date = new Date(isoDateTime);
          if (isNaN(date.getTime())) {
            throw new Error('Invalid date');
          }

          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');

          return `${year}-${month}-${day} ${hours}:${minutes}`;
        } catch (error) {
          console.error('Error formatting datetime:', error);
          return '';
        }
      };

      const formattedStartTime = formatForBackend(schedule.startTime);
      const formattedEndTime = formatForBackend(schedule.endTime);

      console.log('Booking consultation:', {
        caregiver: caregiver,
        schedule: schedule,
        originalTimes: {
          startTime: schedule.startTime,
          endTime: schedule.endTime
        },
        formattedTimes: {
          startTime: formattedStartTime,
          endTime: formattedEndTime
        }
      });

      if (!formattedStartTime || !formattedEndTime) {
        setError('Invalid schedule times. Please try again.');
        setLoading(false);
        return;
      }

      const response = await pacilianApi.bookConsultation(
        caregiver.id,
        formattedStartTime,  // Use formatted time
        formattedEndTime     // Use formatted time
      );

      console.log('Booking response:', response);

      if (response.success) {
        setSuccess(`Consultation booked successfully with Dr. ${caregiver.name}`);
        // Refresh the search results to show updated availability
        await handleSearch(new Event('submit'));
        // Also refresh consultations if we're on that tab
        if (activeTab === 'consultations') {
          loadConsultations();
        }
      } else {
        setError(response.message || 'Failed to book consultation');
      }
    } catch (err) {
      console.error('Error booking consultation:', err);
      setError(`Failed to book consultation: ${err.message}`);
    }

    setLoading(false);
  };

  const handleChatWithCaregiver = async (consultation) => {
    try {
      const pacilianId = getCurrentUserId();
      const caregiverId = consultation.caregiverId;

      // Get or create chat room
      const roomResponse = await chatApi.getChatRoom(pacilianId, caregiverId);
      const roomId = roomResponse.roomId;

      // Navigate to chat page with room details
      router.push(`/chat?roomId=${roomId}&recipientId=${caregiverId}&recipientName=${consultation.caregiverName || 'Caregiver'}&recipientType=Caregiver`);
    } catch (error) {
      console.error('Error opening chat:', error);
      setError('Failed to open chat. Please try again.');
    }
  };

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

  // Don't render until mounted
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2">
              Pacilian Dashboard
            </h1>
            <p className="text-gray-600 text-lg">Find and book consultations with caregivers</p>
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
            onClick={() => setActiveTab('search')}
            className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${activeTab === 'search'
              ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg transform scale-105'
              : 'bg-white text-gray-700 hover:bg-gray-50 shadow-md hover:shadow-lg border border-gray-200'
              }`}
          >
            Find Caregivers
          </button>
          <button
            onClick={() => setActiveTab('consultations')}
            className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${activeTab === 'consultations'
              ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg transform scale-105'
              : 'bg-white text-gray-700 hover:bg-gray-50 shadow-md hover:shadow-lg border border-gray-200'
              }`}
          >
            My Consultations
          </button>
        </div>


        {/* Search Tab */}
        {!error.includes('Access denied') && activeTab === 'search' && (
          <div className="space-y-6">
            {/* Search Filters */}
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
              <div className="flex items-center mb-6">
                <div className="bg-gradient-to-r from-green-500 to-green-600 p-3 rounded-xl mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Search Available Caregivers</h2>
                  <p className="text-gray-600">Find the perfect caregiver for your needs</p>
                </div>
              </div>
              <form onSubmit={handleSearch} className="space-y-6">
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
                    value={filters.date}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                    required
                  />
                </div>

                {/* Time Pickers Row - only show if not day-only */}
                {!filters.dayOnly && (
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
                        value={filters.startTime}
                        onChange={(e) => setFilters({ ...filters, startTime: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                        required={!filters.dayOnly}
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
                        value={filters.endTime}
                        onChange={(e) => setFilters({ ...filters, endTime: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                        required={!filters.dayOnly}
                      />
                    </div>
                  </div>
                )}

                {/* Specialty Selector */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    Specialty
                  </label>
                  <select
                    value={filters.specialty}
                    onChange={(e) => setFilters({ ...filters, specialty: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white appearance-none cursor-pointer"
                  >
                    {specialties.map(specialty => (
                      <option key={specialty} value={specialty}>
                        {specialty === 'all' ? 'All Specialties' : specialty}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Duration Info and Controls */}
                <div className="space-y-3">
                  {/* Day Only Checkbox */}
                  <label className="flex items-center cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors">
                    <input
                      type="checkbox"
                      checked={filters.dayOnly}
                      onChange={(e) => setFilters({ ...filters, dayOnly: e.target.checked })}
                      className="h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300 rounded cursor-pointer"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-700">
                      Search entire day (00:00 - 23:59)
                    </span>
                  </label>

                  {/* Duration Info - only show if not day-only and both times are selected */}
                  {!filters.dayOnly && filters.date && filters.startTime && filters.endTime && (
                    <div className="text-sm text-gray-600">
                      {(() => {
                        try {
                          const startTime = new Date(`${filters.date}T${filters.startTime}:00`);
                          const endTime = new Date(`${filters.date}T${filters.endTime}:00`);
                          const durationMinutes = (endTime - startTime) / (1000 * 60);

                          if (durationMinutes <= 0) {
                            return <span className="text-red-500">End time must be after start time</span>;
                          } else {
                            const hours = Math.floor(durationMinutes / 60);
                            const minutes = durationMinutes % 60;
                            return <span className="text-green-600">
                              Search duration: {hours > 0 ? `${hours}h ` : ''}{minutes > 0 ? `${minutes}m` : ''}
                            </span>;
                          }
                        } catch {
                          return null;
                        }
                      })()}
                    </div>
                  )}

                  {/* Search Button */}
                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-4 px-6 rounded-xl hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-semibold text-lg"
                    >
                      {loading ? (
                        <div className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Searching...
                        </div>
                      ) : (
                        <div className="flex items-center justify-center">
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          Search Caregivers
                        </div>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Search Results */}
            {availableCaregivers.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">Available Caregivers ({availableCaregivers.length} found)</h2>

                {/* Debug Info - Updated */}
                <div className="bg-gray-100 p-3 rounded mb-4 text-xs">
                  <strong>Debug Info:</strong>
                  <pre>{JSON.stringify({
                    searchFilters: filters,
                    caregiverCount: availableCaregivers.length,
                    caregiversWithSchedules: availableCaregivers.filter(c => c.availableSlots && c.availableSlots.length > 0).length // Changed
                  }, null, 2)}</pre>
                </div>

                <div className="space-y-4">
                  {availableCaregivers.map((caregiver, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-lg font-medium">{caregiver.name}</h3>
                          <p className="text-gray-600 font-medium">{caregiver.specialty}</p>
                          <p className="text-sm text-gray-500">{caregiver.email}</p>

                          {/* Debug caregiver data */}
                          <details className="mt-2 mb-3">
                            <summary className="text-xs text-gray-400 cursor-pointer">Debug: Show raw caregiver data</summary>
                            <pre className="text-xs bg-gray-50 p-2 mt-1 rounded overflow-auto">
                              {JSON.stringify(caregiver, null, 2)}
                            </pre>
                          </details>

                          {/* Show available schedules - Updated to use availableSlots */}
                          {caregiver.availableSlots && caregiver.availableSlots.length > 0 ? (
                            <div className="mt-4">
                              <h4 className="font-medium text-gray-700 mb-3">Available Time Slots: ({caregiver.availableSlots.length})</h4>
                              <div className="space-y-2">
                                {caregiver.availableSlots.map((schedule, scheduleIndex) => (
                                  <div key={scheduleIndex} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border">
                                    <div className="flex-1">
                                      <div className="text-sm font-medium text-gray-800">
                                        {new Date(schedule.startTime).toLocaleDateString()}
                                      </div>
                                      <div className="text-sm text-gray-600">
                                        {new Date(schedule.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(schedule.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        Duration: {Math.floor((new Date(schedule.endTime) - new Date(schedule.startTime)) / (1000 * 60))} minutes
                                      </div>
                                      {/* Debug schedule data */}
                                      <div className="text-xs text-gray-400 mt-1">
                                        Raw: {schedule.startTime} to {schedule.endTime}
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => handleBookConsultation(caregiver, schedule)}
                                      disabled={loading}
                                      className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                      {loading ? 'Booking...' : 'Book Consultation'}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="mt-4">
                              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <p className="text-sm text-yellow-700">No available time slots for the selected criteria</p>
                                <p className="text-xs text-yellow-600 mt-1">
                                  Schedules data: {caregiver.availableSlots ? `Array with ${caregiver.availableSlots.length} items` : 'null/undefined'}
                                </p>
                                {caregiver.availableSlots && caregiver.availableSlots.length === 0 && (
                                  <p className="text-xs text-yellow-600">Caregiver has no available slots in the response</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Add Rate Caregiver button */}
                        <div className="ml-4">
                          <button
                            onClick={() => router.push(`/rating/pacilian/${caregiver.id}`)}
                            className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-yellow-500 hover:to-yellow-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                          >
                            <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.364 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.364-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                            Rate Caregiver
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Consultations Tab */}
        {!error.includes('Access denied') && activeTab === 'consultations' && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">My Consultations</h2>
            {loading ? (
              <p>Loading consultations...</p>
            ) : consultations.length === 0 ? (
              <p className="text-gray-500">No consultations found</p>
            ) : (
              <div className="space-y-3">
                {consultations.map((consultation, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">Dr. {consultation.caregiverName || consultation.caregiverId}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(consultation.startTime).toLocaleString()} - {new Date(consultation.endTime).toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-500">Status: {consultation.status}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className={`px-3 py-1 rounded text-sm ${consultation.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                        consultation.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                        {consultation.status}
                      </div>
                      {consultation.status === 'ACCEPTED' && (
                        <button
                          onClick={() => handleChatWithCaregiver(consultation)}
                          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 font-medium text-sm"
                        >
                          <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          Chat with Caregiver
                        </button>
                      )}
                      {consultation.status === 'ACCEPTED' && (
                        <button
                          onClick={() => router.push(`/rating/pacilian/${consultation.caregiverId}`)}
                          className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white rounded-lg hover:from-yellow-500 hover:to-yellow-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 font-medium text-sm"
                        >
                          <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.364 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.364-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                          Rate Caregiver
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}