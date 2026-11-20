<script setup lang="ts">
import { ref } from 'vue'
import AppIcon from './AppIcon.vue'
import { NOTE_DRAG_MIME } from '../lib/dragDrop'
import type { FileNode, FolderNode, FsNode } from '../lib/types'

defineOptions({ name: 'FolderTree' })

defineProps<{
  nodes: FsNode[]
  activePath: string | null
  selectedFolderPath: string | null
  draggingPath: string | null
  depth?: number
}>()

const emit = defineEmits<{
  'select-file': [node: FileNode]
  'select-folder': [node: FolderNode]
  'new-note': [node: FolderNode | null]
  'delete-file': [node: FileNode]
  'drag-start': [node: FileNode]
  'drag-end': []
  'move-file': [path: string, target: FolderNode | null]
}>()

const hoverTarget = ref<string | null>(null)

function toggleFolder(node: FolderNode): void {
  node.expanded = !node.expanded
  emit('select-folder', node)
}

function onDragStart(node: FileNode, event: DragEvent): void {
  if (!event.dataTransfer) return
  event.dataTransfer.setData(NOTE_DRAG_MIME, node.path)
  event.dataTransfer.setData('text/plain', node.path)
  event.dataTransfer.effectAllowed = 'move'
  emit('drag-start', node)
}

function isInternalDrag(event: DragEvent): boolean {
  return !!event.dataTransfer && Array.from(event.dataTransfer.types).includes(NOTE_DRAG_MIME)
}

function onFolderDragOver(event: DragEvent, node: FolderNode): void {
  if (!isInternalDrag(event)) return
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
  hoverTarget.value = node.path
}

function onFolderDragLeave(node: FolderNode): void {
  if (hoverTarget.value === node.path) hoverTarget.value = null
}

function onFolderDrop(event: DragEvent, node: FolderNode): void {
  hoverTarget.value = null
  const path = event.dataTransfer?.getData(NOTE_DRAG_MIME)
  if (path) emit('move-file', path, node)
}

function forwardMove(path: string, target: FolderNode | null): void {
  emit('move-file', path, target)
}
</script>

<template>
  <ul class="space-y-0.5">
    <li v-for="node in nodes" :key="node.path || node.name">
      <div
        class="group flex h-8 items-center gap-1.5 rounded-md pr-1.5 text-[13px] transition-colors"
        :class="[
          node.kind === 'folder' && hoverTarget === node.path
            ? 'bg-zinc-800 text-zinc-100 ring-1 ring-inset ring-zinc-500'
            : node.kind === 'file' && node.path === activePath
              ? 'bg-zinc-800 text-zinc-100'
              : node.kind === 'folder' && node.path === selectedFolderPath
                ? 'bg-zinc-800/60 text-zinc-100'
                : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200',
          node.kind === 'file' ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
          draggingPath === node.path ? 'opacity-40' : '',
        ]"
        :style="{ paddingLeft: `${8 + (depth ?? 0) * 12}px` }"
        :draggable="node.kind === 'file'"
        @click="node.kind === 'file' ? emit('select-file', node) : toggleFolder(node)"
        @dragstart="node.kind === 'file' && onDragStart(node, $event)"
        @dragend="emit('drag-end')"
        @dragover.prevent="node.kind === 'folder' && onFolderDragOver($event, node)"
        @dragleave="node.kind === 'folder' && onFolderDragLeave(node)"
        @drop.prevent.stop="node.kind === 'folder' && onFolderDrop($event, node)"
      >
        <AppIcon
          v-if="node.kind === 'folder'"
          :name="node.expanded ? 'chevron-down' : 'chevron-right'"
          :size="12"
          class="shrink-0 text-zinc-600"
        />
        <span v-else class="w-3 shrink-0" />

        <AppIcon
          :name="node.kind === 'folder' ? (node.expanded ? 'folder-open' : 'folder') : 'file-text'"
          :size="15"
          class="shrink-0"
          :class="node.kind === 'folder' ? 'text-zinc-500' : 'text-zinc-600'"
        />

        <span class="min-w-0 flex-1 truncate">{{ node.name }}</span>

        <button
          v-if="node.kind === 'folder'"
          class="hidden h-5 w-5 items-center justify-center rounded text-zinc-500 hover:bg-zinc-700 hover:text-zinc-100 group-hover:flex"
          title="New note here"
          @click.stop="emit('new-note', node)"
        >
          <AppIcon name="plus" :size="13" />
        </button>
        <button
          v-else
          class="hidden h-5 w-5 items-center justify-center rounded text-zinc-500 hover:bg-red-950/70 hover:text-red-300 group-hover:flex"
          title="Delete note"
          @click.stop="emit('delete-file', node)"
        >
          <AppIcon name="trash" :size="13" />
        </button>
      </div>

      <FolderTree
        v-if="node.kind === 'folder' && node.expanded && node.children.length"
        :nodes="node.children"
        :depth="(depth ?? 0) + 1"
        :active-path="activePath"
        :selected-folder-path="selectedFolderPath"
        :dragging-path="draggingPath"
        @select-file="emit('select-file', $event)"
        @select-folder="emit('select-folder', $event)"
        @new-note="emit('new-note', $event)"
        @delete-file="emit('delete-file', $event)"
        @drag-start="emit('drag-start', $event)"
        @drag-end="emit('drag-end')"
        @move-file="forwardMove"
      />
      <div
        v-else-if="node.kind === 'folder' && node.expanded"
        class="py-1 text-[11px] text-zinc-700"
        :style="{ paddingLeft: `${38 + (depth ?? 0) * 12}px` }"
      >
        Empty folder
      </div>
    </li>
  </ul>
</template>
