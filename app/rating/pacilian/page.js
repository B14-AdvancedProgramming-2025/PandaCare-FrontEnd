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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Get user info from token
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/authentication');
      return;
    }
    
    if (token) {
      try {
        // Try to parse JWT token
        const parts = token.split('.');
        if (parts.length === 3) {
          const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
          const paddedBase64 = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
          const jsonPayload = atob(paddedBase64);
          const decodedData = JSON.parse(jsonPayload);
          
          setUserInfo({
            name: decodedData.name || decodedData.sub || 'User',
            role: decodedData.role || decodedData.roles || 'USER',
            email: decodedData.email || decodedData.sub,
          });
        }
      } catch (e) {
        console.error('Error parsing token:', e);
      }
    }
    
    // Fetch all doctors
    fetchDoctors();
  }, [mounted, router]);
  
  const fetchDoctors = async () => {
    try {
      setLoading(true);
      
      // Try API endpoint
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/ratings/doctors`);
      
      if (response.ok) {
        // Get data as direct array
        const data = await response.json();
        console.log("API Response:", data);
        
        // Map to the format our UI expects
        const formattedDoctors = data.map(doctor => ({
          id: doctor.caregiverId,
          name: doctor.caregiverName || `Doctor ${doctor.caregiverId.substring(0, 8)}`,
          averageRating: doctor.averageRating || 0,
          totalRatings: doctor.totalRatings || 0,
          // Add defaults for missing fields
          specialization: doctor.specialization || "General Practitioner",
          imageUrl: doctor.imageUrl || null
        }));
        
        setDoctors(formattedDoctors);
      } else {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }
    } catch (err) {
      console.error('Error fetching doctors:', err);
      setError('Failed to load doctors. Please try again later.');
      
      // Use mock data for development
      setDoctors([
        {
          id: "10d4096b-6048-4c80-b041-aca74d482df6",
          name: "Dr. Sarah Johnson",
          specialization: "Cardiologist",
          averageRating: 4.7,
          totalRatings: 48,
          imageUrl: "https://randomuser.me/api/portraits/women/45.jpg"
        },
        {
          id: "2a45e7b9-d56f-4321-98c7-b3dfea76e01a",
          name: "Dr. Michael Chen",
          specialization: "Neurologist",
          averageRating: 4.5,
          totalRatings: 32,
          imageUrl: "https://randomuser.me/api/portraits/men/22.jpg"
        }
      ]);
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
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/authentication');
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading doctors...</p>
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
              Doctor Ratings
            </h1>
            <p className="text-gray-600 text-lg">Find and rate your healthcare professionals</p>
          </div>
          <div className="flex space-x-4"> {/* Added container div for buttons */}
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
                <button onClick={fetchDoctors} className="mt-2 text-red-800 underline">Retry</button>
              </div>
            </div>
          </div>
        )}

        {/* Search bar */}
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 mb-8">
          <div className="flex items-center mb-6">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-3 rounded-xl mr-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Search Doctors</h2>
              <p className="text-gray-600">Find doctors by name or specialization</p>
            </div>
          </div>
          
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
            <input
              type="text"
              className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
              placeholder="Search doctors by name or specialization..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Doctor list */}
        {filteredDoctors.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 text-center">
            <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="mt-4 text-gray-500 text-lg">No doctors found matching your search.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredDoctors.map((doctor) => (
              <div 
                key={doctor.id} 
                className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-200 border border-gray-100 transform hover:-translate-y-1 cursor-pointer"
                onClick={() => handleDoctorClick(doctor.id)}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">{doctor.name}</h3>
                      {doctor.specialization && (
                        <span className="inline-block mt-1 bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full uppercase font-semibold tracking-wide">
                          {doctor.specialization}
                        </span>
                      )}
                    </div>
                    <img 
                      className="h-16 w-16 rounded-full object-cover shadow-md border-2 border-white" 
                      src={doctor.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(doctor.name)}&background=random`} 
                      alt={doctor.name} 
                    />
                  </div>
                  
                  <div className="mt-4">
                    <div className="flex items-center">
                      {renderStars(doctor.averageRating || 0)}
                      <span className="ml-2 text-gray-600 font-medium">{(doctor.averageRating || 0).toFixed(1)}</span>
                      <span className="ml-1 text-gray-500 text-sm">({doctor.totalRatings || 0} reviews)</span>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <button className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
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