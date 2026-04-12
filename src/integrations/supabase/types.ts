export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      archived_members: {
        Row: {
          archived_at: string
          id: string
          leadership_rank: string | null
          metrics: Json
          name: string
          original_member_id: string | null
          reason: string
        }
        Insert: {
          archived_at?: string
          id?: string
          leadership_rank?: string | null
          metrics?: Json
          name: string
          original_member_id?: string | null
          reason?: string
        }
        Update: {
          archived_at?: string
          id?: string
          leadership_rank?: string | null
          metrics?: Json
          name?: string
          original_member_id?: string | null
          reason?: string
        }
        Relationships: []
      }
      event_attendance: {
        Row: {
          event_type_key: string
          id: string
          member_id: string
          status: string
          value: number | null
          weekly_event_id: string
        }
        Insert: {
          event_type_key: string
          id?: string
          member_id: string
          status?: string
          value?: number | null
          weekly_event_id: string
        }
        Update: {
          event_type_key?: string
          id?: string
          member_id?: string
          status?: string
          value?: number | null
          weekly_event_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_attendance_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendance_weekly_event_id_fkey"
            columns: ["weekly_event_id"]
            isOneToOne: false
            referencedRelation: "weekly_events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_types: {
        Row: {
          created_at: string
          has_svs_toggle: boolean
          id: string
          input_type: string
          key: string
          name: string
        }
        Insert: {
          created_at?: string
          has_svs_toggle?: boolean
          id?: string
          input_type?: string
          key: string
          name: string
        }
        Update: {
          created_at?: string
          has_svs_toggle?: boolean
          id?: string
          input_type?: string
          key?: string
          name?: string
        }
        Relationships: []
      }
      members: {
        Row: {
          created_at: string
          id: string
          leadership_rank: string | null
          location_x: number
          location_y: number
          metrics: Json
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          leadership_rank?: string | null
          location_x?: number
          location_y?: number
          metrics?: Json
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          leadership_rank?: string | null
          location_x?: number
          location_y?: number
          metrics?: Json
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scoring_config: {
        Row: {
          brackets: Json
          created_at: string
          id: string
          key: string
          max_points: number
          name: string
          sort_order: number
          type: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          brackets?: Json
          created_at?: string
          id?: string
          key: string
          max_points?: number
          name: string
          sort_order?: number
          type: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          brackets?: Json
          created_at?: string
          id?: string
          key?: string
          max_points?: number
          name?: string
          sort_order?: number
          type?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      svs_plan_entries: {
        Row: {
          id: string
          location_x: number
          location_y: number
          member_id: string
          name: string
          plan_id: string
          poll_response: string
          power: number
          role: string
          team: string
        }
        Insert: {
          id?: string
          location_x?: number
          location_y?: number
          member_id: string
          name: string
          plan_id: string
          poll_response?: string
          power?: number
          role?: string
          team?: string
        }
        Update: {
          id?: string
          location_x?: number
          location_y?: number
          member_id?: string
          name?: string
          plan_id?: string
          poll_response?: string
          power?: number
          role?: string
          team?: string
        }
        Relationships: [
          {
            foreignKeyName: "svs_plan_entries_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "svs_plan_entries_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "svs_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      svs_plans: {
        Row: {
          capital_percentage: number
          created_at: string
          id: string
          label: string
          mode: string
          notes: string
          opponent_server: string
          result: string
          svs_week: string
          updated_at: string
        }
        Insert: {
          capital_percentage?: number
          created_at?: string
          id?: string
          label: string
          mode?: string
          notes?: string
          opponent_server?: string
          result?: string
          svs_week?: string
          updated_at?: string
        }
        Update: {
          capital_percentage?: number
          created_at?: string
          id?: string
          label?: string
          mode?: string
          notes?: string
          opponent_server?: string
          result?: string
          svs_week?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      weekly_events: {
        Row: {
          created_at: string
          id: string
          is_archived: boolean
          label: string
          svs_active: boolean
          week_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_archived?: boolean
          label: string
          svs_active?: boolean
          week_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_archived?: boolean
          label?: string
          svs_active?: boolean
          week_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "officer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "officer"],
    },
  },
} as const
