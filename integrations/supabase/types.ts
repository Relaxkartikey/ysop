export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string;
          actor_user_id: string | null;
          created_at: string;
          id: string;
          metadata: Json;
          target_id: string | null;
          target_type: string;
        };
        Insert: {
          action: string;
          actor_user_id?: string | null;
          created_at?: string;
          id?: string;
          metadata?: Json;
          target_id?: string | null;
          target_type: string;
        };
        Update: {
          action?: string;
          actor_user_id?: string | null;
          created_at?: string;
          id?: string;
          metadata?: Json;
          target_id?: string | null;
          target_type?: string;
        };
        Relationships: [];
      };
      files: {
        Row: {
          created_at: string;
          downloads: number;
          expires_at: string | null;
          filename: string;
          folder_id: string | null;
          id: string;
          is_permanent: boolean;
          mime_type: string;
          provider: string;
          size: number;
          slug: string;
          storage_key: string;
          storage_node_id: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          downloads?: number;
          expires_at?: string | null;
          filename: string;
          folder_id?: string | null;
          id?: string;
          is_permanent?: boolean;
          mime_type: string;
          provider?: string;
          size: number;
          slug: string;
          storage_key: string;
          storage_node_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          downloads?: number;
          expires_at?: string | null;
          filename?: string;
          folder_id?: string | null;
          id?: string;
          is_permanent?: boolean;
          mime_type?: string;
          provider?: string;
          size?: number;
          slug?: string;
          storage_key?: string;
          storage_node_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "files_folder_id_fkey";
            columns: ["folder_id"];
            isOneToOne: false;
            referencedRelation: "folders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "files_storage_node_id_fkey";
            columns: ["storage_node_id"];
            isOneToOne: false;
            referencedRelation: "storage_nodes";
            referencedColumns: ["id"];
          },
        ];
      };
      folders: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          owner_user_id: string;
          parent_folder_id: string | null;
          slug: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          owner_user_id: string;
          parent_folder_id?: string | null;
          slug: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          owner_user_id?: string;
          parent_folder_id?: string | null;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "folders_parent_folder_id_fkey";
            columns: ["parent_folder_id"];
            isOneToOne: false;
            referencedRelation: "folders";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          amount_cents: number;
          created_at: string;
          currency: string;
          id: string;
          metadata: Json;
          paid_at: string | null;
          plan: string;
          provider: string;
          provider_order_id: string | null;
          provider_payment_id: string | null;
          status: string;
          subscription_id: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          amount_cents: number;
          created_at?: string;
          currency?: string;
          id?: string;
          metadata?: Json;
          paid_at?: string | null;
          plan?: string;
          provider?: string;
          provider_order_id?: string | null;
          provider_payment_id?: string | null;
          status?: string;
          subscription_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          amount_cents?: number;
          created_at?: string;
          currency?: string;
          id?: string;
          metadata?: Json;
          paid_at?: string | null;
          plan?: string;
          provider?: string;
          provider_order_id?: string | null;
          provider_payment_id?: string | null;
          status?: string;
          subscription_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_subscription_id_fkey";
            columns: ["subscription_id"];
            isOneToOne: false;
            referencedRelation: "subscriptions";
            referencedColumns: ["id"];
          },
        ];
      };
      rate_limits: {
        Row: {
          count: number;
          key: string;
          window_start: string;
        };
        Insert: {
          count?: number;
          key: string;
          window_start: string;
        };
        Update: {
          count?: number;
          key?: string;
          window_start?: string;
        };
        Relationships: [];
      };
      storage_nodes: {
        Row: {
          bucket: string | null;
          created_at: string;
          credentials: string | null;
          current_usage: number;
          display_name: string | null;
          enabled: boolean;
          id: string;
          is_default: boolean;
          is_platform_node: boolean;
          max_file_size: number | null;
          name: string;
          owner_user_id: string | null;
          priority: number;
          provider: string;
          public_base_url: string | null;
          quota: number | null;
          region: string | null;
        };
        Insert: {
          bucket?: string | null;
          created_at?: string;
          credentials?: string | null;
          current_usage?: number;
          display_name?: string | null;
          enabled?: boolean;
          id?: string;
          is_default?: boolean;
          is_platform_node?: boolean;
          max_file_size?: number | null;
          name: string;
          owner_user_id?: string | null;
          priority?: number;
          provider: string;
          public_base_url?: string | null;
          quota?: number | null;
          region?: string | null;
        };
        Update: {
          bucket?: string | null;
          created_at?: string;
          credentials?: string | null;
          current_usage?: number;
          display_name?: string | null;
          enabled?: boolean;
          id?: string;
          is_default?: boolean;
          is_platform_node?: boolean;
          max_file_size?: number | null;
          name?: string;
          owner_user_id?: string | null;
          priority?: number;
          provider?: string;
          public_base_url?: string | null;
          quota?: number | null;
          region?: string | null;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean;
          cancelled_at: string | null;
          created_at: string;
          current_period_end: string | null;
          current_period_start: string | null;
          id: string;
          plan: string;
          provider: string;
          provider_customer_id: string | null;
          provider_subscription_id: string | null;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          cancel_at_period_end?: boolean;
          cancelled_at?: string | null;
          created_at?: string;
          current_period_end?: string | null;
          current_period_start?: string | null;
          id?: string;
          plan?: string;
          provider?: string;
          provider_customer_id?: string | null;
          provider_subscription_id?: string | null;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          cancel_at_period_end?: boolean;
          cancelled_at?: string | null;
          created_at?: string;
          current_period_end?: string | null;
          current_period_start?: string | null;
          id?: string;
          plan?: string;
          provider?: string;
          provider_customer_id?: string | null;
          provider_subscription_id?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_plans: {
        Row: {
          expires_at: string | null;
          lifetime_platform_uploads: number;
          plan: string;
          preferred_storage_node_id: string | null;
          role: string;
          source: string;
          status: string | null;
          subscription_id: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          expires_at?: string | null;
          lifetime_platform_uploads?: number;
          plan?: string;
          preferred_storage_node_id?: string | null;
          role?: string;
          source?: string;
          status?: string | null;
          subscription_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          expires_at?: string | null;
          lifetime_platform_uploads?: number;
          plan?: string;
          preferred_storage_node_id?: string | null;
          role?: string;
          source?: string;
          status?: string | null;
          subscription_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_plans_preferred_storage_node_id_fkey";
            columns: ["preferred_storage_node_id"];
            isOneToOne: false;
            referencedRelation: "storage_nodes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_plans_subscription_id_fkey";
            columns: ["subscription_id"];
            isOneToOne: false;
            referencedRelation: "subscriptions";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      billing_activate_pro: {
        Args: {
          p_period_end?: string;
          p_period_start?: string;
          p_source: string;
          p_subscription_id?: string;
          p_user_id: string;
        };
        Returns: undefined;
      };
      billing_cancel_subscription: {
        Args: { p_cancel_at_period_end: boolean; p_subscription_id: string };
        Returns: undefined;
      };
      billing_downgrade_to_free: {
        Args: { p_source?: string; p_user_id: string };
        Returns: undefined;
      };
      billing_expire_subscription: {
        Args: { p_subscription_id: string };
        Returns: undefined;
      };
      billing_mark_past_due: {
        Args: { p_subscription_id: string };
        Returns: undefined;
      };
      billing_recover_subscription: {
        Args: { p_period_end: string; p_subscription_id: string };
        Returns: undefined;
      };
      rate_limit_check: {
        Args: { p_key: string; p_limit: number; p_window_seconds: number };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
