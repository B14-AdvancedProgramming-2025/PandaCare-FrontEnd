const API_BASE_URL = 'http://localhost:8080/api/scheduling';

// Helper function to get auth token from localStorage
const getAuthToken = () => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('token');
    }
    return null;
};

// Helper function to create auth headers
const getAuthHeaders = () => {
    const token = getAuthToken();
    return {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
    };
};

// Caregiver API functions
export const caregiverApi = {
    // Get caregiver consultations
    getConsultations: async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/caregiver/consultations`, {
                method: 'GET',
                headers: getAuthHeaders(),
                credentials: 'include',
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error fetching consultations:', error);
            throw error;
        }
    },

    // Get caregiver schedules
    getSchedules: async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/caregiver/schedules`, {
                method: 'GET',
                headers: getAuthHeaders(),
                credentials: 'include',
            });
            
            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error response:', errorText);
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }
            
            const data = await response.json();
            console.log('Success response:', data);
            return data;
        } catch (error) {
            console.error('Error fetching schedules:', error);
            throw error;
        }
    },

    // Create schedule
    createSchedule: async (startTime, endTime) => {
        try {
            console.log('Sending to API:', { startTime, endTime });
            
            const response = await fetch(`${API_BASE_URL}/caregiver/schedules`, {
                method: 'POST',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    startTime: startTime,
                    endTime: endTime
                }),
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error response:', errorText);
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error creating schedule:', error);
            throw error;
        }
    },

    // Modify schedule
    modifySchedule: async (oldStartTime, oldEndTime, newStartTime, newEndTime) => {
        try {
            console.log('Modifying schedule with:', {
                oldStartTime,
                oldEndTime,
                newStartTime,
                newEndTime
            });
            
            const response = await fetch(`${API_BASE_URL}/caregiver/schedules`, {  // Remove '/modify'
                method: 'PUT',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    oldStartTime: oldStartTime,
                    oldEndTime: oldEndTime,
                    newStartTime: newStartTime,
                    newEndTime: newEndTime
                }),
            });
            
            console.log('Modify response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Modify error response:', errorText);
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }
            
            const result = await response.json();
            console.log('Modify success response:', result);
            return result;
        } catch (error) {
            console.error('Error modifying schedule:', error);
            throw error;
        }
    },

    // Accept Consultation
    acceptConsultation: async (pacilianId, startTime, endTime) => {
        try {
            const response = await fetch(`${API_BASE_URL}/caregiver/consultations/accept`, {
                method: 'PUT',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    pacilianId: pacilianId,
                    startTime: startTime,
                    endTime: endTime
                }),
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error accepting consultation:', error);
            throw error;
        }
    },

    // Reject Consultation
    rejectConsultation: async (pacilianId, startTime, endTime) => {
        try {
            const response = await fetch(`${API_BASE_URL}/caregiver/consultations/reject`, {
                method: 'PUT',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    pacilianId: pacilianId,
                    startTime: startTime,
                    endTime: endTime
                }),
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error rejecting consultation:', error);
            throw error;
        }
    },

    // Delete schedule
    deleteSchedule: async (startTime, endTime) => {
        try {
            const response = await fetch(`${API_BASE_URL}/caregiver/schedules`, {
                method: 'DELETE',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    startTime: startTime,
                    endTime: endTime
                }),
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error deleting schedule:', error);
            throw error;
        }
    }
};

// Pacilian API functions
export const pacilianApi = {
    // Get pacilian consultations
    getConsultations: async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/pacilian/consultations`, {
                method: 'GET',
                headers: getAuthHeaders(),
                credentials: 'include',
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error response:', errorText);
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }
            
            const data = await response.json();
            console.log('Consultations response:', data);
            return data;
        } catch (error) {
            console.error('Error fetching consultations:', error);
            throw error;
        }
    },

    // Find available caregivers
    findAvailableCaregivers: async (startTime, endTime, specialty = null) => {
        try {
            let url = `${API_BASE_URL}/pacilian/available-caregivers?startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(endTime)}`;
            if (specialty && specialty !== 'all') {
                url += `&specialty=${encodeURIComponent(specialty)}`;
            }
            
            const response = await fetch(url, {
                method: 'GET',
                headers: getAuthHeaders(),
                credentials: 'include',
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error finding caregivers:', error);
            throw error;
        }
    },

    // Book consultation
    bookConsultation: async (caregiverId, startTime, endTime) => {
        try {
            const response = await fetch(`${API_BASE_URL}/pacilian/consultations`, {
                method: 'POST',
                headers: getAuthHeaders(),
                credentials: 'include',
                body: JSON.stringify({
                    caregiverId,
                    startTime,
                    endTime
                }),
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error booking consultation:', error);
            throw error;
        }
    },
};