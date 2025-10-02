import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getDb } from '@/db';
import { documents, users, userRoles, roles, additionalDocumentFiles } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * PATCH /api/documents/[id]/receive-additional-docs
 * Mark all additional documents as received by admin/district_manager
 * Only available when:
 * - Document status is 'sent_back_to_district'
 * - All additional documents are uploaded and verified as correct
 * - User is admin or district_manager
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
          error: 'เฉพาะผู้ดูแลระบบและผู้จัดการเขตเท่านั้นที่สามารถรับเอกสารเพิ่มเติมได้'
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

    // Check if document has additional documents
    if (!document.hasAdditionalDocs || !document.additionalDocs || document.additionalDocs.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'เอกสารนี้ไม่มีเอกสารเพิ่มเติม'
        },
        { status: 400 }
      );
    }

    // Get all additional document files
    const additionalFiles = await db
      .select()
      .from(additionalDocumentFiles)
      .where(eq(additionalDocumentFiles.documentId, documentId));

    // Filter out empty additional docs
    const filteredAdditionalDocs = document.additionalDocs.filter((doc: string) => doc && doc.trim() !== '');

    // Check if all additional documents are uploaded
    const allDocsUploaded = filteredAdditionalDocs.every((_: string, index: number) => {
      return additionalFiles.some(file => file.itemIndex === index);
    });

    if (!allDocsUploaded) {
      return NextResponse.json(
        {
          success: false,
          error: 'เอกสารเพิ่มเติมยังอัปโหลดไม่ครบ'
        },
        { status: 400 }
      );
    }

    // Check if all additional documents are verified as correct
    const allDocsVerified = filteredAdditionalDocs.every((_: string, index: number) => {
      const file = additionalFiles.find(f => f.itemIndex === index);
      return file && file.isVerified === true;
    });

    if (!allDocsVerified) {
      return NextResponse.json(
        {
          success: false,
          error: 'เอกสารเพิ่มเติมต้องได้รับการตรวจสอบและยืนยันความถูกต้องทั้งหมดก่อน'
        },
        { status: 400 }
      );
    }

    // Check if already received
    if (document.additionalDocsReceivedDate) {
      return NextResponse.json(
        {
          success: false,
          error: 'เอกสารเพิ่มเติมนี้ได้รับแล้ว'
        },
        { status: 400 }
      );
    }

    // Update document with received date
    const today = new Date().toISOString().split('T')[0];

    await db
      .update(documents)
      .set({
        additionalDocsReceivedDate: today,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId));

    return NextResponse.json(
      {
        success: true,
        message: 'บันทึกการรับเอกสารเพิ่มเติมสำเร็จ',
        data: {
          receivedDate: today,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error marking additional documents as received:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
