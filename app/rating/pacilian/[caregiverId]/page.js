'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PacilianRatingPage() {
  const { caregiverId } = useParams();
  const router = useRouter();
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [doctorInfo, setDoctorInfo] = useState(null);
  const [success, setSuccess] = useState('');
  
  // Form state for new rating
  const [newRating, setNewRating] = useState({
    value: 5,
    comment: '',
  });
  
  // Edit mode state
  const [editMode, setEditMode] = useState(false);
  const [editRatingId, setEditRatingId] = useState(null);
  const [editRating, setEditRating] = useState({
    value: 5,
    comment: '',
  });
  
  useEffect(() => {
    // Get user info from JWT token instead of userInfo
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/authentication');
        return;
      }
      
      if (token && token.includes('.')) {
        const parts = token.split('.');
        if (parts.length === 3) {
          const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
          const paddedBase64 = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
          const jsonPayload = atob(paddedBase64);
          const decodedData = JSON.parse(jsonPayload);
          
          // Tunggu Promise selesai sebelum mengatur state
          fetchUserIdByEmail(decodedData.sub).then(id => {
            setUserInfo({
              id: id,  // Sekarang ini string, bukan Promise
              name: decodedData.name || decodedData.sub || 'User',
              role: decodedData.role || decodedData.roles || 'USER',
              email: decodedData.email || decodedData.sub,
            });
          });
          
          // Check if user is a PACILIAN (case insensitive)
          const userRole = (decodedData.role || decodedData.roles || '').toUpperCase();
          if (userRole !== 'PACILIAN' && userRole !== 'PACILIANS') {
            setError('Access denied. Only Pacilians can submit ratings.');
          }
        }
      } else {
        router.push('/authentication');
        return;
      }
    } catch (err) {
      console.error('Failed to parse token:', err);
      setUserInfo({});
    }
    
    // Fetch ratings for this caregiver
    fetchCaregiverRatings();
    
    // Fetch doctor info
    fetchDoctorInfo();
  }, [caregiverId, router]);
  
  const fetchDoctorInfo = async () => {
    try {
      // Try to get doctor info
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/ratings/doctor/${caregiverId}`);
      
      if (response.ok) {
        const data = await response.json();
        
        // Extract caregiverName from response
        let caregiverName = null;
        
        if (data && data.data && data.data.length > 0) {
          // If response has data array, get name from first item
          caregiverName = data.data[0].caregiverName;
        } else if (Array.isArray(data) && data.length > 0) {
          // If response is direct array, get name from first item
          caregiverName = data[0].caregiverName;
        } else if (data && data.caregiverName) {
          // If response has direct caregiverName property
          caregiverName = data.caregiverName;
        }
        
        // Set doctor info with proper name
        setDoctorInfo({
          id: caregiverId,
          name: caregiverName || `Doctor ${caregiverId.substring(0, 8)}...`,
          specialization: "Healthcare Provider"
        });
      } else {
        console.warn(`Couldn't fetch doctor info: ${response.status}`);
        // Set default info based on the ID
        setDoctorInfo({
          id: caregiverId,
          name: `Doctor ${caregiverId.substring(0, 8)}...`,
          specialization: "Healthcare Provider"
        });
      }
    } catch (err) {
      console.error("Error fetching doctor info:", err);
      // Set default info on error
      setDoctorInfo({
        id: caregiverId,
        name: `Doctor ${caregiverId.substring(0, 8)}...`,
        specialization: "Healthcare Provider"
      });
    }
  };

  const fetchUserIdByEmail = async (email) => {
    if (!email) return;
    
    try {
      // Get the token from localStorage within this function
      const token = localStorage.getItem('token');
      if (!token) {
        console.error("No token found in localStorage");
        return;
      }
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/ratings/id/${email}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Rest of your function remains the same
      if (response.ok) {
        const data = await response.json();
        
        // Extract ID from response - handle different possible response formats
        let id = data.data
        
        if (id) {
          return id; // Return the ID instead of calling setUserId
        } else {
          return null;
        }
      } else {
        console.error(`Failed to fetch user ID: ${response.status} ${response.statusText}`);
        return null;
      }
    } catch (err) {
      console.error("Error fetching user ID:", err);
      return null;
    }
  };
  
  const fetchCaregiverRatings = async () => {
    try {
      setLoading(true);
      
      // Real API call
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/ratings/doctor/${caregiverId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch ratings: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Handle different possible response formats
      let ratingsArray;
      if (Array.isArray(data)) {
        ratingsArray = data;
      } else if (data && typeof data === 'object') {
        // Try to extract ratings from common response formats
        ratingsArray = data.data || data.ratings || data.content || [];
      } else {
        ratingsArray = [];
      }
      
      // Ensure it's an array
      if (!Array.isArray(ratingsArray)) {
        console.error('API did not return an array:', ratingsArray);
        ratingsArray = [];
      }
      
      setRatings(ratingsArray);
    } catch (err) {
      console.error('Error fetching ratings:', err);
      setError(err.message || 'Failed to load ratings');
      setRatings([]); // Reset to empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewRating(prev => ({
      ...prev,
      [name]: name === 'value' ? parseInt(value) : value
    }));
  };
  
  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditRating(prev => ({
      ...prev,
      [name]: name === 'value' ? parseInt(value) : value
    }));
  };

  const submitRating = async (e) => {
    e.preventDefault();
    
    if (!userInfo?.id) {
      setError("You must be logged in to submit a rating");
      return;
    }
    
    // Check if user has PACILIAN role (case insensitive)
    const userRole = (userInfo.role || '').toUpperCase();
    if (userRole !== 'PACILIAN' && userRole !== 'PACILIANS') {
      setError("Only Pacilians can submit ratings for caregivers");
      return;
    }
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/ratings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          caregiverId: caregiverId,
          pacilianEmail: userInfo.name,
          value: newRating.value,
          comment: newRating.comment
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to submit rating');
      }
      
      // Reset form and refresh ratings
      setNewRating({ value: 5, comment: '' });
      setSuccess('Your rating has been submitted successfully!');
      fetchCaregiverRatings();
    } catch (err) {
      console.error('Error submitting rating:', err);
      setError(err.message || 'An error occurred while submitting your rating');
    }
  };
  
  const startEditRating = (rating) => {
    setEditMode(true);
    setEditRatingId(rating.id);
    setEditRating({
      value: rating.value || 5,
      comment: rating.comment || ''
    });
  };
  
  const cancelEditRating = () => {
    setEditMode(false);
    setEditRatingId(null);
    setEditRating({ value: 5, comment: '' });
  };
  
  const updateRating = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/ratings/${editRatingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          value: editRating.value,
          comment: editRating.comment
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update rating');
      }
      
      // Reset edit mode and refresh ratings
      cancelEditRating();
      setSuccess('Your rating has been updated successfully!');
      fetchCaregiverRatings();
    } catch (err) {
      console.error('Error updating rating:', err);
      setError(err.message || 'An error occurred while updating your rating');
    }
  };
  
  const deleteRating = async (ratingId) => {
    if (!confirm('Are you sure you want to delete this rating?')) {
      return;
    }
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/ratings/${ratingId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to delete rating');
      }
      
      setSuccess('Your rating has been deleted successfully!');
      fetchCaregiverRatings();
    } catch (err) {
      console.error('Error deleting rating:', err);
      setError(err.message || 'An error occurred while deleting your rating');
    }
  };

  // Calculate if user has already submitted a rating - with safety check
  const userHasRated = Array.isArray(ratings) && 
    ratings.some(rating => rating && rating.pacilianId === userInfo?.id);
  
  // Calculate average rating - with safety check
  const averageRating = Array.isArray(ratings) && ratings.length > 0 
    ? (ratings.reduce((sum, rating) => sum + (rating?.value || 0), 0) / ratings.length).toFixed(1)
    : '0.0';

  // Function to render stars based on rating value
  const renderStars = (value) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg 
            key={star} 
            className={`w-5 h-5 ${star <= value ? "text-yellow-400" : "text-gray-300"}`} 
            fill="currentColor" 
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    );
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/authentication');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading ratings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
              {doctorInfo?.name || 'Doctor Profile'}
            </h1>
            <p className="text-gray-600 text-lg">
              {doctorInfo?.specialization || 'Healthcare Professional'} • Rating & Reviews
            </p>
          </div>
          <div className="flex space-x-4">
            <Link 
              href="/rating/pacilian" 
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-medium"
            >
              <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to List
            </Link>
            <button
              onClick={handleLogout}
              className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-medium"
            >
              <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {userInfo && (
          <div className="mb-6 bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-xl">
            <p className="text-blue-700 font-medium">Logged in as: {userInfo.name}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-6 rounded-r-xl mb-6 shadow-sm">
            <div className="flex items-start">
              <svg className="w-6 h-6 text-red-400 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-red-800 font-medium leading-relaxed">{error}</p>
                <button onClick={fetchCaregiverRatings} className="mt-2 text-red-800 underline">Retry</button>
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

        {/* Rating summary card */}
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 mb-8">
          <div className="flex items-center mb-6">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-3 rounded-xl mr-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.364 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.364-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Rating Summary</h2>
              <p className="text-gray-600">Overall rating and feedback statistics</p>
            </div>
          </div>
          
          <div className="md:flex items-center gap-8">
            <div className="p-6 bg-gradient-to-r from-blue-500 to-indigo-600 text-white flex flex-col justify-center items-center rounded-xl md:w-1/4 mb-6 md:mb-0">
              <span className="text-5xl font-bold">{averageRating}</span>
              <div className="flex mt-2">
                {renderStars(Math.round(parseFloat(averageRating)))}
              </div>
              <span className="mt-2 text-blue-100">{ratings.length} {ratings.length === 1 ? 'review' : 'reviews'}</span>
            </div>
            <div className="md:w-3/4">
              <div className="flex flex-col space-y-3">
                {[5, 4, 3, 2, 1].map(num => {
                  const count = Array.isArray(ratings) ? ratings.filter(r => r?.value === num).length : 0;
                  const percentage = ratings.length > 0 ? (count / ratings.length) * 100 : 0;
                  
                  return (
                    <div key={num} className="flex items-center">
                      <span className="text-sm w-8">{num} ★</span>
                      <div className="flex-1 h-5 mx-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500" style={{ width: `${percentage}%` }}></div>
                      </div>
                      <span className="text-sm w-8">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        
        {/* Rating submission form */}
        {userInfo?.id && !userHasRated && (userInfo.role?.toUpperCase() === 'PACILIAN' || userInfo.role?.toUpperCase() === 'PACILIANS') ? (
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 mb-8">
            <div className="flex items-center mb-6">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-3 rounded-xl mr-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Share Your Experience</h2>
                <p className="text-gray-600">Let others know about your experience with this caregiver</p>
              </div>
            </div>
            
            <form onSubmit={submitRating}>
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">Your Rating</label>
                <div className="flex space-x-4">
                  {[1, 2, 3, 4, 5].map(num => (
                    <label key={num} className="flex flex-col items-center cursor-pointer">
                      <input
                        type="radio"
                        name="value"
                        value={num}
                        checked={newRating.value === num}
                        onChange={handleInputChange}
                        className="sr-only"
                      />
                      <svg 
                        className={`w-10 h-10 ${newRating.value >= num ? "text-yellow-400" : "text-gray-300"} hover:text-yellow-300 transition-colors`} 
                        fill="currentColor" 
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="text-sm mt-1">{num}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">Your Review</label>
                <textarea 
                  name="comment" 
                  value={newRating.comment} 
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                  rows="4"
                  placeholder="What was your experience with this caregiver? (optional)"
                ></textarea>
              </div>
              
              <button 
                type="submit" 
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-4 px-6 rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-semibold text-lg"
              >
                Submit Review
              </button>
            </form>
          </div>
        ) : userInfo?.id && userHasRated ? (
          <div className="bg-green-50 border-l-4 border-green-400 p-6 rounded-r-xl mb-8">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-green-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="text-green-800 font-medium">
                You've already submitted a rating for this caregiver. You can edit or delete your review below.
              </p>
            </div>
          </div>
        ) : userInfo?.id && (userInfo.role?.toUpperCase() !== 'PACILIAN' && userInfo.role?.toUpperCase() !== 'PACILIANS') ? (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-r-xl mb-8">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-yellow-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-yellow-800 font-medium">
                Only patients (Pacilians) can submit ratings for caregivers.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-r-xl mb-8">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-yellow-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-yellow-800 font-medium">
                Please log in to submit a rating for this caregiver.
              </p>
            </div>
          </div>
        )}
        
        {/* Edit Rating Modal */}
        {editMode && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-8 max-w-lg w-full">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">Edit Your Review</h3>
                <button 
                  onClick={cancelEditRating}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">Your Rating</label>
                <div className="flex justify-center space-x-4 mb-4">
                  {[1, 2, 3, 4, 5].map(num => (
                    <label key={num} className="flex flex-col items-center cursor-pointer">
                      <input
                        type="radio"
                        name="value"
                        value={num}
                        checked={editRating.value === num}
                        onChange={handleEditInputChange}
                        className="sr-only"
                      />
                      <svg 
                        className={`w-10 h-10 ${editRating.value >= num ? "text-yellow-400" : "text-gray-300"} hover:text-yellow-300 transition-colors`} 
                        fill="currentColor" 
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="text-sm mt-1">{num}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Your Review</label>
                <textarea 
                  name="comment" 
                  value={editRating.comment} 
                  onChange={handleEditInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                  rows="4"
                  placeholder="What was your experience with this caregiver? (optional)"
                ></textarea>
              </div>
              
              <div className="flex space-x-4">
                <button 
                  onClick={updateRating}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-4 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-semibold"
                >
                  Save Changes
                </button>
                <button 
                  onClick={cancelEditRating}
                  className="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-xl hover:bg-gray-300 transition-all duration-200 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Display existing ratings */}
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
          <div className="flex items-center mb-6">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-3 rounded-xl mr-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Patient Reviews</h2>
              <p className="text-gray-600">{ratings.length} reviews from patients</p>
            </div>
          </div>
          
          {!Array.isArray(ratings) || ratings.length === 0 ? (
            <div className="text-center py-8">
              <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <p className="mt-4 text-gray-500 text-lg">No reviews yet for this caregiver.</p>
              <p className="mt-1 text-gray-500">Be the first to share your experience!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {ratings.map((rating, index) => (
                <div key={rating?.id || index} className="border border-gray-100 rounded-xl p-6 hover:shadow-md transition-shadow">

                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center">
                        {renderStars(rating?.value || 0)}
                        {rating?.pacilianId === userInfo?.id && (
                          <span className="ml-3 bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                            Your Review
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 mt-1 font-medium">
                        {rating?.pacilianName || 'Anonymous Patient'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-xs text-gray-500">
                        {new Date(rating?.timestamp || Date.now()).toLocaleDateString()}
                      </div>
                      
                      {/* Edit and Delete buttons (only for user's own ratings) */}
                      {rating?.pacilianId === userInfo?.id && (
                        <div className="flex space-x-2 ml-4">
                          <button 
                            onClick={() => startEditRating(rating)} 
                            className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                            title="Edit your review"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button 
                            onClick={() => deleteRating(rating.id)} 
                            className="p-1 text-red-600 hover:text-red-800 transition-colors"
                            title="Delete your review"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-4">
                    {rating?.comment ? (
                      <p className="text-gray-700">{rating.comment}</p>
                    ) : (
                      <p className="text-gray-400 italic">No comment provided</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}