<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import AppIcon from './components/AppIcon.vue'
import ConfirmDialog from './components/ConfirmDialog.vue'
import FolderTree from './components/FolderTree.vue'
import MarkdownView from './components/MarkdownView.vue'
import NameDialog from './components/NameDialog.vue'
import NoteEditor from './components/NoteEditor.vue'
import { useFileSystem } from './composables/useFileSystem'
import { NOTE_DRAG_MIME } from './lib/dragDrop'
import type { FileNode, FolderNode, IconName, ViewMode } from './lib/types'

const {
  tree,
  rootNode,
  activeFile,
  activeFolder,
  content,
  dirty,
  saving,
  loading,
  lastSaved,
  error,
  isSupported,
  noteCount,
  clearError,
  queueSave,
  save,
  selectFile,
  selectFolder,
  createNote,
  createFolder,
  moveFileByPath,
  deleteFile,
  openFolder,
  refresh,
} = useFileSystem()

const viewMode = ref<ViewMode>('split')
const dialog = ref<{ kind: 'note' | 'folder'; folder: FolderNode | null } | null>(null)
const draggingFile = ref<FileNode | null>(null)
const rootDropActive = ref(false)
const deleteTarget = ref<FileNode | null>(null)

const modes: { value: ViewMode; label: string; icon: IconName }[] = [
  { value: 'edit', label: 'Edit', icon: 'pencil' },
  { value: 'split', label: 'Split', icon: 'columns' },
  { value: 'preview', label: 'Preview', icon: 'eye' },
]

