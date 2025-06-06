'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tokenError, setTokenError] = useState(null);
  const [userId, setUserId] = useState(null);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    // Ensure client-side execution for localStorage
    if (typeof window === 'undefined') return;

    // Check if user is logged in
    const token = localStorage.getItem('token');
    console.log("Retrieved token:", token ? token.substring(0, 15) + '...' : 'null');

    if (!token) {
      router.push('/authentication');
      return;
    }

    // Decode JWT token with better error handling
    try {
      // Handle if token isn't a proper JWT
      if (!token.includes('.')) {
        // If token doesn't have periods, it's not in JWT format
        setUserData({ name: 'User', role: 'USER' });
        setTokenError('Token is not in JWT format. Login may need to be updated.');
        setLoading(false);
        return;
      }

      // JWT tokens are in format: header.payload.signature
      const parts = token.split('.');
      console.log("Token parts count:", parts.length);

      if (parts.length !== 3) {
        setUserData({ name: 'User', role: 'USER' });
        setTokenError(`Token has ${parts.length} parts instead of 3.`);
        setLoading(false);
        return;
      }

      // Base64Url decode the payload
      const payload = parts[1];

      try {
        // More resilient base64 decoding
        const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
        const paddedBase64 = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');

        // First try simple decoding
        let jsonPayload;
        try {
          jsonPayload = atob(paddedBase64);
        } catch (e) {
          // If simple decoding fails, try more complex approach
          jsonPayload = decodeURIComponent(
            atob(paddedBase64)
              .split('')
              .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join('')
          );
        }

        const decodedData = JSON.parse(jsonPayload);
        console.log("Decoded data:", decodedData);

        // Extract user ID from token - could be in sub, id, or userId fields
        const extractedUserId = decodedData.id || decodedData.sub || decodedData.userId;
        setUserId(extractedUserId);

        // Set user data from token
        setUserData({
          name: decodedData.name || decodedData.sub || 'User',
          email: decodedData.email || decodedData.sub,
          role: decodedData.role || decodedData.roles || 'USER'
        });
      } catch (decodeError) {
        console.error('Error decoding payload:', decodeError);
        setTokenError('Error decoding token payload. Format may be incorrect.');
        setUserData({ name: 'User', role: 'USER' });
      }
    } catch (error) {
      console.error('Error processing token:', error);
      setTokenError('Error processing token: ' + error.message);
      setUserData({ name: 'User', role: 'USER' });
    } finally {
      setLoading(false);
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/authentication');
  };

  const handleRatingButtonClick = async () => {
    try {
      // First check if we need to fetch the real user ID (for caregivers)
      const token = localStorage.getItem('token');
      if (userData?.role === 'CAREGIVER' && userId) {
        // Use email as userId to fetch the actual ID
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/ratings/id/${userId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          // Extract the real caregiver ID from the response
          const realCaregiverId = data.data;

          // Navigate to caregiver rating page with the real ID
          router.push(`/rating/caregiver/${realCaregiverId}`);
        } else {
          console.error('Failed to fetch caregiver ID:', response.status);
          // Fall back to using the current ID if fetch fails
          router.push(`/rating/caregiver/${userId}`);
        }
      } else {
        // For non-caregivers, just go to the pacilian rating page
        router.push('/rating/pacilian');
      }
    } catch (error) {
      console.error('Error fetching caregiver ID:', error);
      // Fall back to regular navigation on error
      if (userData?.role === 'CAREGIVER' && userId) {
        router.push(`/rating/caregiver/${userId}`);
      } else {
        router.push('/rating/pacilian');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 relative">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">PandaCare Home</h1>
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-12 sm:px-6 lg:px-8">
        {tokenError && (
          <div className="mb-6 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
            <p className="font-bold">Warning</p>
            <p>{tokenError}</p>
            <p className="mt-2 text-sm">You can continue using the app, but some features may be limited.</p>
          </div>
        )}

        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-semibold mb-4">Welcome, {userData?.name || 'User'}!</h2>

            {/* Scheduling Services Buttons */}
            <div className="mt-8">
              <h3 className="text-xl font-semibold mb-6">Scheduling Services</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <Link href="/scheduling/caregiver" className="block">
                  <div className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg p-8 text-center transition-colors duration-200">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <h4 className="text-xl font-bold">Caregiver Dashboard</h4>
                    <p className="mt-2">Manage your schedules and consultations</p>
                  </div>
                </Link>

                <Link href="/scheduling/pacilian" className="block">
                  <div className="bg-green-500 hover:bg-green-600 text-white rounded-lg p-8 text-center transition-colors duration-200">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    <h4 className="text-xl font-bold">Pacilian Dashboard</h4>
                    <p className="mt-2">Book appointments and find caregivers</p>
                  </div>
                </Link>
              </div>
            </div>

            {/* Communication Services Buttons */}
            <div className="mt-8">
              <h3 className="text-xl font-semibold mb-6">Communication Services</h3>
              <div className="grid grid-cols-1 md:grid-cols-1 gap-6 mb-8">
                <Link href="/chats" className="block">
                  <div className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg p-8 text-center transition-colors duration-200">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <h4 className="text-xl font-bold">My Chats</h4>
                    <p className="mt-2">View and manage your conversations</p>
                  </div>
                </Link>
              </div>
            </div>

            {/* Financial Services Buttons */}
            <div className="mt-8">
              <h3 className="text-xl font-semibold mb-6">Financial Services</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Link href="/payment-and-donation/topup" className="block">
                  <div className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg p-8 text-center transition-colors duration-200">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <h4 className="text-xl font-bold">Top Up</h4>
                    <p className="mt-2">Add funds to your wallet</p>
                  </div>
                </Link>

                <Link href="/payment-and-donation/transfer" className="block">
                  <div className="bg-teal-500 hover:bg-teal-600 text-white rounded-lg p-8 text-center transition-colors duration-200">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    <h4 className="text-xl font-bold">Transfer</h4>
                    <p className="mt-2">Send funds to others</p>
                  </div>
                </Link>

                <Link href="/payment-and-donation" className="block">
                  <div className="bg-purple-500 hover:bg-purple-600 text-white rounded-lg p-8 text-center transition-colors duration-200">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    <h4 className="text-xl font-bold">Wallet</h4>
                    <p className="mt-2">Manage your funds and transactions</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Floating Rating Button */}
      <div
        className="fixed bottom-8 right-8 z-50"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <button
          onClick={handleRatingButtonClick}
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          aria-label="Ratings"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </button>

        {/* Tooltip */}
        {showTooltip && (
          <div className="absolute bottom-full right-0 mb-2 bg-gray-800 text-white text-sm px-3 py-2 rounded shadow-lg whitespace-nowrap">
            {userData?.role === 'CAREGIVER' ? 'View My Ratings' : 'Rate Caregivers'}
            <div className="absolute bottom-0 right-6 transform translate-y-1/2 rotate-45 w-2 h-2 bg-gray-800"></div>
          </div>
        )}
      </div>
    </div>
  );
}