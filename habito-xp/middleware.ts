import { clerkMiddleware } from "@clerk/nextjs/server";

// Isso protege o seu site inteiro por padrão
export default clerkMiddleware();

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};