<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { apiFetch, ApiError } from "../../lib/api";
import { useTenantStore } from "../../stores/tenant";

type Lead = {
  id: string;
  site_id: string;
  created_at: string;
  updated_at: string;
  type: string;
  status: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  source_page: string | null;
  payload: Record<string, unknown>;
};

type LeadHistory = {
  id: string;
  lead_id: string;
  site_id: string;
  from_status: string;
  to_status: string;
  actor_sub: string | null;
  note: string | null;
  created_at: string;
};

const props = defineProps<{
  open: boolean;
  leadId: string | null;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "updated"): void;
}>();

const store = useTenantStore();

const loading = ref(false);
const saving = ref(false);
const lead = ref<Lead | null>(null);
const history = ref<LeadHistory[]>([]);
const errorMsg = ref<string | null>(null);
const errorRequestId = ref<string | null>(null);

const statuses = ["new","contacted","qualified","unqualified","booked","closed_won","closed_lost","spam"];

const nextStatus = ref<string>("new");
const note = ref<string>("");

const canLoad = computed(() => props.open && !!props.leadId && !!store.site_id);

function formatDate(iso: string) {
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

async function load() {
  if (!props.leadId || !store.site_id) return;

  loading.value = true;
  errorMsg.value = null;
  errorRequestId.value = null;

  try {
    const res = await apiFetch<{ lead: Lead; history: LeadHistory[] }>(
      `/tenant/leads/${encodeURIComponent(props.leadId)}?site_id=${encodeURIComponent(store.site_id)}`
    );

    lead.value = res.lead;
    history.value = res.history;
    nextStatus.value = res.lead.status;
  } catch (e: any) {
    if (e instanceof ApiError) {
      errorMsg.value = e.message;
      errorRequestId.value = e.requestId ?? null;
    } else {
      errorMsg.value = String(e?.message ?? e);
    }
  } finally {
    loading.value = false;
  }
}

async function save() {
  if (!lead.value || !store.site_id) return;

  saving.value = true;
  errorMsg.value = null;
  errorRequestId.value = null;

  try {
    await apiFetch(
      `/tenant/leads/${encodeURIComponent(lead.value.id)}?site_id=${encodeURIComponent(store.site_id)}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          status: nextStatus.value,
          note: note.value || undefined,
        }),
      }
    );

    note.value = "";
    emit("updated");
    await load();
  } catch (e: any) {
    if (e instanceof ApiError) {
      errorMsg.value = e.message;
      errorRequestId.value = e.requestId ?? null;
    } else {
      errorMsg.value = String(e?.message ?? e);
    }
  } finally {
    saving.value = false;
  }
}

watch(
  () => [canLoad.value, props.leadId],
  () => {
    if (canLoad.value) load();
  },
  { immediate: true }
);
</script>

<template>
  <div v-if="open" class="overlay" @click.self="emit('close')">
    <div class="modal">
      <div class="header">
        <div>
          <div class="title">Lead Detail</div>
          <div v-if="lead" class="subtitle">
            {{ lead.full_name || "Unknown" }} · {{ lead.type }} · {{ formatDate(lead.created_at) }}
          </div>
        </div>
        <button class="btn secondary" @click="emit('close')">Close</button>
      </div>

      <div v-if="!store.site_id" class="card">
        Missing site_id. Append ?site_id=YOUR_SITE_ID to the URL.
      </div>

      <div v-else-if="loading" class="card">Loading…</div>

      <div v-else-if="errorMsg" class="card error">
        <div class="font">Could not load lead.</div>
        <div class="small">{{ errorMsg }}</div>
        <div v-if="errorRequestId" class="small">Request ID: {{ errorRequestId }}</div>
      </div>

      <div v-else-if="lead" class="content">
        <div class="card">
          <div class="grid">
            <div>
              <div class="label">Name</div>
              <div>{{ lead.full_name || "-" }}</div>
            </div>
            <div>
              <div class="label">Phone</div>
              <div>{{ lead.phone || "-" }}</div>
            </div>
            <div>
              <div class="label">Email</div>
              <div>{{ lead.email || "-" }}</div>
            </div>
            <div>
              <div class="label">Source Page</div>
              <div>{{ lead.source_page || "-" }}</div>
            </div>
            <div>
              <div class="label">Status</div>
              <select class="input" v-model="nextStatus">
                <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
              </select>
            </div>
          </div>

          <div class="mt">
            <div class="label">Internal Note (optional)</div>
            <textarea class="textarea" v-model="note" rows="3" placeholder="Add a note…" />
          </div>

          <div class="actions">
            <button class="btn" @click="save" :disabled="saving">
              {{ saving ? "Saving…" : "Save" }}
            </button>
          </div>
        </div>

        <div class="card" v-if="history.length">
          <div class="sectionTitle">Status History</div>
          <div v-for="h in history" :key="h.id" class="historyRow">
            <div class="small">{{ formatDate(h.created_at) }}</div>
            <div>
              {{ h.from_status }} → {{ h.to_status }}
              <span v-if="h.note">· {{ h.note }}</span>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="sectionTitle">Raw Payload</div>
          <pre class="pre">{{ JSON.stringify(lead.payload, null, 2) }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.35);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 28px 12px;
}
.modal {
  width: min(900px, 100%);
  background: white;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid rgba(0,0,0,.12);
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px;
  border-bottom: 1px solid rgba(0,0,0,.08);
}
.title { font-weight: 700; font-size: 16px; }
.subtitle { font-size: 12px; opacity: .7; margin-top: 3px; }
.content { padding: 14px; display: flex; flex-direction: column; gap: 12px; }
.card {
  border: 1px solid rgba(0,0,0,.12);
  border-radius: 12px;
  padding: 12px;
}
.card.error { border-color: rgba(220, 38, 38, .35); }
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.label { font-size: 12px; opacity: .7; margin-bottom: 4px; }
.input {
  width: 100%;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid rgba(0,0,0,.18);
}
.textarea {
  width: 100%;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid rgba(0,0,0,.18);
}
.actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
.btn {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(0,0,0,.18);
  background: white;
  cursor: pointer;
}
.btn.secondary { background: rgba(0,0,0,.03); }
.sectionTitle { font-weight: 600; margin-bottom: 8px; }
.historyRow { padding: 10px 0; border-top: 1px solid rgba(0,0,0,.08); }
.small { font-size: 12px; opacity: .75; }
.pre {
  max-height: 300px;
  overflow: auto;
  background: rgba(0,0,0,.03);
  padding: 10px;
  border-radius: 10px;
  font-size: 12px;
}
.mt { margin-top: 12px; }
.font { font-weight: 600; }
</style>
