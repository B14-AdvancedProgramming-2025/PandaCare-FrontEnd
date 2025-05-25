'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Register() {
  const router = useRouter();
  const [userType, setUserType] = useState('PACILIAN');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Common fields
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    nik: '',
    address: '',
    phone: ''
  });

  // Pacilian specific fields
  const [medicalHistory, setMedicalHistory] = useState(['']);
  
  // Caregiver specific fields
  const [specialty, setSpecialty] = useState('');
  const [workingSchedule, setWorkingSchedule] = useState(['']);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUserTypeChange = (e) => {
    setUserType(e.target.value);
  };

  // Handle medical history array changes
  const handleMedicalHistoryChange = (index, value) => {
    const updatedMedicalHistory = [...medicalHistory];
    updatedMedicalHistory[index] = value;
    setMedicalHistory(updatedMedicalHistory);
  };

  const addMedicalHistoryField = () => {
    setMedicalHistory([...medicalHistory, '']);
  };

  const removeMedicalHistoryField = (index) => {
    const updatedMedicalHistory = [...medicalHistory];
    updatedMedicalHistory.splice(index, 1);
    setMedicalHistory(updatedMedicalHistory);
  };

  // Handle working schedule array changes
  const handleWorkingScheduleChange = (index, value) => {
    const updatedWorkingSchedule = [...workingSchedule];
    updatedWorkingSchedule[index] = value;
    setWorkingSchedule(updatedWorkingSchedule);
  };

  const addWorkingScheduleField = () => {
    setWorkingSchedule([...workingSchedule, '']);
  };

  const removeWorkingScheduleField = (index) => {
    const updatedWorkingSchedule = [...workingSchedule];
    updatedWorkingSchedule.splice(index, 1);
    setWorkingSchedule(updatedWorkingSchedule);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Prepare request body based on user type
    let requestBody = {
      ...formData,
    };

    if (userType === 'PACILIAN') {
      requestBody = {
        ...requestBody,
        medicalHistory: medicalHistory.filter(item => item.trim() !== '')
      };
    } else {
      requestBody = {
        ...requestBody,
        specialty,
        workingSchedule: workingSchedule.filter(item => item.trim() !== '')
      };
    }

    try {
      const response = await fetch(`http://localhost:8080/api/auth/register/${userType.toLowerCase()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      setSuccess('Registration successful! Redirecting to login page...');
      
      // Redirect to login page after successful registration
      setTimeout(() => {
        router.push('/authentication');
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-2xl">
        <h1 className="text-2xl font-bold text-center mb-6">Register for PandaCare</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          {/* User Type Selection */}
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Register as
            </label>
            <div className="flex space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  value="PACILIAN"
                  checked={userType === 'PACILIAN'}
                  onChange={handleUserTypeChange}
                  className="form-radio"
                />
                <span className="ml-2">Pacilian</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  value="CAREGIVER"
                  checked={userType === 'CAREGIVER'}
                  onChange={handleUserTypeChange}
                  className="form-radio"
                />
                <span className="ml-2">Caregiver</span>
              </label>
            </div>
          </div>

          {/* Common Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="mb-4">
              <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2">
                Email*
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="user@example.com"
                required
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="password" className="block text-gray-700 text-sm font-bold mb-2">
                Password*
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="••••••••"
                required
              />
            </div>

            <div className="mb-4">
              <label htmlFor="name" className="block text-gray-700 text-sm font-bold mb-2">
                Full Name*
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="John Doe"
                required
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="nik" className="block text-gray-700 text-sm font-bold mb-2">
                NIK (National ID)*
              </label>
              <input
                type="text"
                id="nik"
                name="nik"
                value={formData.nik}
                onChange={handleChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="1234567890123456"
                required
              />
            </div>

            <div className="mb-4">
              <label htmlFor="phone" className="block text-gray-700 text-sm font-bold mb-2">
                Phone Number*
              </label>
              <input
                type="text"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="08123456789"
                required
              />
            </div>

            <div className="mb-4 md:col-span-2">
              <label htmlFor="address" className="block text-gray-700 text-sm font-bold mb-2">
                Address*
              </label>
              <textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="123 Main Street, City"
                rows="2"
                required
              ></textarea>
            </div>
          </div>

          {/* Conditional Fields Based on User Type */}
          {userType === 'PACILIAN' ? (
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Medical History
              </label>
              {medicalHistory.map((item, index) => (
                <div key={index} className="flex mb-2">
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => handleMedicalHistoryChange(index, e.target.value)}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    placeholder="e.g., Asthma, Allergies"
                  />
                  <button
                    type="button"
                    onClick={() => removeMedicalHistoryField(index)}
                    className="ml-2 bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                    disabled={medicalHistory.length === 1}
                  >
                    -
                  </button>
                  {index === medicalHistory.length - 1 && (
                    <button
                      type="button"
                      onClick={addMedicalHistoryField}
                      className="ml-2 bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                    >
                      +
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="mb-4">
                <label htmlFor="specialty" className="block text-gray-700 text-sm font-bold mb-2">
                  Specialty*
                </label>
                <input
                  type="text"
                  id="specialty"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="e.g., Elder Care, Pediatric Care"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Working Schedule
                </label>
                {workingSchedule.map((item, index) => (
                  <div key={index} className="flex mb-2">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => handleWorkingScheduleChange(index, e.target.value)}
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      placeholder="e.g., Monday 9-5"
                    />
                    <button
                      type="button"
                      onClick={() => removeWorkingScheduleField(index)}
                      className="ml-2 bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                      disabled={workingSchedule.length === 1}
                    >
                      -
                    </button>
                    {index === workingSchedule.length - 1 && (
                      <button
                        type="button"
                        onClick={addWorkingScheduleField}
                        className="ml-2 bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                      >
                        +
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
          
          <div className="flex items-center justify-between mt-6">
            <button
              type="submit"
              disabled={loading}
              className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Registering...' : 'Register'}
            </button>
          </div>
          
          <div className="text-center mt-4">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/authentication" className="text-blue-500 hover:underline">
                Login here
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}