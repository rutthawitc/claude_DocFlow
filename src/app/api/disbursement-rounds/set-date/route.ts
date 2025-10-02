import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user has admin or district_manager role
    const userRoles = session.user.pwa?.roles || [];
    const isAdmin = userRoles.includes("admin");
    const isDistrictManager = userRoles.includes("district_manager");

    if (!isAdmin && !isDistrictManager) {
      return NextResponse.json(
        { error: "Forbidden: Only admin and district managers can set disbursement dates" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { documentIds, disbursementDate } = body;

    console.log("Received request:", { documentIds, disbursementDate });

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json(
        { error: "Document IDs are required" },
        { status: 400 }
      );
    }

    if (!disbursementDate) {
      return NextResponse.json(
        { error: "Disbursement date is required" },
        { status: 400 }
      );
    }

    // Parse and format the date
    const dateObj = new Date(disbursementDate);
    const formattedDate = dateObj.toISOString().split('T')[0]; // Format as YYYY-MM-DD

    console.log("Formatted date:", formattedDate);

    // Update disbursement date for selected documents
    const result = await db
      .update(documents)
      .set({
        disbursementDate: formattedDate,
        updatedAt: new Date(),
      })
      .where(inArray(documents.id, documentIds));

    console.log("Update result:", result);

    return NextResponse.json({
      success: true,
      message: `Updated ${documentIds.length} document(s) with disbursement date`,
    });
  } catch (error) {
    console.error("Error setting disbursement date:", error);
    console.error("Error details:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
