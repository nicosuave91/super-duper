import type { LeadsV2ListResponse, LeadV2DrawerResponse, SavedView } from "../types/leadsV2";

  listV2(query: Record<string, any> = {}) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === "") continue;
      params.set(k, String(v));
    }
    const qs = params.toString() ? `?${params.toString()}` : "";
    return this.http.get<LeadsV2ListResponse>(`/tenant/leads/v2${qs}`);
  }

  getV2(id: string) {
    return this.http.get<LeadV2DrawerResponse>(`/tenant/leads/v2/${id}`);
  }

  updateStatusV2(id: string, body: { status?: string; sub_status?: string; reason_code?: string; next_action_at?: string; next_action_type?: string; version: number; }) {
    return this.http.patch<{ ok: true; lead: any }>(`/tenant/leads/v2/${id}/status`, body);
  }

  addNoteV2(id: string, body: { note_text: string; pinned?: boolean }) {
    return this.http.post<{ ok: true; id: string }>(`/tenant/leads/v2/${id}/notes`, body);
  }

  savedViewsV2() {
    return this.http.get<{ items: SavedView[] }>(`/tenant/leads/v2/saved-views`);
  }
