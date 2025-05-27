'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SchedulingPage() {
  const router = useRouter();
  const [userType, setUserType] = useState(null);

  useEffect(() => {
    // Get user type from localStorage or JWT token
    const token = localStorage.getItem('token');
    const userTypeStored = localStorage.getItem('userType');
    
    if (!token) {
      router.push('/authentication');
      return;
    }

    if (userTypeStored === 'CAREGIVER') {
      router.push('/scheduling/caregiver');
    } else if (userTypeStored === 'PACILIAN') {
      router.push('/scheduling/pacilian');
    } else {
      // If user type is not stored, you might need to decode JWT or make an API call
      setUserType('unknown');
    }
  }, [router]);

  if (userType === 'unknown') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Select Your Role</h1>
          <div className="space-x-4">
            <button
              onClick={() => router.push('/scheduling/caregiver')}
              className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600"
            >
              I'm a Caregiver
            </button>
            <button
              onClick={() => router.push('/scheduling/pacilian')}
              className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600"
            >
              I'm a Patient
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}