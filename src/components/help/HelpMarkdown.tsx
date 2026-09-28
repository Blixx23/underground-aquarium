import { Children, isValidElement, type ReactNode } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders a help article. Headings get the same #anchor the search index
 * links to, so a search result lands on the exact answer.
 */

function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return "";
}

function anchor(children: ReactNode): string {
  return Children.toArray(children)
    .map(textOf)
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function HelpMarkdown({ children }: { children: string }) {
  return (
    <div className="leading-relaxed text-ocean-200">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h2 className="mb-3 mt-8 font-display text-2xl text-white">{children}</h2>,
          h2: ({ children }) => {
            const id = anchor(children);
            return (
              <h2 id={id} className="group mb-3 mt-10 scroll-mt-28 text-xl font-medium text-white">
                <a href={`#${id}`} className="hover:text-emerald-300">
                  {children}
                </a>
              </h2>
            );
          },
          h3: ({ children }) => (
            <h3 id={anchor(children)} className="mb-2 mt-6 scroll-mt-28 text-lg font-medium text-white">
              {children}
            </h3>
          ),
          p: ({ children }) => <p className="mb-4">{children}</p>,
          ul: ({ children }) => <ul className="mb-4 list-disc space-y-1.5 pl-5 marker:text-emerald-500/70">{children}</ul>,
          ol: ({ children }) => <ol className="mb-4 list-decimal space-y-1.5 pl-5 marker:text-emerald-400">{children}</ol>,
          li: ({ children }) => <li className="pl-1">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          blockquote: ({ children }) => (
            <blockquote className="mb-4 rounded-r-xl border-l-2 border-emerald-500/60 bg-emerald-500/[0.05] py-2 pl-4 pr-3 text-ocean-200">
              {children}
            </blockquote>
          ),
          code: ({ children }) => (
            <code className="rounded bg-ocean-950/80 px-1.5 py-0.5 text-sm text-ocean-100">{children}</code>
          ),
          table: ({ children }) => (
            <div className="mb-4 overflow-x-auto rounded-xl border border-ocean-800/60">
              <table className="w-full text-left text-sm">{children}</table>
            </div>
          ),
          th: ({ children }) => <th className="border-b border-ocean-800/60 bg-white/[0.03] px-3 py-2 font-medium text-white">{children}</th>,
          td: ({ children }) => <td className="border-b border-ocean-800/40 px-3 py-2 align-top">{children}</td>,
          a: ({ href, children }) => {
            const url = typeof href === "string" ? href : "";
            const cls = "text-emerald-400 underline underline-offset-2 hover:text-emerald-300";
            if (url.startsWith("/")) {
              return (
                <Link href={url} className={cls}>
                  {children}
                </Link>
              );
            }
            if (url.startsWith("mailto:") || url.startsWith("#")) {
              return (
                <a href={url} className={cls}>
                  {children}
                </a>
              );
            }
            // Help docs only link inside the site; anything else renders as plain text.
            return <span>{children}</span>;
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
