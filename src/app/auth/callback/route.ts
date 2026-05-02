import { NextResponse, type NextRequest } from "next/server";
import { createRouteSupabaseClient, getAppUrl } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";
  const invitedBy = requestUrl.searchParams.get("invited_by");

  if (code) {
    const supabase = await createRouteSupabaseClient();
    await supabase.auth.exchangeCodeForSession(code);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await supabase.from("profiles").upsert({
        id: user.id,
        email: user.email,
        full_name:
          user.user_metadata?.full_name ??
          user.user_metadata?.name ??
          user.email?.split("@")[0] ??
          "Family member",
        avatar_url: user.user_metadata?.avatar_url ?? null,
      });

      if (invitedBy) {
        await supabase
          .from("ancestor_invites")
          .update({ accepted_by: user.id })
          .eq("id", invitedBy)
          .is("accepted_by", null);
      }
    }
  }

  return NextResponse.redirect(`${getAppUrl()}${next}`);
}
