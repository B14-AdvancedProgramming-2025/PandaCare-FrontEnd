import { NextResponse } from "next/server";

// Helper function to decode JWT payload
function decodeJwtPayload(token) {
  try {
    const payloadPart = token.split('.')[1];
    if (!payloadPart) {
      throw new Error("Invalid JWT token format: Missing payload part.");
    }
    // Convert base64url to base64
    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    // Decode base64 and parse JSON (assuming Node.js environment with Buffer)
    const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Failed to decode JWT payload:", error.message);
    return null;
  }
}

// GET /api/account-management/profile
export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authorization header is missing or not Bearer type" },
        { status: 401 }
      );
    }

    // Directly fetch the user profile using the /api/profile/me endpoint
    const profileUrl = `http://localhost:8080/api/profile/me`;
    console.log('[Profile Route GET] Fetching user profile from URL:', profileUrl);
    const response = await fetch(
      profileUrl,
      {
        headers: {
          Authorization: authHeader, // Pass the original auth header
        },
      }
    );
    console.log('[Profile Route GET] Sent auth header to /api/profile/me:', authHeader);

    const responseText = await response.text(); // Read as text first for robust error handling
    console.log('[Profile Route GET] Response status from /api/profile/me:', response.status);
    console.log('[Profile Route GET] Response text from /api/profile/me:', responseText);

    if (!response.ok) {
      let errorData = { message: "Failed to fetch profile from /api/profile/me" };
      try {
        errorData = JSON.parse(responseText); // Try to parse error from backend
      } catch (e) {
        // If parsing fails, use the raw text or a default message
        errorData.rawError = responseText;
      }
      console.error('[Profile Route GET] Error fetching profile:', errorData);
      return NextResponse.json(
        { error: errorData.message || errorData.error || "Failed to fetch profile" },
        { status: response.status }
      );
    }

    const data = JSON.parse(responseText); // Parse the successful response

    // The backend /api/profile/me returns a structure like: { message: "...", result: { userData }, statusCode: ... }
    // We need to return the content of data.result to the frontend page
    if (data && data.result) {
      console.log('[Profile Route GET] Successfully fetched and parsed profile data:', data.result);
      return NextResponse.json(data.result); // Return the user data object
    } else {
      console.error('[Profile Route GET] Profile data from /api/profile/me is not in the expected format. Received:', data);
      return NextResponse.json(
        { error: "Profile data received from backend is not in the expected format." },
        { status: 500 } // Internal server error, as the BFF received unexpected data
      );
    }

  } catch (error) {
    console.error("GET Profile Error (Outer Catch):", error);
    return NextResponse.json(
      { error: "Failed to fetch profile due to an unexpected error" },
      { status: 500 }
    );
  }
}

