export interface ScheduleItem {
  id: string;
  name: string;
  period: string;
  template_id: string;
  run_time: string;
  enabled: boolean;
  last_run_at: string | null;
  created_at: string;
  message_templates?: {
    id: string;
    name: string;
  } | null;
}
