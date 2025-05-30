'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PaymentAndDonation() {
  const router = useRouter();
  const [walletData, setWalletData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [usingMockData, setUsingMockData] = useState(false);

  useEffect(() => {
    // Ensure client-side execution for localStorage
    if (typeof window === 'undefined') return;

    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/authentication');
      return;
    }

    // Fetch wallet balance
    const fetchWalletBalance = async () => {
      try {
        console.log('Fetching wallet balance...');

        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://pandacare.abhipraya.dev'}/api/wallet/balance`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            // Remove credentials and mode to simplify the request
          });

          console.log('Response status:', response.status);

          if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
          }

          const data = await response.json();
          console.log('Wallet data:', data);

          if (!data.success) {
            throw new Error(data.message || 'Failed to fetch wallet balance');
          }

          setWalletData(data.data);
          setUsingMockData(false);
        } catch (fetchErr) {
          console.error('Fetch error details:', fetchErr);

          // Use mock data for any fetch error (including CORS)
          console.log('API connection issue, using mock data temporarily');
          await new Promise(resolve => setTimeout(resolve, 800));
          setWalletData({ balance: 500.00 });
          setUsingMockData(true);
        }
      } catch (err) {
        console.error('Error fetching wallet balance:', err);
        setError(err.message || 'An error occurred while fetching your wallet balance');
      } finally {
        setLoading(false);
      }
    };

    fetchWalletBalance();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('tokenExpiry');
    router.push('/authentication');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">My Wallet</h1>
          <div className="flex space-x-4">
            <Link href="/" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
              Home
            </Link>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {usingMockData && (
          <div className="mb-4 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
            <p className="font-bold">Note</p>
            <p>Using estimated balance data. Backend connection is currently unavailable.</p>
          </div>
        )}

        <div className="bg-white shadow rounded-lg p-6">
          {loading ? (
            <div className="text-center py-4">
              <p className="text-gray-500">Loading wallet information...</p>
            </div>
          ) : error ? (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <p className="font-bold">Error</p>
              <p>{error}</p>
              <p className="mt-2">Please try again later or contact support if this issue persists.</p>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <h2 className="text-xl font-semibold text-gray-700 mb-2">Current Balance</h2>
                <p className="text-5xl font-bold text-green-600">
                  ${walletData?.balance.toFixed(2) || '0.00'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                <Link href="/payment-and-donation/topup" className="block">
                  <div className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg p-6 text-center transition-colors duration-200">
                    <h3 className="text-xl font-bold">Top Up</h3>
                    <p className="mt-2">Add funds to your wallet</p>
                  </div>
                </Link>

                <Link href="/payment-and-donation/transfer" className="block">
                  <div className="bg-green-500 hover:bg-green-600 text-white rounded-lg p-6 text-center transition-colors duration-200">
                    <h3 className="text-xl font-bold">Transfer</h3>
                    <p className="mt-2">Send funds to others</p>
                  </div>
                </Link>

                <Link href="/payment-and-donation/transactions" className="block">
                  <div className="bg-purple-500 hover:bg-purple-600 text-white rounded-lg p-6 text-center transition-colors duration-200">
                    <h3 className="text-xl font-bold">Transactions</h3>
                    <p className="mt-2">View your transaction history</p>
                  </div>
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}