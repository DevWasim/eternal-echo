export type ProcessingStatus = "draft" | "processing" | "ready" | "archived";

export type MemorySourceType =
  | "audio_recording"
  | "whatsapp_export"
  | "letter_text"
  | "video_transcript"
  | "journal_entry"
  | "interview_response";

export type SupportedLanguage = "ur" | "ar" | "en";

export interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Ancestor {
  id: string;
  owner_id: string;
  name: string;
  nickname: string | null;
  birth_year: number | null;
  death_year: number | null;
  relationship: string | null;
  origin_city: string | null;
  origin_country: string | null;
  religion: string | null;
  language_preference: SupportedLanguage | string;
  voice_clone_id: string | null;
  persona_summary: string | null;
  status: ProcessingStatus;
  created_at: string;

  // Rich personality fields
  occupation: string | null;
  education: string | null;
  spouse_name: string | null;
  children_names: string[] | null;
  siblings_names: string[] | null;
  home_description: string | null;
  signature_phrases: string[] | null;
  fears_and_regrets: string | null;
  proudest_moments: string | null;
  daily_routines: string | null;
  food_preferences: string | null;
  political_views: string | null;
  religious_practices: string | null;
  sense_of_humor: string | null;
  relationship_with_money: string | null;
  advice_they_always_gave: string | null;
  topics_they_avoided: string | null;
  physical_mannerisms: string | null;
  nicknames_they_used_for_others: string | null;
}

export interface MemorySource {
  id: string;
  ancestor_id: string;
  type: MemorySourceType;
  raw_content: string | null;
  processed_content: string | null;
  duration_seconds: number | null;
  language: string | null;
  created_at: string;
}

export interface MemoryChunk {
  id: string;
  ancestor_id: string;
  source_id: string;
  content: string;
  embedding: number[] | null;
  topic_tags: string[] | null;
  emotional_tone: string | null;
  time_period: string | null;
  created_at: string;
  similarity?: number;
}

export interface Conversation {
  id: string;
  ancestor_id: string;
  user_id: string | null;
  session_title: string | null;
  started_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "ancestor";
  content: string | null;
  audio_url: string | null;
  created_at: string;
}

export interface ProcessingEvent {
  id: string;
  ancestor_id: string;
  stage: string;
  detail: string | null;
  progress: number;
  created_at: string;
}

export interface MatchedMemory {
  id: string;
  source_id: string;
  content: string;
  topic_tags: string[] | null;
  emotional_tone: string | null;
  time_period: string | null;
  similarity: number;
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type DbRecord<T> = T & Record<string, unknown>;

type TableShape<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: DbRecord<Row>;
  Insert: DbRecord<Insert>;
  Update: DbRecord<Update>;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles: TableShape<UserProfile>;
      ancestors: TableShape<Ancestor>;
      memory_sources: TableShape<MemorySource>;
      memory_chunks: TableShape<MemoryChunk>;
      conversations: TableShape<Conversation>;
      messages: TableShape<Message>;
      processing_events: TableShape<ProcessingEvent>;
      ancestor_invites: TableShape<{
        id: string;
        ancestor_id: string;
        invited_by: string;
        email: string;
        accepted_by: string | null;
        created_at: string;
      }>;
    };
    Views: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
    Functions: {
      match_memories: {
        Args: {
          query_embedding: number[];
          ancestor_id_param: string;
          match_count: number;
        };
        Returns: MatchedMemory[];
      };
    };
  };
}
