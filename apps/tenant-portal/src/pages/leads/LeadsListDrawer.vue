<template>
  <div class="overlay" @click.self="emit('close')">
    <div class="drawer">
      <header class="drawer-header">
        <div>
          <h2 class="h2">{{ lead?.full_name || "Lead" }}</h2>
          <div class="meta">
            <span class="badge">{{ lead?.status }}</span>
            <span v-if="lead?.sub_status" class="badge secondary">{{ lead.sub_status }}</span>
            <span class="muted">· Priority {{ lead?.priority_score ?? 0 }}</span>
          </div>
        </div>
        <button class="btn secondary" @click="emit('close')">Close</button>
      </header>

      <section v-if="loading" class="card">Loading…</section>

      <section v-else class="card">
        <div class="grid">
          <div>
            <div class="label">Phone</div>
            <div>{{ lead?.phone || "—" }}</div>
          </div>
          <div>
            <div class="label">Email</div>
            <div>{{ lead?.email || "—" }}</div>
          </div>
          <div>
            <div class="label">Type</div>
            <div>{{ lead?.type }}</div>
          </div>
          <div>
            <div class="label">State</div>
            <div>{{ lead?.state || "—" }}</div>
          </div>
        </div>

        <div class="row2">
          <div class="block">
            <div class="label">Status</div>
            <select class="select" v-model="status">
              <option v-for="s in statusV2" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>

          <div class="block">
            <div class="label">Sub-status</div>
            <select class="select" v-model="subStatus">
              <option value="">—</option>
              <option v-for="s in subStatuses" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>

          <div class="block" v-if="status === 'lost' || status === 'archived'">
            <div class="label">Reason code</div>
            <input class="input" v-model="reasonCode" placeholder="e.g. not_qualified" />
          </div>
        </div>

        <div class="actions">
          <button class="btn" @click="saveStatus" :disabled="saving">Save</button>
        </div>
      </section>

      <section class="card">
        <h3>Notes</h3>

        <div class="note-add">
          <input class="input" v-model="newNote" placeholder="Add a note and press Enter…" @keydown.enter.prevent="addNote" />
          <button class="btn secondary" @click="addNote" :disabled="noteSaving">Add</button>
        </div>

        <div v-if="notes.length === 0" class="muted">No notes yet.</div>

        <div v-for="n in notes" :key="n.id" class="note">
          <div class="note-top">
            <span class="small">{{ fmt(n.created_at) }}</span>
            <span v-if="n.pinned" class="badge secondary">Pinned</span>
          </div>
          <div>{{ n.note_text }}</div>
        </div>
      </section>

      <section class="card">
        <h3>Timeline</h3>
        <div v-if="events.length === 0" class="muted">No activity yet.</div>
        <div v-for="e in events" :key="e.id" class="event">
          <div class="small">{{ fmt(e.occurred_at) }} · {{ e.event_type }}</div>
          <div class="muted">{{ summarize(e) }}</div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { useRoute } from "vue-router";
import { useTenantApi } from "../../services/api";

const props = defineProps<{ leadId: string; siteId: string }>();

const emit = defineEmits<{ (e: "close"): void; (e: "updated"): void }>();

const api = useTenantApi();
const route = useRoute();

// Pull site_id from the page URL: /leads?site_id=...
const siteId = computed(() => String(route.query.site_id ?? "").trim());

const loading = ref(true);
const saving = ref(false);
const noteSaving = ref(false);

const lead = ref<any>(null);
const notes = ref<any[]>([]);
const events = ref<any[]>([]);

const statusV2 = ["new","contacted","quoted","app_started","submitted","issued","lost","archived"];
const subStatuses = ["no_answer","left_vm","texted","follow_up","declined","postponed","not_qualified"];

const status = ref("new");
const subStatus = ref("");
const reasonCode = ref("");

const newNote = ref("");

function fmt(iso: string) {
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

function summarize(e: any) {
  try {
    const m = e.metadata ? (typeof e.metadata === "string" ? JSON.parse(e.metadata) : e.metadata) : {};
    if (e.event_type === "status_changed") return `${m.from_status} → ${m.to_status}${m.reason_code ? ` (${m.reason_code})` : ""}`;
    return JSON.stringify(m);
  } catch {
    return "";
  }
}

function requireSiteId() {
  if (!siteId.value) throw new Error("Missing site_id in URL (add ?site_id=...)");
  return siteId.value;
}

async function load() {
  loading.value = true;
  try {
    const sid = requireSiteId();
    const res = await api.leads.getV2(props.leadId, { site_id: props.siteId });


    lead.value = res.lead;
    notes.value = res.notes ?? [];
    events.value = res.events ?? [];

    status.value = String(res.lead.status ?? "new");
    subStatus.value = String(res.lead.sub_status ?? "");
  } finally {
    loading.value = false;
  }
}

async function saveStatus() {
  if (!lead.value) return;
  saving.value = true;
  try {
    const sid = requireSiteId();

    await api.leads.updateStatusV2(
      lead.value.id,
      {
        status: status.value,
        sub_status: subStatus.value || undefined,
        reason_code:
          status.value === "lost" || status.value === "archived"
            ? (reasonCode.value || undefined)
            : undefined,
        version: Number(lead.value.version),
      },
      { site_id: sid }
    );

    emit("updated");
    await load();
  } finally {
    saving.value = false;
  }
}

async function addNote() {
  const text = newNote.value.trim();
  if (!text) return;
  noteSaving.value = true;
  try {
    const sid = requireSiteId();

await api.leads.addNoteV2(props.leadId, { note_text: text }, { site_id: props.siteId });


    newNote.value = "";
    emit("updated");
    await load();
  } finally {
    noteSaving.value = false;
  }
}

watch(() => props.leadId, () => load(), { immediate: true });
</script>


<style scoped>
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: flex; justify-content: flex-end; }
.drawer { width: min(620px, 100%); background: white; height: 100%; padding: 16px; overflow: auto; display: flex; flex-direction: column; gap: 12px; }
.drawer-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
.h2 { margin: 0; }
.meta { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.muted { opacity: .7; }
.small { font-size: 12px; opacity: .75; }

.card { border: 1px solid rgba(0,0,0,.12); border-radius: 12px; padding: 12px; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.label { font-size: 12px; opacity: .7; margin-bottom: 4px; }

.row2 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-top: 12px; }
.block { min-width: 0; }

.select, .input { width: 100%; padding: 10px; border-radius: 10px; border: 1px solid rgba(0,0,0,.18); }

.actions { display: flex; justify-content: flex-end; margin-top: 12px; }
.btn { padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(0,0,0,.18); background: white; cursor: pointer; }
.btn.secondary { background: rgba(0,0,0,.03); }

.badge { border: 1px solid rgba(0,0,0,.14); border-radius: 999px; padding: 4px 8px; font-size: 12px; }
.badge.secondary { background: rgba(0,0,0,.04); }

.note-add { display: flex; gap: 8px; align-items: center; margin-bottom: 10px; }
.note { padding: 10px 0; border-top: 1px solid rgba(0,0,0,.08); }
.note-top { display: flex; gap: 8px; align-items: center; margin-bottom: 6px; }

.event { padding: 10px 0; border-top: 1px solid rgba(0,0,0,.08); }
</style>
