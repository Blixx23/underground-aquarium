import {
  Compass,
  Tag,
  MessagesSquare,
  CalendarDays,
  Award,
  Wrench,
  Store,
  ShieldCheck,
  LifeBuoy,
  MessageCircle,
  BadgeCheck,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  "Getting started": Compass,
  Classifieds: Tag,
  Community: MessagesSquare,
  Messages: MessageCircle,
  Events: CalendarDays,
  "The Society": Award,
  "Tools & learning": Wrench,
  "Fish stores": Store,
  "For store owners": BadgeCheck,
  "Account & safety": ShieldCheck,
  Help: LifeBuoy,
};

export function CategoryIcon({ category, className }: { category: string; className?: string }) {
  const Icon = ICONS[category] ?? LifeBuoy;
  return <Icon className={className} />;
}
