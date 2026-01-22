import "server-only";

import type { ReactNode } from "react";

import { AppHeaderServer } from "./_components/AppHeader.server";
import { AppSidebar } from "./_components/AppSidebar";

export default function AuthenticatedAppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-background">
      <div className="flex min-h-dvh">
        {/* Desktop sidebar */}
        <div className="hidden lg:block">
          <AppSidebar />
        </div>

        {/* Main area */}
        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeaderServer />

          <main className="min-w-0 flex-1 p-4">{children}</main>
        </div>
      </div>
    </div>
  );
}
