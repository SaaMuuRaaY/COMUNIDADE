import type { ReactNode } from "react";
import { ChannelNav, ChannelSelectMobile } from "@/components/community/channel-nav";

export default function CommunityLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex">
      <aside className="hidden w-60 shrink-0 border-r md:block">
        <div className="sticky top-14 max-h-[calc(100vh-3.5rem)] overflow-y-auto p-3">
          <ChannelNav />
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="border-b p-2 md:hidden">
          <ChannelSelectMobile />
        </div>
        {children}
      </div>
    </div>
  );
}
