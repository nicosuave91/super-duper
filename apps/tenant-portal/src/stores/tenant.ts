import { defineStore } from "pinia";
import { apiFetch } from "@/lib/api";

export type TenantMe = {
  site_id: string;
  role: string;
  slug: string;
  site_name: string;
  request_id: string;
};

export const useTenantStore = defineStore("tenant", {
  state: () => ({
    tenantMe: null as TenantMe | null,
    site_id: "" as string,
    loaded: false as boolean,
  }),

  actions: {
    async loadTenantMe(siteId?: string | null) {
      const url = siteId ? `/tenant/me?site_id=${encodeURIComponent(siteId)}` : "/tenant/me";

      // apiFetch returns parsed JSON; it throws ApiError if non-OK
      const data = await apiFetch<any>(url);

      this.tenantMe = data?.tenantMe ?? data ?? null;
      this.site_id = siteId ?? data?.site_id ?? this.tenantMe?.site_id ?? "";
      this.loaded = true;
    },

    async setSiteId(next: string | null) {
      this.site_id = next ?? "";
      if (next) {
        await this.loadTenantMe(next);
      }
    },

    async bootstrap() {
      await this.loadTenantMe(this.site_id || undefined);
    },
  },
});
