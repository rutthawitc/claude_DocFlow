import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getDb } from '@/db';
import { documents, users, userRoles, roles } from '@/db/schema';
import { eq } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * PATCH /api/documents/[id]/receive-paper
 * Mark document as paper received by admin/district_manager
 */
export async function PATCH(request: NextRequest, { params: paramsPromise }: RouteParams) {
  const params = await paramsPromise;
  const db = await getDb();

  if (!db) {
    return NextResponse.json(
      { success: false, error: 'Database connection error' },
      { status: 500 }
    );
  }

  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const sessionUserId = session.user.id;

    // Get user from database
    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.username, sessionUserId))
      .limit(1);

    if (!dbUser) {
      return NextResponse.json(
        { success: false, error: 'User not found in database' },
        { status: 401 }
      );
    }

    const actualUserId = dbUser.id;

    // Manual validation of document ID
    const documentId = parseInt(params.id);
    if (isNaN(documentId) || documentId < 1) {
      return NextResponse.json(
        { success: false, error: 'Invalid document ID' },
        { status: 400 }
      );
    }

    // Get user roles directly from database
    const userRolesData = await db
      .select({
        roleName: roles.name
      })
      .from(userRoles)
      .leftJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, actualUserId));

    const userRoleNames = userRolesData.map(r => r.roleName).filter(Boolean) as string[];

    // Check if user is admin or district_manager
    const isAdmin = userRoleNames.includes('admin') || userRoleNames.includes('district_manager');
    if (!isAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: 'เฉพาะผู้ดูแลระบบและผู้จัดการเขตเท่านั้นที่สามารถรับเอกสารต้นฉบับได้'
        },
        { status: 403 }
      );
    }

    // Get document to verify it exists and check status
    const [document] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบเอกสาร' },
        { status: 404 }
      );
    }

    // Check if document status is 'sent_back_to_district' (ส่งกลับเขต)
    if (document.status !== 'sent_back_to_district') {
      return NextResponse.json(
        {
          success: false,
          error: 'เอกสารต้องมีสถานะ "ส่งกลับเขต" เท่านั้น'
        },
        { status: 400 }
      );
    }

    // Check if already received
    if (document.receivedPaperDocDate) {
      return NextResponse.json(
        {
          success: false,
          error: 'เอกสารนี้ได้รับเอกสารต้นฉบับแล้ว'
        },
        { status: 400 }
      );
    }

    // Update document with received date
    const today = new Date().toISOString().split('T')[0];

    await db
      .update(documents)
      .set({
        receivedPaperDocDate: today,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId));

    return NextResponse.json(
      {
        success: true,
        message: 'บันทึกการรับเอกสารต้นฉบับสำเร็จ',
        data: {
          receivedDate: today,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error marking document as received:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
