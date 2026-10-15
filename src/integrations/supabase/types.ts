export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      app_settings: {
        Row: {
          cron_url: string | null;
          current_environment: string | null;
          id: number;
          sap_sl_company_db: string | null;
          sap_sl_password: string | null;
          sap_sl_url: string | null;
          sap_sl_username: string | null;
          thank_you_promoter: string | null;
          thank_you_detractor: string | null;
          updated_at: string;
          updated_by: string | null;
          zenvia_api_token: string | null;
          zenvia_from: string | null;
          zenvia_webhook_url: string | null;
          company_logo_url: string | null;
          retry_interval_hours: number;
          last_connection_check_at: string | null;
          last_connection_check_status: string | null;
          max_retry_attempts: number;
          blocked_subgroups: string[];
          custom_subgroups: unknown;
          email_template_subject: string | null;
          email_template_body: string | null;
          smtp_host: string | null;
          smtp_port: number | null;
          smtp_user: string | null;
          smtp_pass: string | null;
          smtp_from: string | null;
        };
        Insert: {
          cron_url?: string | null;
          current_environment?: string | null;
          id?: number;
          sap_sl_company_db?: string | null;
          sap_sl_password?: string | null;
          sap_sl_url?: string | null;
          sap_sl_username?: string | null;
          thank_you_promoter?: string | null;
          thank_you_detractor?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          zenvia_api_token?: string | null;
          zenvia_from?: string | null;
          zenvia_webhook_url?: string | null;
          company_logo_url?: string | null;
          retry_interval_hours?: number;
          last_connection_check_at?: string | null;
          last_connection_check_status?: string | null;
          max_retry_attempts?: number;
          blocked_subgroups?: string[];
          custom_subgroups?: unknown;
          email_template_subject?: string | null;
          email_template_body?: string | null;
          smtp_host?: string | null;
          smtp_port?: number | null;
          smtp_user?: string | null;
          smtp_pass?: string | null;
          smtp_from?: string | null;
        };
        Update: {
          cron_url?: string | null;
          current_environment?: string | null;
          id?: number;
          sap_sl_company_db?: string | null;
          sap_sl_password?: string | null;
          sap_sl_url?: string | null;
          sap_sl_username?: string | null;
          thank_you_promoter?: string | null;
          thank_you_detractor?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          zenvia_api_token?: string | null;
          zenvia_from?: string | null;
          zenvia_webhook_url?: string | null;
          company_logo_url?: string | null;
          retry_interval_hours?: number;
          last_connection_check_at?: string | null;
          last_connection_check_status?: string | null;
          max_retry_attempts?: number;
          blocked_subgroups?: string[];
          custom_subgroups?: unknown;
          email_template_subject?: string | null;
          email_template_body?: string | null;
          smtp_host?: string | null;
          smtp_port?: number | null;
          smtp_user?: string | null;
          smtp_pass?: string | null;
          smtp_from?: string | null;
        };
        Relationships: [];
      };
      message_templates: {
        Row: {
          body: string;
          created_at: string;
          created_by: string | null;
          id: string;
          is_default: boolean;
          name: string;
          type: string;
          updated_at: string;
          zenvia_template_id: string | null;
        };
        Insert: {
          body: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_default?: boolean;
          name: string;
          type?: string;
          updated_at?: string;
          zenvia_template_id?: string | null;
        };
        Update: {
          body?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_default?: boolean;
          name?: string;
          type?: string;
          updated_at?: string;
          zenvia_template_id?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          require_password_change: boolean;
          status: string;
          updated_at: string;
          phone: string | null;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
          require_password_change?: boolean;
          status?: string;
          updated_at?: string;
          phone?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          require_password_change?: boolean;
          status?: string;
          updated_at?: string;
          phone?: string | null;
        };
        Relationships: [];
      };
      schedules: {
        Row: {
          created_at: string;
          enabled: boolean;
          id: string;
          last_run_at: string | null;
          last_run_status: string | null;
          name: string;
          period: string;
          run_time: string;
          template_id: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          enabled?: boolean;
          id?: string;
          last_run_at?: string | null;
          last_run_status?: string | null;
          name: string;
          period?: string;
          run_time?: string;
          template_id?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          enabled?: boolean;
          id?: string;
          last_run_at?: string | null;
          last_run_status?: string | null;
          name?: string;
          period?: string;
          run_time?: string;
          template_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "schedules_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "message_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      survey_responses: {
        Row: {
          created_at: string;
          id: string;
          parsed_score: number | null;
          payload: Json | null;
          phone: string;
          raw_text: string | null;
          survey_id: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          parsed_score?: number | null;
          payload?: Json | null;
          phone: string;
          raw_text?: string | null;
          survey_id?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          parsed_score?: number | null;
          payload?: Json | null;
          phone?: string;
          raw_text?: string | null;
          survey_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "survey_responses_survey_id_fkey";
            columns: ["survey_id"];
            isOneToOne: false;
            referencedRelation: "surveys";
            referencedColumns: ["id"];
          },
        ];
      };
      surveys: {
        Row: {
          answered_at: string | null;
          card_code: string;
          card_name: string | null;
          comment: string | null;
          contact_name: string | null;
          created_at: string;
          created_by: string | null;
          environment: string;
          error_message: string | null;
          id: string;
          invoice_date: string | null;
          invoice_total: number | null;
          phone: string;
          rendered_message: string | null;
          sap_doc_entry: number;
          sap_doc_num: number | null;
          salesperson_name: string | null;
          bpl_name: string | null;
          score: number | null;
          sent_at: string | null;
          status: string;
          template_id: string | null;
          updated_at: string;
          zenvia_message_id: string | null;
          retry_count: number;
          email: string | null;
          response_token: string | null;
        };
        Insert: {
          answered_at?: string | null;
          card_code: string;
          card_name?: string | null;
          comment?: string | null;
          contact_name?: string | null;
          created_at?: string;
          created_by?: string | null;
          environment?: string;
          error_message?: string | null;
          id?: string;
          invoice_date?: string | null;
          invoice_total?: number | null;
          phone: string;
          rendered_message?: string | null;
          sap_doc_entry: number;
          sap_doc_num?: number | null;
          salesperson_name?: string | null;
          bpl_name?: string | null;
          score?: number | null;
          sent_at?: string | null;
          status?: string;
          template_id?: string | null;
          updated_at?: string;
          zenvia_message_id?: string | null;
          retry_count?: number;
          email?: string | null;
          response_token?: string | null;
        };
        Update: {
          answered_at?: string | null;
          card_code?: string;
          card_name?: string | null;
          comment?: string | null;
          contact_name?: string | null;
          created_at?: string;
          created_by?: string | null;
          environment?: string;
          error_message?: string | null;
          id?: string;
          invoice_date?: string | null;
          invoice_total?: number | null;
          phone?: string;
          rendered_message?: string | null;
          sap_doc_entry?: number;
          sap_doc_num?: number | null;
          salesperson_name?: string | null;
          bpl_name?: string | null;
          score?: number | null;
          sent_at?: string | null;
          status?: string;
          template_id?: string | null;
          updated_at?: string;
          zenvia_message_id?: string | null;
          retry_count?: number;
          email?: string | null;
          response_token?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "surveys_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "message_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      system_logs: {
        Row: {
          id: string;
          created_at: string;
          level: string;
          category: string;
          message: string;
          details: string | null;
          user_id: string | null;
          user_email: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          level: string;
          category: string;
          message: string;
          details?: string | null;
          user_id?: string | null;
          user_email?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          level?: string;
          category?: string;
          message?: string;
          details?: string | null;
          user_id?: string | null;
          user_email?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "admin" | "operador";
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "operador"],
    },
  },
} as const;
