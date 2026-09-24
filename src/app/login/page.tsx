import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safeNext";
import LoginForm from "./LoginForm";

// Who's asking decides what this page does, so it can never be static.
export const dynamic = "force-dynamic";

/**
 * Log in.
 *
 * Someone the server already recognises never sees the form: they go
 * straight on to ?next (or the feed). The check is the same server-side
 * getUser() the protected pages use, so the two can't disagree and bounce
 * a person back and forth. If the server doesn't recognise them, the form
 * shows, and signing in writes a fresh session the server will accept.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect(safeNext(next, "/feed"));

  return <LoginForm />;
}
