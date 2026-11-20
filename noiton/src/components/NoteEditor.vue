<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const textarea = ref<HTMLTextAreaElement | null>(null)
const gutter = ref<HTMLDivElement | null>(null)
const lineNumbers = computed(() => Array.from({ length: props.modelValue.split('\n').length }, (_, index) => index + 1))

function onInput(event: Event): void {
  emit('update:modelValue', (event.target as HTMLTextAreaElement).value)
}

function syncScroll(): void {
  if (gutter.value && textarea.value) gutter.value.scrollTop = textarea.value.scrollTop
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Tab') {
    event.preventDefault()
    const element = textarea.value
    if (!element) return
    const start = element.selectionStart
    const end = element.selectionEnd
    emit('update:modelValue', `${props.modelValue.slice(0, start)}  ${props.modelValue.slice(end)}`)
    void nextTick(() => {
      element.selectionStart = start + 2
      element.selectionEnd = start + 2
    })
  }
}

watch(() => props.modelValue, () => void nextTick(syncScroll))
</script>

<template>
  <div class="relative flex min-h-0 min-w-0 flex-col bg-black">
    <div class="flex min-h-0 flex-1 overflow-hidden">
      <div
        ref="gutter"
        class="w-12 shrink-0 select-none overflow-hidden border-r border-zinc-900 bg-[#050505] py-5 pr-3 text-right font-mono text-[12px] leading-6 text-zinc-700"
      >
        <div v-for="number in lineNumbers" :key="number">{{ number }}</div>
      </div>

      <textarea
        ref="textarea"
        :value="modelValue"
        spellcheck="false"
        aria-label="Markdown editor"
        placeholder="Start writing markdown…"
        class="h-full min-h-0 flex-1 resize-none bg-transparent py-5 pl-4 pr-6 font-mono text-[13px] leading-6 text-zinc-200 outline-none placeholder:text-zinc-700"
        @input="onInput"
        @scroll="syncScroll"
        @keydown="onKeydown"
      />
    </div>

    <div class="flex h-9 shrink-0 items-center justify-between border-t border-zinc-900 px-4 font-mono text-[11px] text-zinc-600">
      <span>MARKDOWN</span>
      <span>UTF-8</span>
    </div>
  </div>
</template>
