'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CaregiverRatingPage() {
  const { caregiverId } = useParams();
  const router = useRouter();
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  useEffect(() => {
    if (!mounted) return;
    
    // Get user info from JWT token
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
          
          console.log("Decoded token data:", decodedData);
          
          setUserInfo({
            id: decodedData.sub || decodedData.id,
            name: decodedData.name || decodedData.sub || 'User',
            role: decodedData.role || decodedData.roles || 'USER',
            email: decodedData.email || decodedData.sub,
          });
          
          // Check if user is a CAREGIVER (case insensitive)
          const userRole = (decodedData.role || decodedData.roles || '').toUpperCase();
          if (userRole !== 'CAREGIVER') {
            setError('Access denied. Only Caregivers can view their own ratings.');
            setTimeout(() => router.push('/'));
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
  }, [mounted, caregiverId, router]);
  
  const fetchCaregiverRatings = async () => {
    try {
      setLoading(true);
      
      // Real API call
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/ratings/doctor/${caregiverId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch ratings: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('API response data:', data);
      
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

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your ratings...</p>
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
              My Patient Ratings
            </h1>
            <p className="text-gray-600 text-lg">
              View and monitor feedback from your patients
            </p>
          </div>
          <div className="flex space-x-4">
            <Link 
              href="/" 
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-medium"
            >
              <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
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
              <p className="text-gray-600">{ratings.length} reviews from your patients</p>
            </div>
          </div>
          
          {!Array.isArray(ratings) || ratings.length === 0 ? (
            <div className="text-center py-8">
              <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <p className="mt-4 text-gray-500 text-lg">No reviews yet from your patients.</p>
              <p className="mt-1 text-gray-500">Provide excellent care to receive positive feedback!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {ratings.map((rating, index) => (
                <div key={rating?.id || index} className="border border-gray-100 rounded-xl p-6 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center">
                        {renderStars(rating?.value || 0)}
                      </div>
                      <p className="text-sm text-gray-700 mt-1 font-medium">
                        {rating?.pacilianName || 'Anonymous Patient'}
                      </p>
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(rating?.timestamp || Date.now()).toLocaleDateString()}
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