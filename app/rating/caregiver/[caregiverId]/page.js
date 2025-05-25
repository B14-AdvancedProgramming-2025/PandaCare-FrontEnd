'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function CaregiverRatingPage() {
  const { caregiverId } = useParams();
  const router = useRouter();
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  
  useEffect(() => {
    // Get user info from local storage
    const storedUserInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    setUserInfo(storedUserInfo);
    
    // If not logged in or not a caregiver, redirect
    if (!storedUserInfo || !storedUserInfo.id) {
      router.push('/authentication');
      return;
    }
    
    // If not the correct caregiver, redirect
    if (storedUserInfo.role !== 'CAREGIVER' || storedUserInfo.id !== caregiverId) {
      router.push('/dashboard');
      return;
    }
    
    fetchCaregiverRatings();
  }, [caregiverId, router]);
  
  const fetchCaregiverRatings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:8080/api/ratings/doctor/${caregiverId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch ratings');
      }
      
      const data = await response.json();
      setRatings(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Calculate average rating
  const averageRating = ratings.length > 0 
    ? (ratings.reduce((sum, rating) => sum + rating.value, 0) / ratings.length).toFixed(1)
    : 'No ratings yet';

  if (loading) return <div className="p-8 text-center">Loading your ratings...</div>;
  if (error) return <div className="p-8 text-center text-red-500">Error: {error}</div>;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">My Patient Ratings</h1>
      <div className="bg-blue-100 p-4 rounded-lg mb-6">
        <p className="text-lg">Your average rating: <span className="font-bold">{averageRating}</span></p>
        <p>Total ratings: {ratings.length}</p>
      </div>
      
      {/* Display existing ratings */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">All Ratings</h2>
        
        {ratings.length === 0 ? (
          <p className="text-gray-500">You haven't received any ratings yet.</p>
        ) : (
          <div className="space-y-4">
            {ratings.map(rating => (
              <div key={rating.id} className="border-b pb-4">
                <div className="flex justify-between">
                  <div className="font-medium">
                    Rating: {rating.value} / 5
                  </div>
                </div>
                <p className="mt-2">{rating.comment || "No comment provided."}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}