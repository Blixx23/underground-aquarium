import Link from "next/link";
import { splitMentions } from "@/lib/mentions";

/** Plain text with every @username turned into a link to that member. */
export default function MentionText({ text }: { text: string | null | undefined }) {
  if (!text) return null;
  return (
    <>
      {splitMentions(text).map((part, i) =>
        "handle" in part ? (
          <Link
            key={i}
            href={`/u/${part.handle}`}
            className="font-medium text-sky-300 hover:text-sky-200 hover:underline"
          >
            @{part.handle}
          </Link>
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
    </>
  );
}
