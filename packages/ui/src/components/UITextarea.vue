<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    placeholder?: string;
    disabled?: boolean;
    name?: string;
    id?: string;
    rows?: number;
  }>(),
  {
    modelValue: "",
    placeholder: "",
    disabled: false,
    rows: 3,
  }
);

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
}>();

const className = computed(() => {
  return [
    "w-full rounded-xl border border-border-subtle bg-surface px-3 py-2 text-sm text-text-default",
    "placeholder:text-text-muted",
    "focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2",
    "disabled:opacity-60 disabled:pointer-events-none",
    "resize-y",
  ].join(" ");
});

function onInput(e: Event) {
  const target = e.target as HTMLTextAreaElement;
  emit("update:modelValue", target.value);
}
</script>

<template>
  <textarea
    :id="id"
    :name="name"
    :rows="rows"
    :placeholder="placeholder"
    :value="modelValue"
    :disabled="disabled"
    :class="className"
    @input="onInput"
  />
</template>
