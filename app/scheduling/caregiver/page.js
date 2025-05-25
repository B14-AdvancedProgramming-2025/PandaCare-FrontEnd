'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { caregiverApi } from '../../api/scheduling/api';

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


    // Helper function to get current user ID from token
    const getCurrentUserId = () => {
        if (typeof window === 'undefined') return null;
        
        const token = localStorage.getItem('token');
        if (!token) return null;
        
        try {
            // Decode JWT token to get user ID
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.sub || payload.userId || payload.id || payload.email;
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
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Caregiver Dashboard</h1>
                <button
                        onClick={handleLogout}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
                        Logout
                </button>
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                        {error}
                        {error.includes('Access denied') && (
                            <div className="mt-2">
                                <button 
                                    onClick={() => router.push('/')}
                                    className="text-sm underline"
                                >
                                    Go to Home
                                </button>
                            </div>
                        )}
                    </div>
                )}
                
                {success && (
                    <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                        {success}
                    </div>
                )}

                {/* Tab Navigation */}
                <div className="flex space-x-1 mb-6">
                    <button
                        onClick={() => setActiveTab('schedules')}
                        className={`px-4 py-2 rounded-lg ${
                            activeTab === 'schedules'
                                ? 'bg-blue-500 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                        My Schedules
                    </button>
                    <button
                        onClick={() => setActiveTab('consultations')}
                        className={`px-4 py-2 rounded-lg ${
                            activeTab === 'consultations'
                                ? 'bg-blue-500 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                        Pending Consultations
                    </button>
                </div>

                {/* Enhanced Debug info */}
                {mounted && (
                    <div className="bg-gray-100 p-4 rounded mb-4 text-sm">
                        <p><strong>Debug Info:</strong></p>
                        <p>Active Tab: {activeTab}</p>
                        <p>Loading: {loading.toString()}</p>
                        <p>User ID: {getCurrentUserId()}</p>
                        <details className="mt-2">
                            <summary className="cursor-pointer font-medium">Show localStorage contents</summary>
                            <pre className="mt-2 text-xs bg-white p-2 rounded overflow-auto">
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
                                <div className="bg-white p-6 rounded-lg shadow">
                                    <h2 className="text-xl font-semibold mb-4">Create New Schedule</h2>
                                    <form onSubmit={handleCreateSchedule} className="space-y-4">
                                        {/* Date Picker */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Date
                                            </label>
                                            <input
                                                type="date"
                                                value={newSchedule.date}
                                                min={new Date().toISOString().split('T')[0]} // Today or later
                                                onChange={(e) => setNewSchedule({...newSchedule, date: e.target.value})}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                required
                                            />
                                        </div>

                                        {/* Time Pickers Row */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Start Time
                                                </label>
                                                <input
                                                    type="time"
                                                    value={newSchedule.startTime}
                                                    onChange={(e) => setNewSchedule({...newSchedule, startTime: e.target.value})}
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
                                                    value={newSchedule.endTime}
                                                    onChange={(e) => setNewSchedule({...newSchedule, endTime: e.target.value})}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                        <div>
                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {loading ? 'Creating...' : 'Create Schedule'}
                                            </button>
                                        </div>
                                    </form>
                                </div>

                                {/* Schedules List */}
                                <div className="bg-white p-6 rounded-lg shadow">
                                    <h2 className="text-xl font-semibold mb-4">My Schedules</h2>
                                    {loading ? (
                                        <p>Loading schedules...</p>
                                    ) : schedules.length === 0 ? (
                                        <p className="text-gray-500">No schedules found</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {schedules.map((schedule, index) => (
                                                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                                                    <div>
                                                        <p className="font-medium">
                                                            {new Date(schedule.startTime).toLocaleString()} - {new Date(schedule.endTime).toLocaleString()}
                                                        </p>
                                                        <p className="text-sm text-gray-500">Status: {schedule.status || 'Available'}</p>
                                                    </div>
                                                    <div className="space-x-2">
                                                        <button 
                                                            onClick={() => handleModifySchedule(schedule)}
                                                            disabled={loading}
                                                            className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            Modify
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteSchedule(schedule)}
                                                            disabled={loading}
                                                            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            {loading ? 'Deleting...' : 'Delete'}
                                                        </button>
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
                                                        onChange={(e) => setModifyScheduleData({...modifyScheduleData, date: e.target.value})}
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
                                                            onChange={(e) => setModifyScheduleData({...modifyScheduleData, startTime: e.target.value})}
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
                                                            onChange={(e) => setModifyScheduleData({...modifyScheduleData, endTime: e.target.value})}
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
                            <div className="bg-white p-6 rounded-lg shadow">
                                <h2 className="text-xl font-semibold mb-4">Pending Consultations</h2>
                                {loading ? (
                                    <p>Loading consultations...</p>
                                ) : consultations.length === 0 ? (
                                    <p className="text-gray-500">No pending consultations</p>
                                ) : (
                                    <div className="space-y-3">
                                        {consultations.map((consultation, index) => (
                                            <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                                                <div>
                                                    <p className="font-medium">Patient: {consultation.pacilianName || consultation.pacilianId}</p>
                                                    <p className="text-sm text-gray-600">
                                                        {new Date(consultation.startTime).toLocaleString()} - {new Date(consultation.endTime).toLocaleString()}
                                                    </p>
                                                    <p className="text-sm text-gray-500">Status: {consultation.status}</p>
                                                </div>
                                                {consultation.status === 'PENDING' && (
                                                    <div className="space-x-2">
                                                        <button 
                                                            onClick={() => handleAcceptConsultation(consultation)}
                                                            disabled={loading}
                                                            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            {loading ? 'Processing...' : 'Accept'}
                                                        </button>
                                                        <button 
                                                            onClick={() => handleRejectConsultation(consultation)}
                                                            disabled={loading}
                                                            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            {loading ? 'Processing...' : 'Reject'}
                                                        </button>
                                                    </div>
                                                )}
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