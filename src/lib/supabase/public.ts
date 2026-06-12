import { createClient } from "@supabase/supabase-js";

// Read-only client for public data (glossary, etc.). Safe to use at build time.
export const supabasePublic = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);