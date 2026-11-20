<script setup lang="ts">
import type { IconName } from '../lib/types'

const ICON_PATHS: Record<IconName, string[]> = {
  'file-text': [
    'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z',
    'M14 2v5h5',
    'M9 13h6',
    'M9 17h6',
  ],
  'file-plus': [
    'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z',
    'M14 2v5h5',
    'M12 11v6',
    'M9 14h6',
  ],
  folder: ['M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z'],
  'folder-open': [
    'm6 14 1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2',
  ],
  'folder-plus': [
    'M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z',
    'M12 10v6',
    'M9 13h6',
  ],
  'chevron-right': ['m9 18 6-6-6-6'],
  'chevron-down': ['m6 9 6 6 6-6'],
  plus: ['M5 12h14', 'M12 5v14'],
  refresh: [
    'M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8',
    'M21 3v5h-5',
    'M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16',
    'M8 16H3v5',
  ],
  eye: [
    'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z',
    'M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  ],
  pencil: [
    'm15 5 4 4',
    'M13.5 6.5 3 17v4h4l10.5-10.5',
    'm13.5 6.5 4 4',
  ],
  columns: ['M3 4h18v16H3z', 'M12 4v16'],
  check: ['m20 6-11 11-5-5'],
  x: ['M18 6 6 18', 'M6 6l12 12'],
  spinner: ['M21 12a9 9 0 1 1-6.219-8.56'],
  alert: [
    'M12 3 2 20h20L12 3Z',
    'M12 9v5',
    'M12 17h.01',
  ],
  trash: [
    'M3 6h18',
    'M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2',
    'M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6',
    'M10 11v6',
    'M14 11v6',
  ],
}

defineProps<{
  name: IconName
  size?: number
  class?: string
}>()
</script>

<template>
  <svg
    :width="size ?? 16"
    :height="size ?? 16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    :class="$props.class"
    aria-hidden="true"
  >
    <path v-for="(path, index) in ICON_PATHS[name]" :key="index" :d="path" />
  </svg>
</template>
