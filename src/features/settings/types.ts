export interface AppSettingsData {
  thank_you_promoter: string | null;
  thank_you_detractor: string | null;
  retry_interval_hours: number;
  max_retry_attempts: number;
  blocked_subgroups: string[];
  custom_subgroups?: Array<{
    Code: string;
    Name: string;
    Group?: string;
    groupCode: string;
    groupName: string;
    subgroup: string;
  }>;
  email_template_subject: string;
  email_template_body: string;
  current_environment: "test" | "production";
}

export interface SystemLogEntry {
  id: string;
  created_at: string;
  level: string;
  category: string;
  message: string;
  details: string | null;
  user_id: string | null;
  user_email: string | null;
}
