// src/app/api/user/info/route.ts

import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  // Return user info, excluding sensitive data
  return NextResponse.json({
    id: session.user.id,
    username: session.user.pwa?.username,
    firstName: session.user.pwa?.firstName,
    lastName: session.user.pwa?.lastName,
    email: session.user.email,
    position: session.user.pwa?.position,
    division: session.user.pwa?.divName,
    department: session.user.pwa?.depName,
    organization: session.user.pwa?.orgName,
  });
}