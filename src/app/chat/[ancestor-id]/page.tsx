import { redirect } from "next/navigation";
import { ChatExperience } from "@/components/ChatExperience";
import {
  createRouteSupabaseClient,
  createServiceSupabaseClient,
} from "@/lib/supabase";
import type { Ancestor, Message } from "@/types";

export const dynamic = "force-dynamic";

export default async function ChatPage({
  params,
  searchParams,
}: {
  params: { "ancestor-id": string };
  searchParams: { conversation?: string };
}) {
  const routeClient = await createRouteSupabaseClient();
  const {
    data: { user },
  } = await routeClient.auth.getUser();

  if (!user) redirect("/login");

  const supabase = createServiceSupabaseClient();
  const { data: ancestor } = await supabase
    .from("ancestors")
    .select("*")
    .eq("id", params["ancestor-id"])
    .single();

  if (!ancestor) redirect("/dashboard");

  const isOwner = (ancestor as Ancestor).owner_id === user.id;
  const { data: invite } = await supabase
    .from("ancestor_invites")
    .select("id")
    .eq("ancestor_id", params["ancestor-id"])
    .or(`accepted_by.eq.${user.id},email.eq.${user.email ?? ""}`)
    .limit(1);

  if (!isOwner && !invite?.length) redirect("/dashboard");

  let messages: Message[] = [];

  if (searchParams.conversation) {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", searchParams.conversation)
      .order("created_at", { ascending: true });
    messages = (data ?? []) as Message[];
  }

  return (
    <ChatExperience
      ancestor={ancestor as Ancestor}
      initialMessages={messages}
      initialConversationId={searchParams.conversation}
    />
  );
}
