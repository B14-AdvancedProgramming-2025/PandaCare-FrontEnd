import { NextResponse } from "next/server";

// Helper function to decode JWT payload
function decodeJwtPayload(token) {
  try {
    const payloadPart = token.split('.')[1];
    if (!payloadPart) {
      throw new Error("Invalid JWT token format: Missing payload part.");
    }
    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Failed to decode JWT payload:", error.message);
    return null;
  }
}

// Helper function to get user ID by email
// IMPORTANT: Verify the endpoint and response structure with your backend team.
async function getUserIdByEmail(email, authHeader) {
  try {
    const userLookupUrl = `http://localhost:8080/api/account-management/users/search/findByEmail?email=${encodeURIComponent(email)}`;
    const response = await fetch(userLookupUrl, {
      headers: {
        Authorization: authHeader,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Failed to look up user by email" }));
      console.error(`Failed to find user by email ${email}: ${response.status} - ${errorData.message}`);
      return null;
    }

    const userData = await response.json();
    if (!userData || !userData.id) {
      console.error(`User data for email ${email} does not contain an 'id' field or is invalid.`);
      return null;
    }
    return userData.id;
  } catch (error) {
    console.error(`Error fetching user ID by email ${email}:`, error.message);
    return null;
  }
}

// GET /api/account-management/consultations
export async function GET(request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ message: 'Authorization header is missing or invalid' }), { status: 401 });
    }
    const token = authHeader.substring(7);
    const decodedPayload = decodeJwtPayload(token);
    if (!decodedPayload || !decodedPayload.sub) {
      return new Response(JSON.stringify({ message: 'Invalid token payload' }), { status: 401 });
    }
    const email = decodedPayload.sub;

    const actualUserId = await getUserIdByEmail(email, authHeader);
    console.log('[Consultations Route] actualUserId:', actualUserId); // Log actualUserId
    if (!actualUserId) {
      return new Response(JSON.stringify({ message: 'User ID not found for the given email' }), { status: 404 });
    }

    // Fetch user details to get the role
    const userDetailsResponse = await fetch(`http://localhost:8080/api/account-management/users/${actualUserId}`, {
      headers: {
        'Authorization': authHeader
      }
    });

    if (!userDetailsResponse.ok) {
      console.error('Failed to fetch user details:', userDetailsResponse.status, await userDetailsResponse.text());
      return new Response(JSON.stringify({ message: 'Failed to fetch user details' }), { status: userDetailsResponse.status });
    }

    const userDetails = await userDetailsResponse.json();
    console.log('[Consultations Route] userDetails:', JSON.stringify(userDetails)); // Log userDetails
    const userRole = userDetails.type;
    console.log('[Consultations Route] userRole:', userRole); // Log userRole

    let consultationsResponse;
    let consultationUrl;
    if (userRole === 'PACILIAN') {
      consultationUrl = `http://localhost:8080/api/scheduling/pacilian/consultations`;
      consultationsResponse = await fetch(consultationUrl, {
        headers: {
          'Authorization': authHeader
        }
      });
    } else if (userRole === 'CAREGIVER') {
      consultationUrl = `http://localhost:8080/api/scheduling/caregiver/consultations`;
      consultationsResponse = await fetch(consultationUrl, {
        headers: {
          'Authorization': authHeader
        }
      });
    } else {
      console.error('[Consultations Route] Unknown user role:', userRole);
      return new Response(JSON.stringify({ message: 'Unknown user role' }), { status: 400 });
    }
    console.log('[Consultations Route] Fetching consultations from URL:', consultationUrl); // Log consultation URL

    if (!consultationsResponse.ok) {
      const errorBody = await consultationsResponse.text();
      console.error('[Consultations Route] Failed to fetch consultations - Status:', consultationsResponse.status, 'Body:', errorBody); // Log error details
      return new Response(JSON.stringify({ message: 'Failed to fetch consultations', error: errorBody }), { status: consultationsResponse.status });
    }

    const rawConsultationsText = await consultationsResponse.text(); // Get raw text first
    console.log('[Consultations Route] Raw consultations response text:', rawConsultationsText); // Log raw text

    const parsedResponse = JSON.parse(rawConsultationsText); // Parse text to JSON
    console.log('[Consultations Route] Parsed consultations data:', JSON.stringify(parsedResponse)); // Log parsed data

    // Return only the consultations array
    if (parsedResponse && parsedResponse.consultations) {
        return new Response(JSON.stringify(parsedResponse.consultations), { status: 200 });
    } else {
        // Handle cases where the structure might be different or empty
        console.error('[Consultations Route] Consultations array not found in response or response is empty. Response was:', rawConsultationsText);
        return new Response(JSON.stringify([]), { status: 200 }); // Return empty array
    }

  } catch (error) {
    console.error('Error in GET /api/account-management/consultations:', error.message, error.stack);
    return new Response(JSON.stringify({ message: 'Internal Server Error', error: error.message }), { status: 500 });
  }
}
