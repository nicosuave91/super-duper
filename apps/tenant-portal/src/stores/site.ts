import { defineStore } from "pinia";

export type SiteSummary = {
  site_id: string;
  role: string;
  slug: string | null;
  site_name: string | null;
  status: string | null;
};

const LS_KEY = "active_site_id";

export const useSiteStore = defineStore("site", {
state: () => ({
  sites: [] as SiteSummary[],
  activeSiteId:
    typeof localStorage === "undefined" ? "" : (localStorage.getItem(LS_KEY) ?? ""),
}),

  actions: {
    async loadSites() {
      // Multi-site selection is not enabled yet.
      this.sites = [];
    },
    setActiveSite(site_id: string) {
      this.activeSiteId = site_id;
      localStorage.setItem(LS_KEY, site_id);
    },
  },
});
