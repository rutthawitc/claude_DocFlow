import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { eq, inArray, and, isNotNull } from "drizzle-orm";

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
        { error: "Forbidden: Only admin and district managers can confirm disbursements" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { documentIds } = body;

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json(
        { error: "Document IDs are required" },
        { status: 400 }
      );
    }

    // Verify all selected documents have disbursementDate set
    const docsToConfirm = await db
      .select()
      .from(documents)
      .where(
        and(
          inArray(documents.id, documentIds),
          isNotNull(documents.disbursementDate)
        )
      );

    if (docsToConfirm.length !== documentIds.length) {
      return NextResponse.json(
        { error: "All selected documents must have a disbursement date set" },
        { status: 400 }
      );
    }

    // Update disbursement confirmation for selected documents
    await db
      .update(documents)
      .set({
        disbursementConfirmed: true,
        updatedAt: new Date(),
      })
      .where(inArray(documents.id, documentIds));

    return NextResponse.json({
      success: true,
      message: `Confirmed ${documentIds.length} document(s) for disbursement`,
    });
  } catch (error) {
    console.error("Error confirming disbursement:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
