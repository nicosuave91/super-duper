export type LeadV2 = {
  id: string;
  tenant_id: string;

  created_at: string;
  updated_at: string;

  type: string;
  status: string;
  sub_status: string | null;

  full_name: string | null;
  phone: string | null;
  email: string | null;

  state: string | null;

  priority_score: number;
  priority_reason: Record<string, unknown>;

  estimated_monthly_premium: string | null;
  estimated_commission: string | null;

  source_page: string | null;

  last_activity_at: string | null;
  last_activity_type: string | null;

  next_action_at: string | null;
  next_action_type: string | null;

  consent_status: "unknown" | "consented" | "opted_out" | string;

  version: number;
};

export type LeadsV2ListResponse = {
  items: LeadV2[];
  next_cursor: string | null;
  filtered_count: number;
};

export type LeadV2DrawerResponse = {
  lead: any;
  notes: any[];
  events: any[];
};

export type SavedView = {
  id: string;
  name: string;
  is_preset: boolean;
  is_default: boolean;
  filters: Record<string, unknown>;
  sort: Record<string, unknown>;
  columns: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};