// PUT /api/account-management/profile
export async function PUT(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authorization header is missing or not Bearer type" },
        { status: 401 }
      );
    }

    // Option 1: Use /api/profile/me to get ID, then PUT to /api/profile/{id}
    // This adds an extra call but keeps PUT logic centralized on the backend by ID.
    const profileMeUrl = `http://localhost:8080/api/profile/me`;
    const profileMeResponse = await fetch(profileMeUrl, { headers: { Authorization: authHeader } });
    
    if (!profileMeResponse.ok) {
        const errorText = await profileMeResponse.text();
        console.error("[Profile Route PUT] Failed to fetch user ID via /api/profile/me for PUT operation", profileMeResponse.status, errorText);
        return NextResponse.json({ error: "Failed to retrieve user identity for update."}, { status: profileMeResponse.status });
    }
    const profileMeData = await profileMeResponse.json();
    if (!profileMeData || !profileMeData.result || !profileMeData.result.id) {
        console.error("[Profile Route PUT] User ID not found in /api/profile/me response for PUT operation", profileMeData);
        return NextResponse.json({ error: "User identity not found in profile data."}, { status: 404 });
    }
    const actualUserId = profileMeData.result.id;
    console.log("[Profile Route PUT] Fetched user ID for PUT:", actualUserId);

    const body = await request.json();

    // Step 2: Use actualUserId to update the profile
    const updateUrl = `http://localhost:8080/api/profile/${actualUserId}`;
    console.log("[Profile Route PUT] Updating profile at URL:", updateUrl);
    const response = await fetch(
      updateUrl,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify(body),
      }
    );

    const responseText = await response.text();
    console.log("[Profile Route PUT] Response status from backend PUT:", response.status);
    console.log("[Profile Route PUT] Response text from backend PUT:", responseText);

    const data = JSON.parse(responseText);

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || data.error || "Failed to update profile" },
        { status: response.status }
      );
    }
    // Assuming the backend PUT to /api/profile/{id} also returns { message: ..., result: {updatedUser} }
    if (data && data.result) {
        return NextResponse.json(data.result);
    } else {
        // If the backend returns the updated user directly without nesting in 'result'
        // For example, if it just returns the User object.
        // Adjust this based on actual backend response for PUT /api/profile/{id}
        console.warn("[Profile Route PUT] Backend response for update might not be nested under 'result'. Returning data directly:", data);
        return NextResponse.json(data); 
    }

  } catch (error) {
    console.error("PUT Profile Error:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}

// DELETE /api/account-management/profile
export async function DELETE(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authorization header is missing or not Bearer type" },
        { status: 401 }
      );
    }

    // Similar to PUT, get user ID from /api/profile/me first
    const profileMeUrl = `http://localhost:8080/api/profile/me`;
    const profileMeResponse = await fetch(profileMeUrl, { headers: { Authorization: authHeader } });

    if (!profileMeResponse.ok) {
        const errorText = await profileMeResponse.text();
        console.error("[Profile Route DELETE] Failed to fetch user ID via /api/profile/me for DELETE operation", profileMeResponse.status, errorText);
        return NextResponse.json({ error: "Failed to retrieve user identity for delete."}, { status: profileMeResponse.status });
    }
    const profileMeData = await profileMeResponse.json();
    if (!profileMeData || !profileMeData.result || !profileMeData.result.id) {
        console.error("[Profile Route DELETE] User ID not found in /api/profile/me response for DELETE operation", profileMeData);
        return NextResponse.json({ error: "User identity not found in profile data."}, { status: 404 });
    }
    const actualUserId = profileMeData.result.id;
    console.log("[Profile Route DELETE] Fetched user ID for DELETE:", actualUserId);

    // Step 2: Use actualUserId to delete the profile
    const deleteUrl = `http://localhost:8080/api/profile/${actualUserId}`;
    console.log("[Profile Route DELETE] Deleting profile at URL:", deleteUrl);
    const response = await fetch(
      deleteUrl,
      {
        method: "DELETE",
        headers: {
          Authorization: authHeader,
        },
      }
    );
    
    const responseText = await response.text(); // Read as text first
    console.log("[Profile Route DELETE] Response status from backend DELETE:", response.status);
    console.log("[Profile Route DELETE] Response text from backend DELETE:", responseText);

    // For DELETE, backend might return 204 No Content or a JSON message
    if (response.status === 204) {
        return NextResponse.json({ message: "Profile deleted successfully" }, { status: 200 }); // Or 204 if client handles it
    }

    const data = JSON.parse(responseText); // Try to parse if not 204

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || data.error || "Failed to delete profile" },
        { status: response.status }
      );
    }

    // Assuming backend returns { message: ..., result: ... } or similar for successful delete with content
    if (data && data.result) {
        return NextResponse.json(data.result);
    } else if (data) {
        return NextResponse.json(data); // Return whatever JSON was sent
    }
    // Fallback if response was ok but no parsable JSON content and not 204
    return NextResponse.json({ message: "Profile delete action processed" }, { status: response.status });

  } catch (error) {
    console.error("DELETE Profile Error:", error);
    return NextResponse.json(
      { error: "Failed to delete profile" },
      { status: 500 }
    );
  }
}
