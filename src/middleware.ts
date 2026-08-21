import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Protect book routes: only allow valid slugs format (author-slug/book-slug)
  if (pathname.startsWith("/books/")) {
    const slug = pathname.replace("/books/", "");
    
    // Check if slug matches the Context7 format: author-slug/book-slug
    if (!slug || slug.split("/").length !== 1) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/books/:path*"],
};
