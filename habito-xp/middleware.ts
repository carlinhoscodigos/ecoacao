import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Aqui definimos quais rotas o Clerk NÃO deve bloquear
const isPublicRoute = createRouteMatcher([
  '/login(.*)', 
  '/api/webhooks(.*)'
]);

export default clerkMiddleware((auth, request) => {
  if (!isPublicRoute(request)) {
    auth().protect(); // Protege tudo que não for público
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};