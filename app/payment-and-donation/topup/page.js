'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function TopUp() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [method, setMethod] = useState('CREDIT_CARD');
  const [amount, setAmount] = useState('');

  // Credit card fields
  const [cardNumber, setCardNumber] = useState('');
  const [cvv, setCvv] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cardholderName, setCardholderName] = useState('');

  // Bank transfer fields
  const [bankName, setBankName] = useState('BCA');
  const [accountNumber, setAccountNumber] = useState('');

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/authentication');
    }
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Authentication token not found. Please login again.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      let payload;

      if (method === 'CREDIT_CARD') {
        payload = {
          amount: parseFloat(amount),
          method: 'CREDIT_CARD',
          cardNumber,
          cvv,
          expiryDate,
          cardholderName
        };
      } else {
        payload = {
          amount: parseFloat(amount),
          method: 'BANK_TRANSFER',
          bankName,
          accountNumber
        };
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/wallet/topup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to process top-up');
      }

      setSuccess(`Successfully topped up Rp${data.data.amount.toLocaleString('id-ID')}. New balance: Rp${data.data.balance.toLocaleString('id-ID')}`);

      // Clear form
      setAmount('');
      setCardNumber('');
      setCvv('');
      setExpiryDate('');
      setCardholderName('');
      setAccountNumber('');

      // Redirect after 2 seconds
      setTimeout(() => {
        router.push('/payment-and-donation');
      }, 2000);
    } catch (err) {
      setError(err.message || 'An error occurred during top-up');
    } finally {
      setLoading(false);
    }
  };

  const formatCardNumber = (value) => {
    // Remove all non-digit characters
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');

    // Split into groups of 4 digits
    const matches = v.match(/\d{1,4}/g);

    // Join with spaces if we have matches
    if (matches) {
      return matches.join(' ');
    }

    // Return original input if no digits
    return value;
  };

  const formatExpiryDate = (value) => {
    // Remove all non-digit characters
    const v = value.replace(/[^0-9]/gi, '');

    // Add slash after first 2 digits
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }

    return v;
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Top Up Wallet</h1>
          <div className="flex space-x-4">
            <Link href="/payment-and-donation" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
              Back to Wallet
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <p className="font-bold">Error</p>
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              <p className="font-bold">Success</p>
              <p>{success}</p>
              <p className="mt-2">Redirecting back to wallet...</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2">Amount</label>
              <div className="flex items-center">
                <span className="text-gray-500 text-xl mr-2">Rp</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="0"
                  step="1000"
                  min="1000"
                  required
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2">Payment Method</label>
              <div className="flex space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    value="CREDIT_CARD"
                    checked={method === 'CREDIT_CARD'}
                    onChange={() => setMethod('CREDIT_CARD')}
                    className="form-radio"
                  />
                  <span className="ml-2">Credit Card</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    value="BANK_TRANSFER"
                    checked={method === 'BANK_TRANSFER'}
                    onChange={() => setMethod('BANK_TRANSFER')}
                    className="form-radio"
                  />
                  <span className="ml-2">Bank Transfer</span>
                </label>
              </div>
            </div>

            {method === 'CREDIT_CARD' ? (
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h3 className="text-lg font-semibold mb-4">Credit Card Details</h3>

                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">Card Number</label>
                  <input
                    type="text"
                    value={cardNumber.replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim()}
                    onChange={(e) => {
                      const formatted = formatCardNumber(e.target.value);
                      setCardNumber(formatted.replace(/\s/g, '')); // Store without spaces
                    }}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    placeholder="4111 1111 1111 1111"
                    maxLength="19" // Increase for spaces
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2">CVV</label>
                    <input
                      type="text"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value)}
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      placeholder="123"
                      maxLength="3"
                      required
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2">Expiry Date</label>
                    <input
                      type="text"
                      value={expiryDate}
                      onChange={(e) => {
                        const formatted = formatExpiryDate(e.target.value);
                        setExpiryDate(formatted);
                      }}
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      placeholder="MM/YY"
                      maxLength="5"
                      required
                    />
                  </div>

                  <div className="mb-4 md:col-span-3">
                    <label className="block text-gray-700 text-sm font-bold mb-2">Cardholder Name</label>
                    <input
                      type="text"
                      value={cardholderName}
                      onChange={(e) => setCardholderName(e.target.value)}
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      placeholder="John Doe"
                      required
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h3 className="text-lg font-semibold mb-4">Bank Transfer Details</h3>

                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">Bank Name</label>
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    required
                  >
                    <option value="BCA">BCA</option>
                    <option value="BNI">BNI</option>
                    <option value="BRI">BRI</option>
                    <option value="Mandiri">Mandiri</option>
                    <option value="CIMB Niaga">CIMB Niaga</option>
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">Account Number</label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    placeholder="1234567890"
                    required
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <button
                type="submit"
                disabled={loading}
                className={`bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {loading ? 'Processing...' : 'Top Up'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}