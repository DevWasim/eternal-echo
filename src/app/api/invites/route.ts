import { NextResponse } from "next/server";
import {
  createAnonymousSupabaseClient,
  createRouteSupabaseClient,
  getAppUrl,
} from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { ancestorId, email } = (await request.json()) as {
    ancestorId?: string;
    email?: string;
  };

  if (!ancestorId || !email) {
    return NextResponse.json(
      { error: "Please provide an ancestor and email." },
      { status: 400 },
    );
  }

  const supabase = await createRouteSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: ancestor } = await supabase
    .from("ancestors")
    .select("id")
    .eq("id", ancestorId)
    .eq("owner_id", user.id)
    .single();

  if (!ancestor) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: invite, error } = await supabase
    .from("ancestor_invites")
    .upsert(
      {
        ancestor_id: ancestorId,
        invited_by: user.id,
        email,
      },
      { onConflict: "ancestor_id,email" },
    )
    .select("id")
    .single();

  if (error || !invite) {
    return NextResponse.json(
      { error: "The invite could not be created." },
      { status: 400 },
    );
  }

  const publicClient = createAnonymousSupabaseClient();
  const redirectTo = `${getAppUrl()}/auth/callback?next=${encodeURIComponent(
    `/chat/${ancestorId}`,
  )}&invited_by=${invite.id}`;

  await publicClient.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: redirectTo,
    },
  });

  return NextResponse.json({ ok: true });
}