const pathParts = computed(() => activeFile.value?.path.split('/') ?? [])
const wordCount = computed(() => {
  const trimmed = content.value.trim()
  return trimmed ? trimmed.split(/\s+/).length : 0
})
const lineCount = computed(() => content.value.split('\n').length)
const statusText = computed(() => {
  if (saving.value) return 'Saving…'
  if (dirty.value) return 'Unsaved changes'
  if (lastSaved.value) return `Saved ${lastSaved.value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  return 'All changes saved'
})
const statusDotClass = computed(() =>
  saving.value ? 'animate-pulse bg-amber-400' : dirty.value ? 'bg-amber-400' : 'bg-emerald-500',
)
const dialogTitle = computed(() => dialog.value?.kind === 'folder' ? 'New folder' : 'New note')
const dialogLocation = computed(() => {
  const root = rootNode.value?.name ?? ''
  const folder = dialog.value?.folder
  if (!folder) return root || 'workspace root'
  return folder.path ? `${root}/${folder.path}` : root
})
const deleteDetail = computed(() => deleteTarget.value?.path ?? '')

function setContent(value: string): void {
  content.value = value
  queueSave()
}

function openDialog(kind: 'note' | 'folder', folder: FolderNode | null = null): void {
  clearError()
  dialog.value = { kind, folder }
}

function closeDialog(): void {
  dialog.value = null
  clearError()
}

async function confirmDialog(name: string): Promise<void> {
  if (!dialog.value) return
  const created = dialog.value.kind === 'note'
    ? await createNote(name, dialog.value.folder)
    : await createFolder(name, dialog.value.folder)
  if (created) closeDialog()
}

function onDragStart(node: FileNode): void {
  draggingFile.value = node
}

function onDragEnd(): void {
  draggingFile.value = null
  rootDropActive.value = false
}

async function onMoveFile(path: string, target: FolderNode | null): Promise<void> {
  await moveFileByPath(path, target)
  draggingFile.value = null
  rootDropActive.value = false
}

function onRootDragOver(event: DragEvent): void {
  if (!event.dataTransfer?.types.includes(NOTE_DRAG_MIME)) return
  event.dataTransfer.dropEffect = 'move'
  rootDropActive.value = true
}

async function onRootDrop(event: DragEvent): Promise<void> {
  rootDropActive.value = false
  const path = event.dataTransfer?.getData(NOTE_DRAG_MIME)
  if (path) await onMoveFile(path, null)
}

function openDeleteDialog(node: FileNode): void {
  clearError()
  deleteTarget.value = node
}

async function confirmDelete(): Promise<void> {
  if (!deleteTarget.value) return
  const removed = await deleteFile(deleteTarget.value)
  if (removed) deleteTarget.value = null
}

function onGlobalKeydown(event: KeyboardEvent): void {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
    event.preventDefault()
    void save()
  }
}

onMounted(() => window.addEventListener('keydown', onGlobalKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onGlobalKeydown))
</script>

<template>
  <div class="flex h-screen w-full overflow-hidden bg-black text-zinc-100">
    <aside class="flex w-69 shrink-0 flex-col border-r border-zinc-800/80 bg-[#080808]">
      <div class="flex items-center gap-2.5 px-4 py-4">
        <div class="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700/70 bg-zinc-900 text-zinc-100">
          <AppIcon name="file-text" :size="16" />
        </div>
        <div class="min-w-0">
          <p class="text-sm font-semibold tracking-tight">noiton</p>
          <p class="text-[11px] text-zinc-500">local markdown notes</p>
        </div>
      </div>

      <div class="space-y-2 px-3 pb-3">
        <button
          class="flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-zinc-100 px-3 text-xs font-semibold text-zinc-900 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
          @click="openFolder"
        >
          <AppIcon name="folder-open" :size="15" />
          Open folder
        </button>

        <div class="flex gap-2">
          <button
            class="flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="!rootNode"
            @click="openDialog('note')"
          >
            <AppIcon name="file-plus" :size="15" />
            New note
          </button>
          <button
            class="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/60 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="!rootNode"
            title="New folder"
            @click="openDialog('folder')"
          >
            <AppIcon name="folder-plus" :size="15" />
          </button>
          <button
            class="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/60 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="!rootNode"
            title="Refresh from disk"
            @click="refresh"
          >
            <AppIcon name="refresh" :size="15" :class="loading ? 'animate-spin' : ''" />
          </button>
        </div>
      </div>

      <div class="mx-3 border-t border-zinc-800/80" />

      <div class="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        <template v-if="rootNode">
          <div class="flex items-center justify-between px-2 pb-2">
            <span class="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Explorer</span>
            <span class="text-[10px] text-zinc-600">{{ noteCount }} {{ noteCount === 1 ? 'note' : 'notes' }}</span>
          </div>
          <div
            v-if="draggingFile"
            class="mb-2 flex h-9 items-center justify-center gap-2 rounded-lg border border-dashed text-[11px] transition-colors"
            :class="rootDropActive ? 'border-zinc-400 bg-zinc-800/70 text-zinc-100' : 'border-zinc-700 text-zinc-500'"
            @dragover.prevent="onRootDragOver"
            @dragleave="rootDropActive = false"
            @drop.prevent="onRootDrop"
          >
            <AppIcon name="folder-open" :size="14" />
            Move to workspace root
          </div>

          <FolderTree
            :nodes="tree"
            :active-path="activeFile?.path ?? null"
            :selected-folder-path="activeFolder?.path ?? null"
            :dragging-path="draggingFile?.path ?? null"
            @select-file="selectFile"
            @select-folder="selectFolder"
            @new-note="openDialog('note', $event)"
            @delete-file="openDeleteDialog"
            @drag-start="onDragStart"
            @drag-end="onDragEnd"
            @move-file="onMoveFile"
          />
        </template>
        <div v-else class="px-4 py-10 text-center">
          <div class="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-600">
            <AppIcon name="folder" :size="18" />
          </div>
          <p class="text-xs text-zinc-400">No folder open</p>
          <p class="mt-1 text-[11px] leading-relaxed text-zinc-600">Pick a folder of markdown files to start editing.</p>
        </div>
      </div>

      <div class="border-t border-zinc-800/80 px-4 py-3">
        <div class="flex items-center justify-between gap-2 text-[11px]">
          <span class="truncate text-zinc-500">{{ rootNode?.name ?? 'No workspace' }}</span>
          <span class="flex shrink-0 items-center gap-1.5 text-zinc-600">
            <span class="h-1.5 w-1.5 rounded-full" :class="rootNode ? 'bg-emerald-500' : 'bg-zinc-700'" />
            {{ rootNode ? 'Connected' : 'Offline' }}
          </span>
        </div>
      </div>
    </aside>

    <main class="flex min-w-0 flex-1 flex-col bg-black">
      <header class="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-zinc-800/80 px-5">
        <div class="flex min-w-0 items-center gap-2 text-sm">
          <AppIcon v-if="loading" name="spinner" :size="14" class="mr-1 animate-spin text-zinc-500" />
          <template v-if="activeFile">
            <span class="shrink-0 text-zinc-500">{{ rootNode?.name }}</span>
            <template v-for="(part, index) in pathParts" :key="part">
              <span class="shrink-0 text-zinc-700">/</span>
              <span :class="index === pathParts.length - 1 ? 'truncate text-zinc-200' : 'truncate text-zinc-500'">{{ part }}</span>
            </template>
          </template>
          <span v-else class="text-zinc-500">No note open</span>
        </div>

        <div class="flex shrink-0 items-center gap-3">
          <span class="hidden font-mono text-[11px] text-zinc-600 sm:inline">{{ wordCount }} words</span>
          <div class="flex items-center rounded-lg border border-zinc-800 bg-zinc-900/70 p-0.5">
            <button
              v-for="mode in modes"
              :key="mode.value"
              class="flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[11px] font-medium transition-colors"
              :class="viewMode === mode.value ? 'bg-zinc-700/70 text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-200'"
              @click="viewMode = mode.value"
            >
              <AppIcon :name="mode.icon" :size="12" />
              {{ mode.label }}
            </button>
          </div>

          <button
            v-if="activeFile"
            class="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/70 text-zinc-400 transition-colors hover:border-red-900/60 hover:bg-red-950/30 hover:text-red-300"
            title="Delete note"
            @click="openDeleteDialog(activeFile)"
          >
            <AppIcon name="trash" :size="14" />
          </button>
        </div>
      </header>

      <div v-if="error" class="flex shrink-0 items-center gap-2 border-b border-red-900/40 bg-red-950/20 px-5 py-2 text-xs text-red-300">
        <AppIcon name="alert" :size="14" class="shrink-0" />
        <span class="flex-1">{{ error }}</span>
        <button class="rounded p-0.5 hover:bg-red-900/30" aria-label="Dismiss error" @click="clearError">
          <AppIcon name="x" :size="13" />
        </button>
      </div>

      <section class="flex min-h-0 flex-1 flex-col">
        <template v-if="activeFile">
          <div
            class="grid min-h-0 flex-1 divide-y divide-zinc-800/80 lg:divide-x lg:divide-y-0"
            :class="viewMode === 'split' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'"
          >
            <NoteEditor v-if="viewMode !== 'preview'" :model-value="content" @update:model-value="setContent" />
            <div v-if="viewMode !== 'edit'" class="min-h-0 overflow-y-auto">
              <MarkdownView :source="content" />
            </div>
          </div>

          <footer class="flex h-8 shrink-0 items-center justify-between border-t border-zinc-800/80 px-4 text-[11px] text-zinc-500">
            <span class="flex items-center gap-2">
              <span class="h-1.5 w-1.5 rounded-full" :class="statusDotClass" />
              {{ statusText }}
            </span>
            <span class="flex items-center gap-3 font-mono text-[10px] text-zinc-600">
              <span>{{ lineCount }} lines</span>
              <span class="hidden sm:inline">Ctrl+S to save</span>
            </span>
          </footer>
        </template>

        <div v-else class="flex min-h-0 flex-1 items-center justify-center p-8">
          <div class="w-full max-w-md rounded-xl border border-zinc-800 bg-[#0a0a0a] p-8 text-center">
            <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400">
              <AppIcon :name="isSupported ? 'file-text' : 'alert'" :size="22" />
            </div>
            <h2 class="text-base font-semibold text-zinc-100">
              {{ !isSupported ? 'Browser not supported' : rootNode ? 'Select a note' : 'Your notes, your files' }}
            </h2>
            <p class="mx-auto mt-2 max-w-xs text-xs leading-relaxed text-zinc-500">
              {{
                !isSupported
                  ? 'The File System Access API needs Chrome or Edge on localhost or https.'
                  : rootNode
                    ? 'Pick a file from the explorer, or create a new note to get started.'
                    : 'Open a folder on your computer. Edit markdown files directly, and every change saves back to disk.'
              }}
            </p>
            <button
              v-if="!rootNode && isSupported"
              class="mt-5 inline-flex h-9 items-center gap-2 rounded-lg bg-zinc-100 px-4 text-xs font-semibold text-zinc-900 hover:bg-white"
              @click="openFolder"
            >
              <AppIcon name="folder-open" :size="15" />
              Open folder
            </button>
          </div>
        </div>
      </section>
    </main>

    <NameDialog
      :open="dialog !== null"
      :title="dialogTitle"
      :description="dialog?.kind === 'folder' ? 'Create a subfolder in your workspace.' : 'A new markdown file, saved straight to disk.'"
      :confirm-label="dialog?.kind === 'folder' ? 'Create folder' : 'Create note'"
      :location="dialogLocation"
      :error="error"
      @confirm="confirmDialog"
      @cancel="closeDialog"
    />

    <ConfirmDialog
      :open="deleteTarget !== null"
      title="Delete note?"
      description="This removes the file from your folder on disk. This can't be undone."
      :detail="deleteDetail"
      confirm-label="Delete"
      @confirm="confirmDelete"
      @cancel="deleteTarget = null"
    />
  </div>
</template>
