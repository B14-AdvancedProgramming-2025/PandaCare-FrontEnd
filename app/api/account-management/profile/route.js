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

// Helper function to get user ID by email
async function getUserIdByEmail(email, authHeader) {
  try {
    const userLookupUrl = `http://localhost:8080/api/account-management/users/search/findByEmail?email=${encodeURIComponent(email)}`;
    const response = await fetch(userLookupUrl, {
      headers: {
        Authorization: authHeader,
      },
    });

    const responseText = await response.text(); // Get response as text first

    if (!response.ok) {
      console.error(`Failed to find user by email ${email}: ${response.status}. Response text: ${responseText}`);
      // Attempt to parse errorData as JSON from responseText if possible, otherwise use a default message.
      let errorDetail = "Failed to look up user by email";
      try {
        const errorJson = JSON.parse(responseText);
        errorDetail = errorJson.message || errorDetail;
      } catch (e) {
        // Ignore if responseText is not JSON, errorDetail remains the default
      }
      console.error(`Error detail: ${errorDetail}`);
      return null;
    }

    try {
      const userData = JSON.parse(responseText); // Parse the text
      // Assumed the response object has an 'id' field for the user ID.
      // If the endpoint returns the user object directly and it's not nested,
      // and if the user object itself is the ID (less common), adjust accordingly.
      // For Spring Data REST, if findByEmail returns a single user, userData might be the user object.
      if (!userData || typeof userData.id === 'undefined') { // Check for undefined explicitly if id can be 0 or other falsy values
        console.error(`User data for email ${email} does not contain an 'id' field or is invalid. Received: ${responseText}`);
        return null;
      }
      return userData.id;
    } catch (parseError) {
      console.error(`Error parsing JSON for email ${email}: ${parseError.message}. Received text: ${responseText}`);
      return null;
    }

  } catch (error) {
    console.error(`Error fetching user ID by email ${email}:`, error.message);
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

    const token = authHeader.split(" ")[1];
    const decodedPayload = decodeJwtPayload(token);

    if (!decodedPayload || !decodedPayload.sub) {
      return NextResponse.json(
        { error: "Invalid token or missing user identifier (sub)" },
        { status: 401 }
      );
    }
    const email = decodedPayload.sub; // This is the email

    // Step 1: Get the actual userId using the email
    const actualUserId = await getUserIdByEmail(email, authHeader);

    if (!actualUserId) {
      return NextResponse.json(
        { error: `User ID not found for email: ${email}. Please ensure the email is registered and the lookup endpoint is correct.` },
        { status: 404 }
      );
    }

    // Step 2: Use actualUserId to fetch the profile
    const response = await fetch(
      `http://localhost:8080/api/profile/${actualUserId}`,
      {
        headers: {
          Authorization: authHeader,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || "Failed to fetch profile" },
        { status: response.status }
      );
    }

    return NextResponse.json(data.result);
  } catch (error) {
    console.error("GET Profile Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
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

    const token = authHeader.split(" ")[1];
    const decodedPayload = decodeJwtPayload(token);

    if (!decodedPayload || !decodedPayload.sub) {
      return NextResponse.json(
        { error: "Invalid token or missing user identifier (sub)" },
        { status: 401 }
      );
    }
    const email = decodedPayload.sub; // This is the email

    // Step 1: Get the actual userId using the email
    const actualUserId = await getUserIdByEmail(email, authHeader);

    if (!actualUserId) {
      return NextResponse.json(
        { error: `User ID not found for email: ${email}. Please ensure the email is registered and the lookup endpoint is correct.` },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Step 2: Use actualUserId to update the profile
    const response = await fetch(
      `http://localhost:8080/api/profile/${actualUserId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || "Failed to update profile" },
        { status: response.status }
      );
    }

    return NextResponse.json(data.result);
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

    const token = authHeader.split(" ")[1];
    const decodedPayload = decodeJwtPayload(token);

    if (!decodedPayload || !decodedPayload.sub) {
      return NextResponse.json(
        { error: "Invalid token or missing user identifier (sub)" },
        { status: 401 }
      );
    }
    const email = decodedPayload.sub; // This is the email

    // Step 1: Get the actual userId using the email
    const actualUserId = await getUserIdByEmail(email, authHeader);

    if (!actualUserId) {
      return NextResponse.json(
        { error: `User ID not found for email: ${email}. Please ensure the email is registered and the lookup endpoint is correct.` },
        { status: 404 }
      );
    }

    // Step 2: Use actualUserId to delete the profile
    const response = await fetch(
      `http://localhost:8080/api/profile/${actualUserId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: authHeader,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || "Failed to delete profile" },
        { status: response.status }
      );
    }

    return NextResponse.json(data.result);
  } catch (error) {
    console.error("DELETE Profile Error:", error);
    return NextResponse.json(
      { error: "Failed to delete profile" },
      { status: 500 }
    );
  }
}
