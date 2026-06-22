import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Server-rendered markdown for forum posts. react-markdown does NOT render raw
// HTML (no rehype-raw here), so anything a user types as HTML is escaped —
// safe against injection. Outbound links get rel="ugc nofollow"; our own
// internal links stay normal follow links.
export default function Markdown({ children }: { children: string }) {
  return (
    <div className="text-ocean-200 leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h2 className="font-display text-2xl text-white mt-6 mb-3">
              {children}
            </h2>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl text-white font-medium mt-6 mb-2">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg text-white font-medium mt-5 mb-2">
              {children}
            </h3>
          ),
          p: ({ children }) => <p className="mb-4">{children}</p>,
          ul: ({ children }) => (
            <ul className="list-disc pl-5 mb-4 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 mb-4 space-y-1">{children}</ol>
          ),
          li: ({ children }) => <li className="text-ocean-200">{children}</li>,
          strong: ({ children }) => (
            <strong className="text-white font-semibold">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-ocean-700 pl-4 text-ocean-300 italic mb-4">
              {children}
            </blockquote>
          ),
          code: ({ children }) => (
            <code className="rounded bg-ocean-950/80 px-1.5 py-0.5 text-sm text-ocean-100">
              {children}
            </code>
          ),
          a: ({ href, children }) => {
            const url = typeof href === "string" ? href : "";
            const cls =
              "text-emerald-400 hover:text-emerald-300 underline underline-offset-2";
            if (url.startsWith("/")) {
              return (
                <Link href={url} className={cls}>
                  {children}
                </Link>
              );
            }
            return (
              <a
                href={url}
                target="_blank"
                rel="ugc nofollow noopener noreferrer"
                className={cls}
              >
                {children}
              </a>
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
