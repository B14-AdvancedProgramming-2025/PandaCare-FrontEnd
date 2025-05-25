'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tokenError, setTokenError] = useState(null);

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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
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
            
            {/* Financial Services Buttons */}
            <div className="mt-8">
              <h3 className="text-xl font-semibold mb-6">Financial Services</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Link href="/payment-and-donation/topup" className="block">
                  <div className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg p-8 text-center transition-colors duration-200">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <h4 className="text-xl font-bold">Top Up</h4>
                    <p className="mt-2">Add funds to your wallet</p>
                  </div>
                </Link>
                
                <Link href="/payment-and-donation/transfer" className="block">
                  <div className="bg-green-500 hover:bg-green-600 text-white rounded-lg p-8 text-center transition-colors duration-200">
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
                    <p className="mt-2">View your wallet details</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
