<template>
  <div class="page">
    <header class="page-header">
      <div class="title">
        <h1>Leads</h1>
        <div class="count">{{ filteredCount.toLocaleString() }} leads</div>
      </div>

      <div class="actions">
        <select class="select" v-model="selectedViewId" @change="applySelectedView">
          <option value="">Saved Views</option>
          <option v-for="v in savedViews" :key="v.id" :value="v.id">{{ v.name }}</option>
        </select>

        <button class="btn secondary" @click="clearFilters">Clear</button>
      </div>
    </header>

    <section class="filters">
      <input class="input" v-model="q" placeholder="Search name / phone / email" @input="debouncedReload()" />

      <select class="select" v-model="status" @change="reload(true)">
        <option value="">All statuses</option>
        <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
      </select>

      <select class="select" v-model="type" @change="reload(true)">
        <option value="">All types</option>
        <option v-for="t in types" :key="t" :value="t">{{ t }}</option>
      </select>

      <select class="select" v-model="sort" @change="reload(true)">
        <option value="created_at_desc">Newest</option>
        <option value="priority_desc">Priority</option>
        <option value="last_activity_desc">Last touch</option>
        <option value="next_action_asc">Next action</option>
        <option value="est_premium_desc">Est $</option>
      </select>

      <button class="btn" @click="reload(true)" :disabled="loading">{{ loading ? "Loading..." : "Search" }}</button>
    </section>

    <section class="bulkbar" v-if="selectionCount > 0">
      <div>
        Selected <b>{{ selectionCount }}</b> leads
        <button class="link" @click="clearSelection">Clear</button>
      </div>
      <div class="bulk-actions">
        <button class="btn secondary" @click="bulkMarkArchived" :disabled="bulkBusy">Archive</button>
      </div>
    </section>

    <section class="card">
      <table class="table">
        <thead>
          <tr>
            <th class="chk">
              <input type="checkbox" :checked="allVisibleSelected" @change="toggleSelectVisible($event)" />
            </th>
            <th>Priority</th>
            <th>Lead</th>
            <th>Type</th>
            <th>Status</th>
            <th>Last touch</th>
            <th>State</th>
            <th>Est $</th>
            <th>Source</th>
            <th>Next</th>
            <th class="actions-col">Actions</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="lead in items" :key="lead.id" class="row" @click="openLead(lead.id)">
            <td class="chk" @click.stop>
              <input type="checkbox" :checked="selectedIds.has(lead.id)" @change="toggleOne(lead.id)" />
            </td>

            <td>
              <div class="priority">
                <b>{{ lead.priority_score }}</b>
                <span class="temp">{{ tempIcon(lead.priority_score) }}</span>
              </div>
            </td>

            <td>
              <div class="lead">
                <div class="name">{{ lead.full_name || "—" }}</div>
                <div class="sub">
                  <span>{{ lead.phone || "—" }}</span>
                  <span v-if="lead.email"> · ✉</span>
                </div>
              </div>
            </td>

            <td>{{ lead.type }}</td>

            <td @click.stop>
              <select class="pill" :value="lead.status" @change="onInlineStatusChange(lead, $event)">
                <option v-for="s in statusV2" :key="s" :value="s">{{ s }}</option>
              </select>
            </td>

            <td>{{ formatTouch(lead.last_activity_at, lead.last_activity_type) }}</td>
            <td>{{ lead.state || "—" }}</td>
            <td>{{ lead.estimated_monthly_premium ? "$" + lead.estimated_monthly_premium : "—" }}</td>

            <td>
              <button class="link" v-if="lead.source_page" @click.stop="quickFilterSource(lead.source_page)">
                {{ lead.source_page }}
              </button>
              <span v-else>—</span>
            </td>

            <td>{{ formatNext(lead.next_action_at, lead.next_action_type) }}</td>

            <td class="actions-col" @click.stop>
              <button class="icon" title="Call">📞</button>
              <button class="icon" title="Text" :disabled="lead.consent_status === 'opted_out'">💬</button>
              <button class="icon" title="Email">✉</button>
              <button class="icon" title="Details" @click="openLead(lead.id)">▸</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="pager">
        <button class="btn secondary" @click="loadMore" :disabled="loading || !nextCursor">
          {{ nextCursor ? "Load more" : "No more results" }}
        </button>
      </div>
    </section>

    <LeadsListDrawer
  v-if="drawerOpen"
  :lead-id="selectedLeadId"
  :site-id="siteId"
  @close="drawerOpen = false"
  @updated="reload(true)"
