<script setup lang="ts">
import { computed } from 'vue'
import { renderMarkdown } from '../lib/markdown'

const props = defineProps<{ source: string }>()
const html = computed(() => renderMarkdown(props.source))
</script>

<template>
  <article class="mx-auto w-full max-w-3xl px-8 py-10">
    <div v-if="source.trim()" class="md-body" v-html="html" />
    <div v-else class="flex flex-col items-center gap-2 py-20 text-center">
      <p class="text-sm text-zinc-500">Nothing to preview yet</p>
      <p class="text-xs text-zinc-700">Write some markdown to see it rendered here.</p>
    </div>
  </article>
</template>
