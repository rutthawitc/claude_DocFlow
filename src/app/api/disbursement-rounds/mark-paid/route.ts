import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { inArray, and, eq } from "drizzle-orm";

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
        { error: "Forbidden: Only admin and district managers can mark as paid" },
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

    // Verify all selected documents have disbursementConfirmed = true
    const docsToPay = await db
      .select()
      .from(documents)
      .where(
        and(
          inArray(documents.id, documentIds),
          eq(documents.disbursementConfirmed, true)
        )
      );

    if (docsToPay.length !== documentIds.length) {
      return NextResponse.json(
        { error: "All selected documents must be confirmed before marking as paid" },
        { status: 400 }
      );
    }

    // Update disbursement paid status for selected documents
    await db
      .update(documents)
      .set({
        disbursementPaid: true,
        updatedAt: new Date(),
      })
      .where(inArray(documents.id, documentIds));

    return NextResponse.json({
      success: true,
      message: `Marked ${documentIds.length} document(s) as paid`,
    });
  } catch (error) {
    console.error("Error marking as paid:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
