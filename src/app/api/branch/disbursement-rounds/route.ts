import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { documents, branches } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user has branch_user or branch_manager role
    const userRoles = session.user.pwa?.roles || [];
    const isBranchUser = userRoles.includes("branch_user");
    const isBranchManager = userRoles.includes("branch_manager");

    if (!isBranchUser && !isBranchManager) {
      return NextResponse.json(
        { error: "Forbidden: Only branch users can access this resource" },
        { status: 403 }
      );
    }

    // Get baCode from query params
    const { searchParams } = new URL(request.url);
    const baCode = searchParams.get("baCode");

    if (!baCode) {
      return NextResponse.json(
        { error: "Branch BA code is required" },
        { status: 400 }
      );
    }

    // Verify user's branch matches the requested baCode
    const userBaCode = session.user.pwa?.ba;
    if (userBaCode !== baCode) {
      return NextResponse.json(
        { error: "Forbidden: You can only view your own branch data" },
        { status: 403 }
      );
    }

    // Convert baCode to number for query
    const baCodeNum = parseInt(baCode, 10);

    // Fetch documents for this branch with status 'all_checked'
    const branchDocs = await db
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
      .where(
        and(
          eq(documents.branchBaCode, baCodeNum),
          eq(documents.status, "all_checked")
        )
      )
      .orderBy(documents.createdAt);

    return NextResponse.json({
      success: true,
      data: branchDocs,
    });
  } catch (error) {
    console.error("Error fetching branch disbursement rounds:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
