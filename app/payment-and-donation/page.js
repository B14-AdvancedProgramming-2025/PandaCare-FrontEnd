'use client';

import { useState, useEffect } from 'react';

export default function PaymentAndDonation() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/payment-and-donation')
      .then(res => res.json())
      .then(data => {
        setData(data);
        setLoading(false);
      });
  }, []);

  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="text-center">
        <p>This is the payment-and-donation page "/payment-and-donation".</p>
        {loading ? (
          <p className="mt-4 text-gray-400">Loading API...</p>
        ) : (
          <p className="mt-4 text-gray-400">{data.message}</p>
        )}
      </div>
    </div>
  );
} 