import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { ancestorId, inviteeEmail, role } = await req.json();
  if (!ancestorId || !inviteeEmail || !role) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  const supabase = createServiceSupabaseClient();
  // Insert invite row (family_invites is not in the typed schema — cast to any)
  const { data: invite, error } = await (supabase as any)
    .from("family_invites")
    .insert({ ancestor_id: ancestorId, invitee_email: inviteeEmail, role })
    .select()
    .single();
  if (error || !invite) {
    return NextResponse.json({ error: "Failed to create invite." }, { status: 500 });
  }
  // Send email via Supabase Auth
  const { error: emailError } = await supabase.auth.admin.inviteUserByEmail(inviteeEmail, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/invites/accept?token=${(invite as any).token}`,
  });
  if (emailError) {
    return NextResponse.json({ error: "Failed to send invite email." }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