/>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watchEffect, onMounted } from "vue";
import { useRoute } from "vue-router";
import LeadsListDrawer from "./LeadsListDrawer.vue";
import { useTenantApi } from "../../services/api";
import type { LeadV2, SavedView } from "@packages/sdk/src/types/leadsV2";

const api = useTenantApi();
const route = useRoute();

const siteId = computed(() => {
  const fromRoute = String(route.query.site_id ?? "").trim();
  if (fromRoute) return fromRoute;

  const fromUrl = new URLSearchParams(window.location.search).get("site_id")?.trim();
  if (fromUrl) return fromUrl;

  const fromStorage = localStorage.getItem("last_site_id")?.trim();
  if (fromStorage) return fromStorage;

  return "";
});

watchEffect(() => {
  if (siteId.value) localStorage.setItem("last_site_id", siteId.value);
});

const loading = ref(false);
const bulkBusy = ref(false);

const items = ref<LeadV2[]>([]);
const nextCursor = ref<string | null>(null);
const filteredCount = ref(0);

const q = ref("");
const status = ref("");
const type = ref("");
const sort = ref("created_at_desc");
const sourcePage = ref("");

const statuses = ["new","contacted","qualified","unqualified","booked","closed_won","closed_lost","spam"];
const types = ["mortgage_protection","life_insurance","debt_free_life","disability","critical_illness","retirement","smartstart","other"];

const statusV2 = ["new","contacted","quoted","app_started","submitted","issued","lost","archived"];

const selectedIds = ref<Set<string>>(new Set());
const selectionCount = computed(() => selectedIds.value.size);
const allVisibleSelected = computed(() => items.value.length > 0 && items.value.every((x) => selectedIds.value.has(x.id)));

const drawerOpen = ref(false);
const selectedLeadId = ref("");

const savedViews = ref<SavedView[]>([]);
const selectedViewId = ref("");

let debounceTimer: any;

function debouncedReload() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => reload(true), 300);
}

function tempIcon(score: number) {
  if (score >= 80) return "🔥";
  if (score >= 50) return "🌤️";
  return "❄️";
}

function formatTouch(at: string | null, type: string | null) {
  if (!at) return "—";
  const d = new Date(at);
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  const label =
    mins < 60 ? `${mins}m ago` :
    mins < 1440 ? `${Math.floor(mins / 60)}h ago` :
    `${Math.floor(mins / 1440)}d ago`;
  return `${label}${type ? ` (${type})` : ""}`;
}

function formatNext(at: string | null, type: string | null) {
  if (!at) return "—";
  const d = new Date(at);
  const diff = d.getTime() - Date.now();
  const overdue = diff < 0;
  const hours = Math.round(Math.abs(diff) / 3600000);
  const when = hours < 24 ? `${hours}h` : `${Math.round(hours / 24)}d`;
  return `${type || "review"} ${overdue ? `(overdue ${when})` : `(in ${when})`}`;
}

function toggleOne(id: string) {
  const s = new Set(selectedIds.value);
  if (s.has(id)) s.delete(id);
  else s.add(id);
  selectedIds.value = s;
}

function toggleSelectVisible(e: any) {
  const checked = Boolean(e?.target?.checked);
  const s = new Set(selectedIds.value);
  if (checked) items.value.forEach((x) => s.add(x.id));
  else items.value.forEach((x) => s.delete(x.id));
  selectedIds.value = s;
}

function clearSelection() {
  selectedIds.value = new Set();
}

function openLead(id: string) {
  selectedLeadId.value = id;
  drawerOpen.value = true;
}

function quickFilterSource(src: string) {
  sourcePage.value = src;
  reload(true);
}

async function onInlineStatusChange(lead: LeadV2, e: any) {
  const newStatus = String(e?.target?.value ?? "");
  if (!newStatus || newStatus === lead.status) return;

  const prev = lead.status;
  lead.status = newStatus;

  try {
    if (!siteId.value) throw new Error("Missing site_id");
    await api.leads.updateStatusV2(
      lead.id,
      { status: newStatus, version: lead.version },
      { site_id: siteId.value }
    );
    await reload(true);
  } catch (err: any) {
    lead.status = prev;
    alert(err?.message ?? "Failed to update status");
  }
}

