"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AccountManagement() {
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [consultationHistory, setConsultationHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    type: "",
    // Pacilian specific fields
    medicalHistory: [],
    // Caregiver specific fields
    specialty: "",
    workingSchedule: [],
  });

  useEffect(() => {
    fetchUserData();
    fetchConsultationHistory();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await fetch("/api/account-management/profile", {
        headers: {
          "x-user-id": localStorage.getItem("userId"),
          authorization: `Bearer ${localStorage.getItem("token")}`,
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
      const response = await fetch("/api/account-management/consultations", {
        headers: {
          "x-user-id": localStorage.getItem("userId"),
          authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await response.json();
      setConsultationHistory(data);
    } catch (error) {
      console.error("Error fetching consultation history:", error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

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
      // Ensure we're not sending NIK in the update request
      const updateData = {
        name: formData.name,
        address: formData.address,
        phone: formData.phone,
        type: formData.type,
      };

      // Add type-specific fields
      if (userData?.type === "PACILIAN") {
        updateData.medicalHistory = formData.medicalHistory;
      } else if (userData?.type === "CAREGIVER") {
        updateData.specialty = formData.specialty;
        updateData.workingSchedule = formData.workingSchedule;
      }

      const response = await fetch("/api/account-management/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": localStorage.getItem("userId"),
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
            "x-user-id": localStorage.getItem("userId"),
            authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to delete account");
        }

        localStorage.removeItem("token");
        localStorage.removeItem("userId");
        router.push("/authentication/login");
      } catch (error) {
        console.error("Error deleting account:", error);
        alert(error.message);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">
          Account Management
        </h1>

        {/* Profile Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-800">
              Profile Information
            </h2>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              {isEditing ? "Cancel" : "Edit Profile"}
            </button>
          </div>

          {isEditing ? (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Address
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  rows="3"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
                />
              </div>

              {/* Pacilian specific fields */}
              {userData?.type === "PACILIAN" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Medical History (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={formData.medicalHistory?.join(", ")}
                    onChange={(e) =>
                      handleArrayInputChange(e, "medicalHistory")
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
                  />
                </div>
              )}

              {/* Caregiver specific fields */}
              {userData?.type === "CAREGIVER" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Specialty
                    </label>
                    <input
                      type="text"
                      name="specialty"
                      value={formData.specialty}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Working Schedule
                    </label>
                    <div className="mt-2 space-y-2">
                      {formData.workingSchedule?.map((schedule, index) => (
                        <div
                          key={index}
                          className="flex items-center space-x-2"
                        >
                          <input
                            type="text"
                            value={schedule}
                            onChange={(e) => {
                              const newSchedule = [...formData.workingSchedule];
                              newSchedule[index] = e.target.value;
                              setFormData((prev) => ({
                                ...prev,
                                workingSchedule: newSchedule,
                              }));
                            }}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              >
                Save Changes
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700">Name</h3>
                <p className="mt-1 text-gray-900">{userData?.name}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700">Email</h3>
                <p className="mt-1 text-gray-900">{userData?.email}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700">NIK</h3>
                <p className="mt-1 text-gray-900">{userData?.nik}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700">Phone</h3>
                <p className="mt-1 text-gray-900">{userData?.phone}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700">Address</h3>
                <p className="mt-1 text-gray-900">{userData?.address}</p>
              </div>

              {/* Pacilian specific fields */}
              {userData?.type === "PACILIAN" && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700">
                    Medical History
                  </h3>
                  <div className="mt-1">
                    {userData?.medicalHistory?.length > 0 ? (
                      <ul className="list-disc list-inside text-gray-900">
                        {userData.medicalHistory.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-600">
                        No medical history recorded
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Caregiver specific fields */}
              {userData?.type === "CAREGIVER" && (
                <>
                  <div>
                    <h3 className="text-sm font-medium text-gray-700">
                      Specialty
                    </h3>
                    <p className="mt-1 text-gray-900">{userData?.specialty}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-700">
                      Working Schedule
                    </h3>
                    <div className="mt-1">
                      {userData?.workingSchedule?.length > 0 ? (
                        <ul className="list-disc list-inside text-gray-900">
                          {userData.workingSchedule.map((schedule, index) => (
                            <li key={index}>{schedule}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-gray-600">No working schedule set</p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Consultation History Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-6 text-gray-800">
            Consultation History
          </h2>
          <div className="space-y-4">
            {consultationHistory.length > 0 ? (
              consultationHistory.map((consultation, index) => (
                <div key={index} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">
                        {userData?.type === "CAREGIVER" ? "Patient" : "Doctor"}:{" "}
                        {consultation.partnerName}
                      </p>
                      <p className="text-sm text-gray-700">
                        Date:{" "}
                        {new Date(
                          consultation.consultationTime
                        ).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-700">
                        Time:{" "}
                        {new Date(
                          consultation.consultationTime
                        ).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  {consultation.notes && (
                    <p className="mt-2 text-sm text-gray-700">
                      Notes: {consultation.notes}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-gray-600 text-center">
                No consultation history available.
              </p>
            )}
          </div>
        </div>

        {/* Delete Account Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">
            Danger Zone
          </h2>
          <p className="text-gray-700 mb-4">
            Once you delete your account, there is no going back. Please be
            certain.
          </p>
          <button
            onClick={handleDeleteAccount}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}
