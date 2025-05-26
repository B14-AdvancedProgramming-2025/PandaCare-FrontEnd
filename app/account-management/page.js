"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AccountManagement() {
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [consultationHistory, setConsultationHistory] = useState([]);
  const [detailedConsultationHistory, setDetailedConsultationHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    type: "",
    medicalHistory: [],
    specialty: "",
    workingSchedule: [],
  });

  useEffect(() => {
    fetchUserData();
    fetchConsultationHistory();
  }, []);

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem("token");

      console.log("Token:", token);  // Cek isi token
      const response = await fetch("/api/account-management/profile", {
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch profile");
      }

      const data = await response.json();
      setUserData(data);
      setFormData({
        name: data.name || "",
        address: data.address || "",
        phone: data.phone || "",
        type: data.type || "",
        medicalHistory: data.medicalHistory || [],
        specialty: data.specialty || "",
        // workingSchedule is populated from userData for display purposes
        workingSchedule: data.workingSchedule || [], 
      });
      setLoading(false);
    } catch (error) {
      console.error("Error fetching user data:", error);
      alert(error.message);
      setLoading(false);
    }
  };

  const fetchConsultationHistory = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/account-management/consultations", {
        headers: {
          authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to fetch consultation history:", response.status, errorText);
        throw new Error(`Failed to fetch consultation history: ${response.status}`);
    }
      const data = await response.json();
      setConsultationHistory(data);
    } catch (error) {
      console.error("Error fetching consultation history:", error);
      setLoading(false);
    }
  };
  
  useEffect(() => {
    const augmentAndSetHistory = async () => {
      if (userData && consultationHistory && consultationHistory.length > 0) {
        setLoading(true);

        const augmented = consultationHistory.map((consultation) => {
          const partnerId = userData.type === "PACILIAN" ? consultation.caregiverId : consultation.pacilianId;
          const partnerDisplay = partnerId ? `Partner ID: ${partnerId}` : "N/A";
          return { ...consultation, partnerName: partnerDisplay };
        });

        setDetailedConsultationHistory(augmented);
        setLoading(false);
      } else if (consultationHistory) {
        setDetailedConsultationHistory([]);
        if (userData) setLoading(false);
      }
    };

    augmentAndSetHistory();
  }, [userData, consultationHistory]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Remove handleWorkingScheduleChange, addWorkingSchedule, removeWorkingSchedule functions
  // as workingSchedule is now read-only in this form.

  const handleArrayInputChange = (e, field) => {
    const { value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [field]: value.split(",").map((item) => item.trim()),
    }));
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const updateData = {
        name: formData.name,
        address: formData.address,
        phone: formData.phone,
        type: formData.type, 
      };

      if (userData?.type === "PACILIAN") {
        updateData.medicalHistory = formData.medicalHistory;
      } else if (userData?.type === "CAREGIVER") {
        updateData.specialty = formData.specialty;
        // Do not include workingSchedule in the update payload 
        // as it is read-only in this form.
        // updateData.workingSchedule = formData.workingSchedule; // This line is removed/commented out
      }

      const response = await fetch("/api/account-management/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 400 && error.message?.includes("NIK")) {
          throw new Error("NIK cannot be changed");
        }
        throw new Error(error.error || "Failed to update profile");
      }

      const data = await response.json();
      setUserData(data);
      setIsEditing(false);
      alert("Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert(error.message);
    }
  };

  const handleDeleteAccount = async () => {
    if (
      window.confirm(
        "Are you sure you want to delete your account? This action cannot be undone."
      )
    ) {
      try {
        const response = await fetch("/api/account-management/profile", {
          method: "DELETE",
          headers: {
            authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to delete account");
        }

        localStorage.removeItem("token");
        localStorage.removeItem("userId");
        router.push("/authentication");
      } catch (error) {
        console.error("Error deleting account:", error);
        alert(error.message);
      }
    }
  };

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!userData) {
    return <p>No user data found.</p>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Account Management</h1>

      {/* Profile Section */}
      <div className="mb-8 p-4 border rounded shadow">
        <h2 className="text-xl font-semibold mb-2">Profile</h2>
        {isEditing ? (
          <form onSubmit={handleUpdateProfile}>
            <div className="mb-2">
              <label className="block text-sm font-medium text-gray-700">Name:</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            <div className="mb-2">
              <label className="block text-sm font-medium text-gray-700">Address:</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            <div className="mb-2">
              <label className="block text-sm font-medium text-gray-700">Phone:</label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            {userData.type === "PACILIAN" && (
              <div className="mb-2">
                <label className="block text-sm font-medium text-gray-700">Medical History (comma-separated):</label>
                <input
                  type="text"
                  name="medicalHistory"
                  value={formData.medicalHistory.join(", ")}
                  onChange={(e) => handleArrayInputChange(e, "medicalHistory")}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            )}
            {userData.type === "CAREGIVER" && (
              <>
                <div className="mb-2">
                  <label className="block text-sm font-medium text-gray-700">Specialty:</label>
                  <input
                    type="text"
                    name="specialty"
                    value={formData.specialty}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                {/* Display Working Schedule as read-only */}
                <div className="mb-2">
                  <label className="block text-sm font-medium text-gray-700">Working Schedule (Read-only):</label>
                  {formData.workingSchedule && formData.workingSchedule.length > 0 ? (
                    <ul className="list-disc pl-5 mt-1 text-sm text-gray-900">
                      {formData.workingSchedule.map((schedule, index) => (
                        <li key={schedule.id || index}>
                          {schedule.startTime} - {schedule.endTime} (Status: {schedule.status}, Available: {schedule.available ? 'Yes' : 'No'})
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-sm text-gray-900">N/A</p>
                  )}
                </div>
              </>
            )}
            <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded mr-2">Save Changes</button>
            <button type="button" onClick={() => setIsEditing(false)} className="bg-gray-300 px-4 py-2 rounded">Cancel</button>
          </form>
        ) : (
          <>
            <p><strong>Name:</strong> {userData.name}</p>
            <p><strong>Email:</strong> {userData.email}</p>
            <p><strong>Address:</strong> {userData.address}</p>
            <p><strong>Phone:</strong> {userData.phone}</p>
            <p><strong>Type:</strong> {userData.type}</p>
            {userData.type === "PACILIAN" && (
              <p><strong>Medical History:</strong> {userData.medicalHistory?.join(", ") || "N/A"}</p>
            )}
            {userData.type === "CAREGIVER" && (
              <>
                <p><strong>Specialty:</strong> {userData.specialty || "N/A"}</p>
                <div><strong>Working Schedule:</strong>
                  {userData.workingSchedule && userData.workingSchedule.length > 0 ? (
                    <ul className="list-disc pl-5">
                      {userData.workingSchedule.map((schedule, index) => (
                        <li key={schedule.id || index}> {/* Use schedule.id if available for key */}
                          {/* Assuming startTime and endTime are already formatted strings from backend DTO */}
                          {schedule.startTime} - {schedule.endTime} (Status: {schedule.status}, Available: {schedule.available ? 'Yes' : 'No'})
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>N/A</p>
                  )}
                </div>
              </>
            )}
            <button onClick={() => setIsEditing(true)} className="mt-2 bg-blue-500 text-white px-4 py-2 rounded">Edit Profile</button>
          </>
        )}
      </div>

      {/* Consultation History Section */}
      <div className="mb-8 p-4 border rounded shadow">
        <h2 className="text-xl font-semibold mb-2">Consultation History</h2>
        {detailedConsultationHistory.length > 0 ? (
          <ul>
            {detailedConsultationHistory.map((consultation, index) => (
              <li key={index} className="mb-4 p-2 border-b">
                <p><strong>{consultation.partnerName}</strong></p> {/* Changed to display partner ID string */}
                <p>Start Time: {new Date(consultation.startTime).toLocaleString()}</p>
                <p>End Time: {new Date(consultation.endTime).toLocaleString()}</p>
                <p>Status: {consultation.status}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p>No consultation history found.</p>
        )}
      </div>
      {/* ... existing delete account button ... */}
      <button
        onClick={handleDeleteAccount}
        className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
      >
        Delete Account
      </button>
    </div>
  );
}
