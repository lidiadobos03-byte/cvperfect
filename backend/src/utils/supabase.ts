import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

let cachedAdminClient: SupabaseClient | null | undefined;

function getSupabaseUrl(): string | null {
  return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || null;
}

function getSupabaseServiceRoleKey(): string | null {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || null;
}

export function getSupabaseAdmin(): SupabaseClient | null {
  if (cachedAdminClient !== undefined) {
    return cachedAdminClient;
  }

  const supabaseUrl = getSupabaseUrl();
  const serviceRoleKey = getSupabaseServiceRoleKey();

  if (!supabaseUrl || !serviceRoleKey) {
    cachedAdminClient = null;
    return cachedAdminClient;
  }

  cachedAdminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cachedAdminClient;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseAdmin());
}

export function extractBearerToken(authHeader: unknown): string | null {
  const headerValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;

  if (typeof headerValue !== "string") {
    return null;
  }

  const match = headerValue.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export async function getSupabaseUserFromAuthorization(
  authHeader: unknown
): Promise<User | null> {
  const token = extractBearerToken(authHeader);
  const supabase = getSupabaseAdmin();

  if (!token || !supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return null;
  }

  return data.user;
}
