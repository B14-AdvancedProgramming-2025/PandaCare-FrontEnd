import { NextResponse } from "next/server";

// GET /api/account-management/consultations
export async function GET(request) {
  try {
    // TODO: Replace with actual API call to backend
    const response = await fetch(
      "http://localhost:8080/api/consultations/history",
      {
        headers: {
          Authorization: `Bearer ${request.headers.get("authorization")}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch consultation history");
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch consultation history" },
      { status: 500 }
    );
  }
}
