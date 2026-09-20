"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { useUnreadMessages } from "@/lib/hooks/useUnreadMessages";

/** Chat bubble with an unread count, next to the notification bell. */
export default function MessageBell({
  onNavigate,
  className = "",
}: {
  onNavigate?: () => void;
  className?: string;
}) {
  const { signedIn, count } = useUnreadMessages();
  if (!signedIn) return null;

  return (
    <Link
      href="/messages"
      onClick={onNavigate}
      aria-label={count > 0 ? `Messages, ${count} unread` : "Messages"}
      className={`relative p-2 text-ocean-300 hover:text-white transition-colors ${className}`}
    >
      <MessageCircle className="w-5 h-5" />
      {count > 0 && (
        <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-coral-500 text-white text-[11px] font-medium flex items-center justify-center">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
