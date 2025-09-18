import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  publicRoutes: [
    "/",
    "/sign-in",
    "/sign-up",
    "/api/webhook/clerk",
    "/demo",
    "/features",
    "/pricing",
    "/about",
    "/contact",
    "/privacy",
    "/terms"
  ],
  ignoredRoutes: [
    "/api/health",
    "/_next/static",
    "/_next/image",
    "/favicon.ico"
  ],
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};