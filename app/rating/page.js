'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RatingListPage() {
  const router = useRouter();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    // Get user info from local storage
    try {
      const storedUserInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
      setUserInfo(storedUserInfo);
      
      // For production, uncomment this to enforce authentication
      // if (!storedUserInfo || !storedUserInfo.id) {
      //   router.push('/authentication');
      //   return;
      // }
    } catch (err) {
      console.error('Failed to parse user info:', err);
      setUserInfo({});
    }
    
    // Fetch all doctors
    fetchDoctors();
  }, [router]);
  
  const fetchDoctors = async () => {
    try {
      setLoading(true);
      
      // Try to fetch from doctors API
      try {
        const response = await fetch('http://localhost:8080/api/ratings/doctors');
        
        if (response.ok) {
          const data = await response.json();
          // Extract data based on your API response structure
          const doctorsArray = data.data || [];
          console.log("Fetched doctors:", doctorsArray);
          setDoctors(doctorsArray);
          setLoading(false);
          return;
        }
      } catch (error) {
        console.log("Doctors API not available, trying alternative...");
      }
      
      // If doctors API fails, try to get doctors from ratings
      try {
        const ratingsResponse = await fetch('http://localhost:8080/api/ratings');
        
        if (ratingsResponse.ok) {
          const ratingsData = await ratingsResponse.json();
          const ratings = ratingsData.data || [];
          
          // Extract unique doctors and calculate ratings
          const doctorMap = new Map();
          
          ratings.forEach(rating => {
            if (!doctorMap.has(rating.caregiverId)) {
              doctorMap.set(rating.caregiverId, {
                id: rating.caregiverId,
                name: `Doctor ${rating.caregiverId.substring(0, 8)}...`,
                specialization: "Unknown",
                totalRatings: 0,
                totalValue: 0,
                averageRating: 0
              });
            }
            
            const doctorData = doctorMap.get(rating.caregiverId);
            doctorData.totalRatings++;
            doctorData.totalValue += rating.value;
            doctorData.averageRating = doctorData.totalValue / doctorData.totalRatings;
          });
          
          const doctorsFromRatings = Array.from(doctorMap.values());
          console.log("Derived doctors from ratings:", doctorsFromRatings);
          setDoctors(doctorsFromRatings);
          setLoading(false);
          return;
        }
      } catch (error) {
        console.error("Failed to get doctors from ratings:", error);
      }
      
      // If all else fails, use mock data
      console.log("Using mock data as fallback");
      const mockData = [
        {
          id: "10d4096b-6048-4c80-b041-aca74d482df6",
          name: "Dr. Sarah Johnson",
          specialization: "Cardiologist",
          experience: 12,
          averageRating: 4.7,
          totalRatings: 48,
          imageUrl: "https://randomuser.me/api/portraits/women/45.jpg"
        },
        {
          id: "2a45e7b9-d56f-4321-98c7-b3dfea76e01a",
          name: "Dr. Michael Chen",
          specialization: "Neurologist",
          experience: 8,
          averageRating: 4.5,
          totalRatings: 32,
          imageUrl: "https://randomuser.me/api/portraits/men/22.jpg"
        },
        {
          id: "5fc3a9e7-8d1b-487c-ae91-56d56af8d720",
          name: "Dr. Emily Wilson",
          specialization: "Pediatrician",
          experience: 15,
          averageRating: 4.9,
          totalRatings: 67,
          imageUrl: "https://randomuser.me/api/portraits/women/33.jpg"
        },
        {
          id: "8e72fba4-3c17-4409-8b5d-ec92d9e62d5f",
          name: "Dr. Robert Garcia",
          specialization: "Orthopedic Surgeon",
          experience: 20,
          averageRating: 4.6,
          totalRatings: 52,
          imageUrl: "https://randomuser.me/api/portraits/men/54.jpg"
        },
        {
          id: "c18d32e5-9a75-40e7-b7c4-d1b5cfd82438",
          name: "Dr. Jennifer Lee",
          specialization: "Dermatologist",
          experience: 7,
          averageRating: 4.4,
          totalRatings: 29,
          imageUrl: "https://randomuser.me/api/portraits/women/68.jpg"
        }
      ];
      
      setDoctors(mockData);
    } catch (err) {
      console.error('Error fetching doctors:', err);
      setError(err.message || 'Failed to load doctors');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle doctor card click - redirect based on user role
  const handleDoctorClick = (doctorId) => {
    const role = userInfo?.role?.toUpperCase() || '';
    
    if (role === 'CAREGIVER') {
      router.push(`/rating/caregiver/${doctorId}`);
    } else {
      // Default to pacilian/patient view
      router.push(`/rating/pacilian/${doctorId}`);
    }
  };

  // Filter doctors based on search term
  const filteredDoctors = doctors.filter(doctor => 
    doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (doctor.specialization && doctor.specialization.toLowerCase().includes(searchTerm.toLowerCase()))
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-xl text-blue-600">Loading doctors...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-100 text-red-700 p-4 rounded-lg shadow-md">
          <p className="font-semibold">Error:</p>
          <p>{error}</p>
          <button 
            onClick={fetchDoctors}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Doctor Ratings</h1>
          <p className="text-gray-600">View and rate our healthcare professionals</p>
          {userInfo?.role && (
            <div className="mt-2 inline-block bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded">
              Logged in as: {userInfo.role}
            </div>
          )}
        </div>

        {/* Search bar */}
        <div className="mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
            <input
              type="text"
              className="block w-full p-4 pl-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white focus:ring-blue-500 focus:border-blue-500"
              placeholder="Search doctors by name or specialization..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Doctor list */}
        {filteredDoctors.length === 0 ? (
          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="mt-2 text-gray-500">No doctors found matching your search.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredDoctors.map((doctor) => (
              <div 
                key={doctor.id} 
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 cursor-pointer"
                onClick={() => handleDoctorClick(doctor.id)}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">{doctor.name}</h3>
                      {doctor.specialization && (
                        <span className="inline-block mt-1 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full uppercase font-semibold tracking-wide">
                          {doctor.specialization}
                        </span>
                      )}
                    </div>
                    <img 
                      className="h-16 w-16 rounded-full object-cover" 
                      src={doctor.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(doctor.name)}&background=random`} 
                      alt={doctor.name} 
                    />
                  </div>
                  
                  <div className="mt-4">
                    <div className="flex items-center">
                      {renderStars(doctor.averageRating || 0)}
                      <span className="ml-2 text-gray-600">{(doctor.averageRating || 0).toFixed(1)}</span>
                      <span className="ml-1 text-gray-500 text-sm">({doctor.totalRatings || 0})</span>
                    </div>
                    
                    {doctor.experience && (
                      <div className="mt-2 text-sm text-gray-600">
                        Experience: {doctor.experience} years
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-6">
                    <button className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150">
                      {userInfo?.role?.toUpperCase() === 'CAREGIVER' ? 'View Your Ratings' : 'View & Rate'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}