<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps<{
  open: boolean
  title: string
  description?: string
  detail?: string
  confirmLabel?: string
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const confirmButton = ref<HTMLButtonElement | null>(null)

watch(() => props.open, async (open) => {
  if (!open) return
  await nextTick()
  confirmButton.value?.focus()
})
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4" @keydown.esc="emit('cancel')">
      <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" @click="emit('cancel')" />

      <div class="relative w-full max-w-[400px] rounded-xl border border-zinc-800 bg-[#0d0d0d] p-5 shadow-2xl shadow-black">
        <div class="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-red-900/50 bg-red-950/30 text-red-400">
          <AppIcon name="trash" :size="18" />
        </div>

        <h2 class="text-[15px] font-semibold text-zinc-100">{{ title }}</h2>
        <p v-if="description" class="mt-1.5 text-xs leading-relaxed text-zinc-500">{{ description }}</p>
        <div v-if="detail" class="mt-3 truncate rounded-lg border border-zinc-800 bg-[#080808] px-3 py-2 font-mono text-[11px] text-zinc-400">
          {{ detail }}
        </div>

        <div class="mt-6 flex justify-end gap-2">
          <button
            type="button"
            class="h-9 rounded-lg border border-zinc-800 px-4 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
            @click="emit('cancel')"
          >
            Cancel
          </button>
          <button
            ref="confirmButton"
            type="button"
            class="h-9 rounded-lg bg-red-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-red-500"
            @click="emit('confirm')"
          >
            {{ confirmLabel ?? 'Delete' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
