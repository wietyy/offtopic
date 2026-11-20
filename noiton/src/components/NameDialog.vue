<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps<{
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  location?: string
  error?: string | null
}>()

const emit = defineEmits<{
  confirm: [name: string]
  cancel: []
}>()

const name = ref('')
const input = ref<HTMLInputElement | null>(null)

watch(() => props.open, async (open) => {
  if (!open) return
  name.value = ''
  await nextTick()
  input.value?.focus()
})

function submit(): void {
  emit('confirm', name.value)
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4" @keydown.esc="emit('cancel')">
      <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" @click="emit('cancel')" />

      <div class="relative w-full max-w-[420px] rounded-xl border border-zinc-800 bg-[#0d0d0d] p-5 shadow-2xl shadow-black">
        <div class="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 class="text-[15px] font-semibold text-zinc-100">{{ title }}</h2>
            <p v-if="description" class="mt-1 text-xs text-zinc-500">{{ description }}</p>
          </div>
          <button
            class="rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
            aria-label="Close"
            @click="emit('cancel')"
          >
            <AppIcon name="x" :size="16" />
          </button>
        </div>

        <form @submit.prevent="submit">
          <label class="mb-2 block text-xs font-medium text-zinc-400" for="item-name">Name</label>
          <input
            id="item-name"
            ref="input"
            v-model="name"
            autocomplete="off"
            spellcheck="false"
            :placeholder="title === 'New folder' ? 'Projects' : 'untitled'"
            class="h-10 w-full rounded-lg border border-zinc-800 bg-[#080808] px-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-700 focus:border-zinc-600 focus:ring-1 focus:ring-zinc-700"
          />
          <p v-if="location" class="mt-2 truncate text-[11px] text-zinc-600">in {{ location }}</p>
          <p v-if="error" class="mt-2 flex items-center gap-1.5 text-xs text-red-400">
            <AppIcon name="alert" :size="13" />
            {{ error }}
          </p>

          <div class="mt-6 flex justify-end gap-2">
            <button
              type="button"
              class="h-9 rounded-lg border border-zinc-800 px-4 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
              @click="emit('cancel')"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="h-9 rounded-lg bg-zinc-100 px-4 text-xs font-semibold text-zinc-900 transition-colors hover:bg-white"
            >
              {{ confirmLabel ?? 'Create' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>
