/**
 * Database types.
 *
 * Hand-written to match supabase/migrations for now. After the migration is
 * pushed, regenerate from the real schema with:
 *
 *   npm run db:types
 *
 * (which overwrites this file).
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type AdminRole = "admin" | "assistant" | "viewer";
export type ParticipantStatus = "not_started" | "in_progress" | "completed" | "timed_out" | "cancelled";
export type AssignmentMode = "random" | "manual";
export type FlowVersion = "A" | "B";

export type Database = {
  public: {
    Tables: {
      admins: {
        Row: { id: string; name: string; role: AdminRole; active: boolean; created_at: string };
        Insert: { id: string; name: string; role?: AdminRole; active?: boolean; created_at?: string };
        Update: { id?: string; name?: string; role?: AdminRole; active?: boolean; created_at?: string };
        Relationships: [];
      };
      settings: {
        Row: { key: string; value: Json; updated_by: string | null; updated_at: string };
        Insert: { key: string; value: Json; updated_by?: string | null; updated_at?: string };
        Update: { key?: string; value?: Json; updated_by?: string | null; updated_at?: string };
        Relationships: [];
      };
      batches: {
        Row: {
          id: string;
          label: string | null;
          mode: AssignmentMode;
          manual_cell: number | null;
          quantity: number;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          label?: string | null;
          mode: AssignmentMode;
          manual_cell?: number | null;
          quantity: number;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          label?: string | null;
          mode?: AssignmentMode;
          manual_cell?: number | null;
          quantity?: number;
          created_by?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      participants: {
        Row: {
          id: string;
          access_code: string;
          cell: number;
          batch_id: string;
          status: ParticipantStatus;
          consent_at: string | null;
          started_at: string | null;
          task_deadline: string | null;
          finished_at: string | null;
          current_page: string | null;
          current_round: number | null;
          code_key: string;
          content_version: string | null;
          created_at: string;
          session_id: string | null;
          flow_version: FlowVersion | null;
          task_started_at: string | null;
          task_end_at: string | null;
          timed_out: boolean;
          timed_out_at_page: string | null;
          last_seen_at: string | null;
        };
        Insert: {
          id?: string;
          access_code: string;
          cell: number;
          batch_id: string;
          status?: ParticipantStatus;
          consent_at?: string | null;
          started_at?: string | null;
          task_deadline?: string | null;
          finished_at?: string | null;
          current_page?: string | null;
          current_round?: number | null;
          content_version?: string | null;
          created_at?: string;
          session_id?: string | null;
          flow_version?: FlowVersion | null;
          task_started_at?: string | null;
          task_end_at?: string | null;
          timed_out?: boolean;
          timed_out_at_page?: string | null;
          last_seen_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["participants"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "participants_batch_id_fkey";
            columns: ["batch_id"];
            isOneToOne: false;
            referencedRelation: "batches";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          id: number;
          admin_id: string | null;
          action: string;
          participant_id: string | null;
          detail: Json;
          created_at: string;
        };
        Insert: {
          id?: never;
          admin_id?: string | null;
          action: string;
          participant_id?: string | null;
          detail?: Json;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      responses: {
        Row: { participant_id: string; item_key: string; value: Json; updated_at: string };
        Insert: { participant_id: string; item_key: string; value: Json; updated_at?: string };
        Update: { participant_id?: string; item_key?: string; value?: Json; updated_at?: string };
        Relationships: [];
      };
      events: {
        Row: {
          id: number;
          participant_id: string;
          session_id: string;
          seq: number | null;
          source: "client" | "server";
          type: string;
          target: string | null;
          round: number | null;
          page_id: string | null;
          client_ts: string;
          received_at: string;
          duration_ms: number | null;
          meta: Json | null;
        };
        Insert: {
          id?: never;
          participant_id: string;
          session_id: string;
          seq?: number | null;
          source?: "client" | "server";
          type: string;
          target?: string | null;
          round?: number | null;
          page_id?: string | null;
          client_ts: string;
          received_at?: string;
          duration_ms?: number | null;
          meta?: Json | null;
        };
        Update: never;
        Relationships: [];
      };
      contacts: {
        Row: {
          participant_id: string;
          name: string | null;
          email: string | null;
          ewallet: string | null;
          phone: string | null;
          updated_at: string;
        };
        Insert: {
          participant_id: string;
          name?: string | null;
          email?: string | null;
          ewallet?: string | null;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          name?: string | null;
          email?: string | null;
          ewallet?: string | null;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      code_attempts: {
        Row: { id: number; device_id: string | null; ip: string | null; success: boolean; created_at: string };
        Insert: { id?: never; device_id?: string | null; ip?: string | null; success: boolean; created_at?: string };
        Update: never;
        Relationships: [];
      };
      login_attempts: {
        Row: { id: number; email: string; success: boolean; ip: string | null; created_at: string };
        Insert: { id?: never; email: string; success: boolean; ip?: string | null; created_at?: string };
        Update: { email?: string; success?: boolean; ip?: string | null; created_at?: string };
        Relationships: [];
      };
    };
    Views: {
      v_cell_summary: {
        Row: {
          cell: number;
          total: number;
          not_started: number;
          in_progress: number;
          completed: number;
          timed_out: number;
          cancelled: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      create_batch: {
        Args: {
          p_admin_id: string;
          p_label: string;
          p_mode: AssignmentMode;
          p_manual_cell: number | null;
          p_codes: string[];
          p_cells: number[];
        };
        Returns: string;
      };
      change_participant_cell: {
        Args: { p_admin_id: string; p_participant_id: string; p_cell: number; p_reason: string };
        Returns: string;
      };
      deactivate_participant: {
        Args: { p_admin_id: string; p_participant_id: string; p_reason: string };
        Returns: string;
      };
      participant_login: {
        Args: {
          p_code: string;
          p_session_id: string;
          p_consent_at: string | null;
          p_flow_version: FlowVersion;
          p_content_version: string;
          p_first_page: string;
        };
        Returns: { out_result: string; out_participant_id: string | null; out_page: string | null }[];
      };
      save_responses: {
        Args: { p_participant_id: string; p_session_id: string; p_page: string; p_items: Json; p_contact: Json };
        Returns: string;
      };
      advance_step: {
        Args: {
          p_participant_id: string;
          p_session_id: string;
          p_from: string;
          p_items: Json;
          p_contact: Json;
          p_reason: "next" | "timer_expired";
          p_next_page: string;
          p_next_round: number | null;
          p_timer_start: boolean;
          p_timer_end: boolean;
          p_timer_minutes: number;
        };
        Returns: string;
      };
      finish_session: {
        Args: { p_participant_id: string; p_session_id: string; p_finish_page: string };
        Returns: string;
      };
      close_stale_sessions: { Args: Record<string, never>; Returns: number };
    };
    Enums: {
      admin_role: AdminRole;
      participant_status: ParticipantStatus;
      assignment_mode: AssignmentMode;
    };
    CompositeTypes: Record<string, never>;
  };
};
