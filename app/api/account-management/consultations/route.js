import { NextResponse } from "next/server";
import {console} from "next/dist/compiled/@edge-runtime/primitives";

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

// GET /api/account-management/consultations
export async function GET(request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ message: 'Authorization header is missing or invalid' }), { status: 401 });
    }
    const token = authHeader.substring(7);
    const decodedPayload = decodeJwtPayload(token); // Still useful for logging or if other payload info is needed
    if (!decodedPayload) { // Simpler check if only existence matters
      return new Response(JSON.stringify({ message: 'Invalid token payload' }), { status: 401 });
    }

    // Fetch user profile directly using the /api/profile/me endpoint
    const profileUrl = `http://localhost:8080/api/profile/me`;
    console.log('[Consultations Route] Fetching user profile from URL:', profileUrl);
    const userDetailsResponse = await fetch(profileUrl, {
      headers: {
        'Authorization': authHeader
      }
    });
    // ini bisa
    console.log('[Consultations Route] Sent auth header to /api/profile/me:', authHeader);
    // console.log('[tesyak] ', userDetailsResponse)
    // console.log("coba", userDetailsResponse.json());

    if (!userDetailsResponse.ok) {
      const errorText = await userDetailsResponse.text();
      console.error('[Consultations Route] Failed to fetch user profile from /api/profile/me:', userDetailsResponse.status, errorText);
      return new Response(JSON.stringify({ message: 'Failed to fetch user profile', error: errorText }), { status: userDetailsResponse.status });
    }

    const userDetails = await userDetailsResponse.json();
    // udah bisa
    // console.log('[Consultations Route] User profile data from /api/profile/me:', JSON.stringify(userDetails));
    if (!userDetails || !userDetails.result.id || !userDetails.result.type) {
      console.error('[Consultations Route] User profile data from /api/profile/me is missing id or type.');
      return new Response(JSON.stringify({ message: 'User profile data is incomplete' }), { status: 404 });
    }

    const actualUserId = userDetails.result.id; // ID from the new endpoint
    const userRole = userDetails.result.type;   // Role from the new endpoint
    console.log('[Consultations Route] actualUserId from /api/profile/me:', actualUserId);
    console.log('[Consultations Route] userRole from /api/profile/me:', userRole);

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
    console.log('[Consultations Route] Fetching consultations from URL:', consultationUrl);

    if (!consultationsResponse.ok) {
      const errorBody = await consultationsResponse.text();
      console.error('[Consultations Route] Failed to fetch consultations - Status:', consultationsResponse.status, 'Body:', errorBody);
      return new Response(JSON.stringify({ message: 'Failed to fetch consultations', error: errorBody }), { status: consultationsResponse.status });
    }

    const rawConsultationsText = await consultationsResponse.text();
    console.log('[Consultations Route] Raw consultations response text:', rawConsultationsText);

    const parsedResponse = JSON.parse(rawConsultationsText);
    console.log('[Consultations Route] Parsed consultations data:', JSON.stringify(parsedResponse));

    if (parsedResponse && parsedResponse.consultations) {
        return new Response(JSON.stringify(parsedResponse.consultations), { status: 200 });
    } else {
        console.error('[Consultations Route] Consultations array not found in response or response is empty. Response was:', rawConsultationsText);
        return new Response(JSON.stringify([]), { status: 200 });
    }

  } catch (error) {
    console.error('Error in GET /api/account-management/consultations:', error.message, error.stack);
    return new Response(JSON.stringify({ message: 'Internal Server Error', error: error.message }), { status: 500 });
  }
}
