import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { documents, branches } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
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
        { error: "Forbidden: Only admin and district managers can access this resource" },
        { status: 403 }
      );
    }

    // Fetch all documents with status 'all_checked'
    const allCheckedDocs = await db
      .select({
        id: documents.id,
        mtNumber: documents.mtNumber,
        mtDate: documents.mtDate,
        subject: documents.subject,
        branchBaCode: documents.branchBaCode,
        disbursementDate: documents.disbursementDate,
        disbursementConfirmed: documents.disbursementConfirmed,
        disbursementPaid: documents.disbursementPaid,
        status: documents.status,
        createdAt: documents.createdAt,
        branch: {
          id: branches.id,
          baCode: branches.baCode,
          name: branches.name,
        },
      })
      .from(documents)
      .leftJoin(branches, eq(documents.branchBaCode, branches.baCode))
      .where(eq(documents.status, "all_checked"))
      .orderBy(documents.createdAt);

    return NextResponse.json({
      success: true,
      data: allCheckedDocs,
    });
  } catch (error) {
    console.error("Error fetching disbursement rounds:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