async function bulkMarkArchived() {
  if (selectedIds.value.size === 0) return;
  bulkBusy.value = true;
  try {
    if (!siteId.value) throw new Error("Missing site_id");
    for (const id of selectedIds.value) {
      const row = items.value.find((x) => x.id === id);
      if (!row) continue;
      await api.leads.updateStatusV2(
        id,
        { status: "archived", reason_code: "bulk_archive", version: row.version },
        { site_id: siteId.value }
      );
    }
    clearSelection();
    await reload(true);
  } finally {
    bulkBusy.value = false;
  }
}

function clearFilters() {
  q.value = "";
  status.value = "";
  type.value = "";
  sort.value = "created_at_desc";
  sourcePage.value = "";
  reload(true);
}

async function loadSavedViews() {
  if (!siteId.value) {
    savedViews.value = [];
    return;
  }
  const res = await api.leads.savedViewsV2({ site_id: siteId.value });
  savedViews.value = res.items ?? [];
}

function applySelectedView() {
  const v = savedViews.value.find((x) => x.id === selectedViewId.value);
  if (!v) return;

  const f: any = v.filters || {};
  q.value = String(f.q ?? "");
  status.value = String(f.status ?? "");
  type.value = String(f.type ?? "");
  sourcePage.value = String(f.source_page ?? "");
  sort.value = String((v.sort as any)?.key ?? f.sort ?? "created_at_desc");

  reload(true);
}

async function reload(reset: boolean) {
  if (!siteId.value) {
    items.value = [];
    nextCursor.value = null;
    filteredCount.value = 0;
    return;
  }

  loading.value = true;
  try {
    const query: any = {
      site_id: siteId.value,
      q: q.value || undefined,
      status: status.value || undefined,
      type: type.value || undefined,
      sort: sort.value,
      source_page: sourcePage.value || undefined,
      limit: 50,
    };

    if (!reset && nextCursor.value) query.cursor = nextCursor.value;

    const res = await api.leads.listV2(query);

    filteredCount.value = res.filtered_count;

    if (reset) items.value = res.items;
    else items.value = [...items.value, ...res.items];

    nextCursor.value = res.next_cursor;
  } finally {
    loading.value = false;
  }
}

async function loadMore() {
  if (!nextCursor.value) return;
  await reload(false);
}

onMounted(async () => {
  await loadSavedViews();
  await reload(true);
});
</script>

<style scoped>
.page { display: flex; flex-direction: column; gap: 16px; }
.page-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.title { display: flex; align-items: baseline; gap: 10px; }
.count { opacity: .7; font-size: 12px; }
.actions { display: flex; gap: 10px; align-items: center; }
.filters { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }

.bulkbar { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border: 1px solid rgba(0,0,0,.12); border-radius: 12px; }
.bulk-actions { display: flex; gap: 8px; }

.card { border: 1px solid rgba(0,0,0,.12); border-radius: 12px; padding: 12px; overflow: auto; }
.table { width: 100%; border-collapse: collapse; min-width: 1100px; }
.table th, .table td { padding: 10px; border-bottom: 1px solid rgba(0,0,0,.08); text-align: left; white-space: nowrap; }
.row { cursor: pointer; }
.chk { width: 40px; }
.actions-col { width: 150px; }

.input, .select { padding: 10px; border-radius: 10px; border: 1px solid rgba(0,0,0,.18); }
.btn { padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(0,0,0,.18); background: white; cursor: pointer; }
.btn.secondary { background: rgba(0,0,0,.03); }
.link { background: transparent; border: 0; padding: 0; cursor: pointer; color: inherit; text-decoration: underline; }
.icon { background: rgba(0,0,0,.03); border: 1px solid rgba(0,0,0,.12); border-radius: 10px; padding: 6px 8px; cursor: pointer; margin-right: 6px; }
.icon:disabled { opacity: .4; cursor: not-allowed; }

.pill { padding: 6px 8px; border-radius: 999px; border: 1px solid rgba(0,0,0,.18); background: white; }

.priority { display: flex; align-items: center; gap: 8px; }
.lead .name { font-weight: 600; }
.lead .sub { opacity: .7; font-size: 12px; }
.pager { display: flex; justify-content: flex-end; padding-top: 12px; }
</style>

