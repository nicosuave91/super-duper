<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    placeholder?: string;
    type?: string;
    disabled?: boolean;
    name?: string;
    id?: string;
  }>(),
  {
    modelValue: "",
    placeholder: "",
    type: "text",
    disabled: false,
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
  ].join(" ");
});

function onInput(e: Event) {
  const target = e.target as HTMLInputElement;
  emit("update:modelValue", target.value);
}
</script>

<template>
  <input
    :id="id"
    :name="name"
    :type="type"
    :placeholder="placeholder"
    :value="modelValue"
    :disabled="disabled"
    :class="className"
    @input="onInput"
  />
</template>
