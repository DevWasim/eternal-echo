import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { token } = await req.json();
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }
  const supabase = createServiceSupabaseClient();
  // Find invite (family_invites is not in the typed schema — cast to any)
  const { data: invite, error } = await (supabase as any)
    .from("family_invites")
    .select("*")
    .eq("token", token)
    .single();
  if (error || !invite) {
    return NextResponse.json({ error: "Invalid invite token." }, { status: 400 });
  }
  if ((invite as any).accepted_at) {
    return NextResponse.json({ error: "Invite already accepted." }, { status: 400 });
  }
  if (new Date((invite as any).expires_at) < new Date()) {
    return NextResponse.json({ error: "Invite expired." }, { status: 400 });
  }
  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.email !== (invite as any).invitee_email) {
    return NextResponse.json({ error: "You are not the invitee." }, { status: 403 });
  }
  // Accept invite
  const { error: updateError } = await (supabase as any)
    .from("family_invites")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", (invite as any).id);
  if (updateError) {
    return NextResponse.json({ error: "Failed to accept invite." }, { status: 500 });
  }
  return NextResponse.json({ success: true, ancestorId: (invite as any).ancestor_id });
}
