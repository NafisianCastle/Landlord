import { cache } from "react";
import { createClient } from "./server";

/** Deduplicate verified user lookups within a render, never across requests/users. */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});
