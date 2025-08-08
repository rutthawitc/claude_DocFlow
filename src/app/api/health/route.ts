import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Simple health check - just return OK status
    return NextResponse.json(
      { 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'DocFlow API'
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        service: 'DocFlow API'
      },
      { status: 500 }
    );
  }
}