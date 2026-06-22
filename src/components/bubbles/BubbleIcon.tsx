// A translucent air-bubble: faint tinted fill, soft rim, and two highlights.
// Driven by currentColor, so set the color via a text-* class on the element.
// `active` makes it look fuller (used to show a cast upvote).
export default function BubbleIcon({
  className,
  active = false,
}: {
  className?: string;
  active?: boolean;
}) {
  const fillOpacity = active ? 0.45 : 0.16;
  const strokeOpacity = active ? 0.95 : 0.65;
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      fill="none"
    >
      <circle cx="12" cy="12" r="9" fill="currentColor" opacity={fillOpacity} />
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity={strokeOpacity}
      />
      <circle cx="9" cy="9" r="2.4" fill="#ffffff" opacity="0.85" />
      <circle cx="14.6" cy="14.6" r="1" fill="#ffffff" opacity="0.35" />
    </svg>
  );
}
