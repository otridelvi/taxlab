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
    };
    Enums: {
      admin_role: AdminRole;
      participant_status: ParticipantStatus;
      assignment_mode: AssignmentMode;
    };
    CompositeTypes: Record<string, never>;
  };
};
