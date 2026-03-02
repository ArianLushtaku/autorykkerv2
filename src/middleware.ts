import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  // For now, we'll handle authentication client-side
  // This middleware can be enhanced later with proper Supabase middleware
  
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*']
}
