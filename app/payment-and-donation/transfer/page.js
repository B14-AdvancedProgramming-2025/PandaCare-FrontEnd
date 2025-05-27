'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Transfer() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    receiverEmail: '',
    amount: '',
    note: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [transferStatus, setTransferStatus] = useState(null); // null, 'pending', 'success'
  const [transferResult, setTransferResult] = useState(null);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/authentication');
    }
  }, [router]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Authentication token not found. Please login again.');
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/wallet/transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          receiverEmail: formData.receiverEmail,
          amount: parseFloat(formData.amount),
          note: formData.note
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to process transfer');
      }

      setTransferResult(data.data);
      setTransferStatus('success');

      // Clear form
      setFormData({
        receiverEmail: '',
        amount: '',
        note: ''
      });
    } catch (err) {
      setError(err.message || 'An error occurred during transfer');
      setTransferStatus(null);
    } finally {
      setLoading(false);
    }
  };

  // Render transfer form
  const renderTransferForm = () => {
    return (
      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="receiverEmail">
            Receiver Email
          </label>
          <input
            type="email"
            id="receiverEmail"
            name="receiverEmail"
            value={formData.receiverEmail}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="recipient@example.com"
            required
          />
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="amount">
            Amount
          </label>
          <div className="flex items-center">
            <span className="text-gray-500 text-xl mr-2">Rp</span>
            <input
              type="number"
              id="amount"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="0"
              step="1000"
              min="1000"
              required
            />
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="note">
            Note (Optional)
          </label>
          <textarea
            id="note"
            name="note"
            value={formData.note}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Add a message for the recipient"
            rows="3"
          />
        </div>

        <div className="flex items-center justify-between">
          <button
            type="submit"
            disabled={loading}
            className={`bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? 'Processing...' : 'Transfer'}
          </button>
        </div>
      </form>
    );
  };

  // Render transfer status (pending or success)
  const renderTransferStatus = () => {
    if (transferStatus === 'pending') {
      return (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold mb-2">Processing Transfer</h3>
          <p className="text-gray-600">Please wait while we process your transfer...</p>
        </div>
      );
    }

    if (transferStatus === 'success' && transferResult) {
      return (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-green-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>

          <h3 className="text-2xl font-bold text-green-700 mb-4">Transfer Successful!</h3>

          <div className="bg-white rounded-lg p-4 mb-6 shadow-sm">
            <div className="grid grid-cols-2 gap-4 text-left">
              <div className="text-gray-600">Amount:</div>
              <div className="font-semibold text-right">Rp {transferResult.amount.toLocaleString('id-ID')}</div>

              <div className="text-gray-600">Recipient:</div>
              <div className="font-semibold text-right">{transferResult.receiver}</div>

              <div className="text-gray-600">Sender:</div>
              <div className="font-semibold text-right">{transferResult.sender}</div>

              {transferResult.note && (
                <>
                  <div className="text-gray-600">Note:</div>
                  <div className="font-semibold text-right">{transferResult.note}</div>
                </>
              )}

              <div className="text-gray-600">Your New Balance:</div>
              <div className="font-semibold text-right">Rp {transferResult.senderBalance.toLocaleString('id-ID')}</div>
            </div>
          </div>

          <Link href="/payment-and-donation">
            <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded focus:outline-none focus:shadow-outline">
              Back to Wallet
            </button>
          </Link>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Transfer Funds</h1>
          <div className="flex space-x-4">
            <Link href="/payment-and-donation" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
              Back to Wallet
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        )}

        <div className="bg-white shadow rounded-lg p-6">
          {transferStatus ? renderTransferStatus() : renderTransferForm()}
        </div>
      </main>
    </div>
  );
}