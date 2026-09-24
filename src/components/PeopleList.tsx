import Link from "next/link";
import { User } from "lucide-react";
import FollowButton from "@/components/FollowButton";
import Avatar from "@/components/profile/Avatar";

export type Person = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  society: boolean;
  initialFollowing: boolean;
  isSelf: boolean;
};

export default function PeopleList({
  people,
  emptyText,
}: {
  people: Person[];
  emptyText: string;
}) {
  if (people.length === 0) {
    return (
      <div className="rounded-2xl bg-white/5 border border-white/10 p-10 text-center">
        <User className="w-8 h-8 text-ocean-600 mx-auto mb-3" />
        <p className="text-ocean-400 text-sm">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {people.map((p) => {
        const name = p.full_name || p.username || "Aquarist";
        return (
          <div
            key={p.id}
            className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3"
          >
            <Avatar name={name} src={p.avatar_url} society={p.society} size={40} />
            <div className="min-w-0 flex-1">
              {p.username ? (
                <Link
                  href={`/u/${p.username}`}
                  className="block text-white text-sm font-medium truncate hover:text-emerald-300 transition-colors"
                >
                  {name}
                </Link>
              ) : (
                <span className="block text-white text-sm font-medium truncate">
                  {name}
                </span>
              )}
              {p.username && (
                <p className="text-ocean-400 text-xs truncate">@{p.username}</p>
              )}
            </div>
            {!p.isSelf && (
              <FollowButton
                targetUserId={p.id}
                initialFollowing={p.initialFollowing}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}