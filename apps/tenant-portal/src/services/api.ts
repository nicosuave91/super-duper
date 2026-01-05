import { apiFetch } from "@/lib/api";

type LeadStatusV2 =
  | "new"
  | "contacted"
  | "quoted"
  | "app_started"
  | "submitted"
  | "issued"
  | "lost"
  | "archived";

export function useTenantApi() {
  return {
    leads: {
      // -------------------------
      // V1 (legacy)
      // -------------------------
      async list(params: { siteId: string; page?: number; pageSize?: number }) {
        const q = new URLSearchParams();
        q.set("site_id", params.siteId);
        q.set("page", String(params.page ?? 1));
        q.set("page_size", String(params.pageSize ?? 50));
        return apiFetch(`/tenant/leads?${q.toString()}`);
      },

      // -------------------------
      // V2 (cursor-based)
      // -------------------------

      async savedViewsV2(params: { site_id: string }) {
        const q = new URLSearchParams();
        q.set("site_id", params.site_id);
        return apiFetch(`/tenant/leads/v2/saved-views?${q.toString()}`);
      },

      async listV2(params: {
        site_id: string;

        q?: string;
        status?: string; // csv or single
        type?: string;   // csv or single
        state?: string;  // csv or single
        source_page?: string;

        priority_min?: number;
        priority_max?: number;

        created_since_hours?: number;
        next_action_due?: "now";
        est_premium_min?: number;

        archived?: "false" | "true" | "any";
        sort?: "created_at_desc" | "priority_desc" | "last_activity_desc" | "next_action_asc" | "est_premium_desc";
        limit?: number;
        cursor?: string;
      }) {
        const q = new URLSearchParams();
        q.set("site_id", params.site_id);

        if (params.q) q.set("q", params.q);
        if (params.status) q.set("status", params.status);
        if (params.type) q.set("type", params.type);
        if (params.state) q.set("state", params.state);
        if (params.source_page) q.set("source_page", params.source_page);

        if (params.priority_min != null) q.set("priority_min", String(params.priority_min));
        if (params.priority_max != null) q.set("priority_max", String(params.priority_max));

        if (params.created_since_hours != null) q.set("created_since_hours", String(params.created_since_hours));
        if (params.next_action_due) q.set("next_action_due", params.next_action_due);
        if (params.est_premium_min != null) q.set("est_premium_min", String(params.est_premium_min));

        if (params.archived) q.set("archived", params.archived);
        if (params.sort) q.set("sort", params.sort);
        if (params.limit != null) q.set("limit", String(params.limit));
        if (params.cursor) q.set("cursor", params.cursor);

        return apiFetch(`/tenant/leads/v2?${q.toString()}`);
      },

      async getV2(leadId: string, params: { site_id: string }) {
        const q = new URLSearchParams();
        q.set("site_id", params.site_id);
        return apiFetch(`/tenant/leads/v2/${encodeURIComponent(leadId)}?${q.toString()}`);
      },

      async updateStatusV2(
        leadId: string,
        body: {
          status: LeadStatusV2;
          sub_status?: string;
          reason_code?: string;
          version: number;
        },
        params: { site_id: string }
      ) {
        const q = new URLSearchParams();
        q.set("site_id", params.site_id);

        return apiFetch(`/tenant/leads/v2/${encodeURIComponent(leadId)}/status?${q.toString()}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      },

      async addNoteV2(leadId: string, body: { note_text: string; pinned?: boolean }, params: { site_id: string }) {
        const q = new URLSearchParams();
        q.set("site_id", params.site_id);

        return apiFetch(`/tenant/leads/v2/${encodeURIComponent(leadId)}/notes?${q.toString()}`, {
          method: "POST",
          body: JSON.stringify(body),
        });
      },
    },
  };
}
