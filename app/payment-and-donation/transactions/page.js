'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Transactions() {
  const router = useRouter();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize, setPageSize] = useState(5);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/authentication');
      return;
    }

    // Fetch transaction history with pagination
    const fetchTransactions = async () => {
      setLoading(true);
      try {
        const response = await fetch(`http://localhost:8080/api/wallet/transactions?page=${currentPage}&size=${pageSize}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`Server responded with status: ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.message || 'Failed to fetch transaction history');
        }

        setTransactions(data.transactions || []);
        setCurrentPage(data.currentPage);
        setTotalPages(data.totalPages);
        setTotalItems(data.totalItems);
      } catch (err) {
        console.error('Error fetching transactions:', err);
        setError(err.message || 'An error occurred while fetching transaction history');
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [router, currentPage, pageSize]);

  const handlePageChange = (newPage) => {
    if (newPage >= 0 && newPage < totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Helper to determine if a transaction affects balance positively or negatively
  const getBalanceDelta = (transaction) => {
    // Get user name from localStorage or other source to compare with sender/receiver
    const userName = localStorage.getItem('userName') || '';

    if (transaction.type === 'TOPUP') {
      return {
        amount: transaction.amount,
        isPositive: true
      };
    } else if (transaction.type === 'TRANSFER') {
      // If user is sender, it's negative; if user is receiver, it's positive
      const isReceiver = transaction.receiverName === userName;
      return {
        amount: transaction.amount,
        isPositive: isReceiver
      };
    }

    return {
      amount: 0,
      isPositive: false
    };
  };

  // Format date to a readable format
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Transaction History</h1>
          <div className="flex space-x-4">
            <Link href="/payment-and-donation" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
              Back to Wallet
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        )}

        <div className="bg-white shadow rounded-lg overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading transaction history...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No transactions found.</p>
              <p className="mt-2">Start by topping up your wallet or making a transfer.</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-200">
                {transactions.map((transaction) => {
                  const delta = getBalanceDelta(transaction);
                  return (
                    <div key={transaction.id} className="p-6 hover:bg-gray-50 transition-colors duration-150">
                      <div className="flex flex-col">
                        <div className="flex-grow">
                          <div className="flex items-center mb-2">
                            {transaction.type === 'TOPUP' ? (
                              <div className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded mr-2">
                                Top Up
                              </div>
                            ) : (
                              <div className="bg-purple-100 text-purple-800 text-xs font-semibold px-2.5 py-0.5 rounded mr-2">
                                Transfer
                              </div>
                            )}
                            <span className="text-sm text-gray-500">
                              {formatDate(transaction.timestamp)}
                            </span>
                          </div>
                          
                          <h3 className="text-lg font-semibold text-gray-800 mb-1">
                            {transaction.type === 'TOPUP' 
                              ? `Top Up via ${transaction.provider}` 
                              : `Transfer ${transaction.senderName} → ${transaction.receiverName}`}
                          </h3>
                          
                          <p className="text-gray-600 text-sm mb-2">
                            {transaction.description}
                          </p>
                          
                          <div className={`font-bold text-lg ${delta.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                            {delta.isPositive ? '+' : '-'} Rp {delta.amount.toLocaleString('id-ID')}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Pagination Controls */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing <span className="font-medium">{transactions.length}</span> of <span className="font-medium">{totalItems}</span> transactions
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePageChange(0)}
                      disabled={currentPage === 0}
                      className={`px-3 py-1 rounded ${
                        currentPage === 0 
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                          : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                      }`}
                    >
                      First
                    </button>
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 0}
                      className={`px-3 py-1 rounded ${
                        currentPage === 0 
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                          : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                      }`}
                    >
                      Previous
                    </button>
                    <span className="px-3 py-1 bg-blue-500 text-white rounded">
                      {currentPage + 1}
                    </span>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages - 1}
                      className={`px-3 py-1 rounded ${
                        currentPage === totalPages - 1
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                          : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                      }`}
                    >
                      Next
                    </button>
                    <button
                      onClick={() => handlePageChange(totalPages - 1)}
                      disabled={currentPage === totalPages - 1}
                      className={`px-3 py-1 rounded ${
                        currentPage === totalPages - 1
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                          : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                      }`}
                    >
                      Last
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}