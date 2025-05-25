'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function PacilianRatingPage() {
  const { caregiverId } = useParams();
  const router = useRouter();
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  
  // Form state for new rating
  const [newRating, setNewRating] = useState({
    value: 5,
    comment: '',
  });
  
  useEffect(() => {
    // Get user info from local storage
    try {
      const storedUserInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
      setUserInfo(storedUserInfo);
      
      // Uncomment these for production to enforce authentication
      // If not logged in or not a pacilian, redirect
      // if (!storedUserInfo || !storedUserInfo.id) {
      //   router.push('/authentication');
      //   return;
      // }
      
      // if (storedUserInfo.role !== 'PACILIAN') {
      //   router.push('/dashboard');
      //   return;
      // }
    } catch (err) {
      console.error('Failed to parse user info:', err);
      // Set a default user info object if parsing fails
      setUserInfo({});
    }
    
    // Fetch ratings for this caregiver
    fetchCaregiverRatings();
  }, [caregiverId, router]);
  
  const fetchCaregiverRatings = async () => {
    try {
      setLoading(true);
      
      // For testing purposes - use mock data if API is not available
      // Comment this out when your API is working
      /*
      const mockData = [
        { 
          id: "1", 
          caregiverId: caregiverId, 
          pacilianId: "user123", 
          value: 5, 
          comment: "Excellent caregiver, very attentive and professional.",
          timestamp: "2023-05-10T14:30:00Z"
        },
        { 
          id: "2", 
          caregiverId: caregiverId, 
          pacilianId: "user456", 
          value: 4, 
          comment: "Good service overall, would recommend.",
          timestamp: "2023-05-12T09:15:00Z"
        }
      ];
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
      setRatings(mockData);
      setLoading(false);
      return;
      */
      
      // Real API call
      const response = await fetch(`http://localhost:8080/api/ratings/doctor/${caregiverId}`);
      
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewRating(prev => ({
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
    
    try {
      const response = await fetch('http://localhost:8080/api/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add authorization header if needed
          // 'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          caregiverId: caregiverId,
          pacilianId: userInfo.id,
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
      fetchCaregiverRatings();
    } catch (err) {
      console.error('Error submitting rating:', err);
      setError(err.message || 'An error occurred while submitting your rating');
    }
  };

  // Calculate if user has already submitted a rating - with safety check
  const userHasRated = Array.isArray(ratings) && 
    ratings.some(rating => rating && rating.pacilianId === userInfo?.id);
  
  // Calculate average rating - with safety check
  const averageRating = Array.isArray(ratings) && ratings.length > 0 
    ? (ratings.reduce((sum, rating) => sum + (rating?.value || 0), 0) / ratings.length).toFixed(1)
    : '0.0';

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-pulse text-xl text-blue-600">Loading ratings...</div>
    </div>
  );
  
  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-red-100 text-red-700 p-4 rounded-lg shadow-md">
        <p className="font-semibold">Error:</p>
        <p>{error}</p>
        <button 
          onClick={fetchCaregiverRatings}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
        >
          Try Again
        </button>
      </div>
    </div>
  );

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

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Caregiver Ratings</h1>
          <p className="text-gray-600">Share your experience or view what others are saying</p>
        </div>
        
        {/* Rating summary card */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-10">
          <div className="md:flex">
            <div className="p-8 bg-gradient-to-r from-blue-500 to-indigo-600 text-white flex flex-col justify-center items-center md:w-1/3">
              <span className="text-5xl font-bold">{averageRating}</span>
              <div className="flex mt-2">
                {renderStars(Math.round(parseFloat(averageRating)))}
              </div>
              <span className="mt-2 text-blue-100">{ratings.length} {ratings.length === 1 ? 'review' : 'reviews'}</span>
            </div>
            <div className="p-8 md:w-2/3">
              <div className="flex flex-col space-y-3">
                {[5, 4, 3, 2, 1].map(num => {
                  const count = Array.isArray(ratings) ? ratings.filter(r => r?.value === num).length : 0;
                  const percentage = ratings.length > 0 ? (count / ratings.length) * 100 : 0;
                  
                  return (
                    <div key={num} className="flex items-center">
                      <span className="text-sm w-8">{num} ★</span>
                      <div className="flex-1 h-4 mx-2 bg-gray-200 rounded-full overflow-hidden">
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
        {!userHasRated ? (
          <div className="bg-white shadow-md rounded-lg p-6 mb-10">
            <h2 className="text-xl font-semibold mb-6 text-gray-800">Share Your Experience</h2>
            <form onSubmit={submitRating}>
              <div className="mb-6">
                <label className="block text-gray-700 mb-2">Your Rating</label>
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
                        className={`w-10 h-10 ${newRating.value >= num ? "text-yellow-400" : "text-gray-300"} hover:text-yellow-300`} 
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
                <label className="block text-gray-700 mb-2">Your Review</label>
                <textarea 
                  name="comment" 
                  value={newRating.comment} 
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  rows="4"
                  placeholder="What was your experience with this caregiver? (optional)"
                ></textarea>
              </div>
              
              <button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition duration-150"
              >
                Submit Review
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg mb-10">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">
                  You've already submitted a rating for this caregiver. Thank you for your feedback!
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Display existing ratings */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-800">Patient Reviews</h2>
          
          {!Array.isArray(ratings) || ratings.length === 0 ? (
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <p className="mt-2 text-gray-500">No reviews yet for this caregiver.</p>
              <p className="mt-1 text-gray-500">Be the first to share your experience!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {ratings.map((rating, index) => (
                <div key={rating?.id || index} className="bg-white p-6 rounded-lg shadow-md">
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
                      <p className="text-sm text-gray-500 mt-1">
                        Patient ID: {(rating?.pacilianId || 'Unknown')?.substring(0, 8)}...
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