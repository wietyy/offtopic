import { computed, ref } from 'vue'
import type { FileNode, FolderNode, FsNode } from '../lib/types'

const NOTE_EXTENSIONS = ['.md', '.markdown', '.txt']
const IGNORED_NAMES = new Set(['node_modules', 'dist', 'build', '.git', '.obsidian', '.vscode', 'vendor'])
const MAX_DEPTH = 12

function isNote(name: string): boolean {
  return NOTE_EXTENSIONS.some((extension) => name.toLowerCase().endsWith(extension))
}

function joinPath(parent: string, name: string): string {
  return parent ? `${parent}/${name}` : name
}

function parentPathOf(node: FileNode): string {
  const index = node.path.lastIndexOf('/')
  return index === -1 ? '' : node.path.slice(0, index)
}

function sortNodes(nodes: FsNode[]): void {
  nodes.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1
    return a.name.localeCompare(b.name, undefined, { numeric: true })
  })
}

function countNotes(nodes: FsNode[]): number {
  return nodes.reduce((total, node) => total + (node.kind === 'file' ? 1 : countNotes(node.children)), 0)
}

function describeError(error: unknown, fallback: string): string {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') return 'Permission denied. Try opening the folder again.'
    if (error.name === 'NotFoundError') return 'That file no longer exists on disk.'
    if (error.name === 'AbortError') return 'The operation was cancelled.'
  }
  return error instanceof Error ? error.message : fallback
}

async function ensureWritePermission(handle: FileSystemHandle | null): Promise<void> {
  if (!handle?.queryPermission) return
  const options = { mode: 'readwrite' as const }
  if (await handle.queryPermission(options) === 'granted') return
  if (await handle.requestPermission(options) === 'granted') return
  throw new Error('Write permission was not granted for this folder.')
}

async function readDirectory(handle: FileSystemDirectoryHandle, path: string, depth: number): Promise<FsNode[]> {
  if (depth > MAX_DEPTH) return []
  const nodes: FsNode[] = []

  for await (const entry of handle.values()) {
    const name = entry.name
    if (name.startsWith('.') || IGNORED_NAMES.has(name.toLowerCase())) continue

    try {
      if (entry.kind === 'directory') {
        const entryPath = joinPath(path, name)
        const childHandle = entry as FileSystemDirectoryHandle
        nodes.push({
          kind: 'folder',
          name,
          path: entryPath,
          handle: childHandle,
          expanded: depth < 1,
          children: await readDirectory(childHandle, entryPath, depth + 1),
        })
      } else if (isNote(name)) {
        nodes.push({
          kind: 'file',
          name,
          path: joinPath(path, name),
          handle: entry as FileSystemFileHandle,
        })
      }
    } catch (error) {
      console.warn(`Skipping ${name}:`, error)
    }
  }

  sortNodes(nodes)
  return nodes
}

function collectExpanded(node: FolderNode | null, paths: Set<string>): void {
  if (!node) return
  if (node.expanded) paths.add(node.path)
  for (const child of node.children) {
    if (child.kind === 'folder') collectExpanded(child, paths)
  }
}

function applyExpanded(node: FolderNode, paths: Set<string>): void {
  node.expanded = paths.has(node.path)
  for (const child of node.children) {
    if (child.kind === 'folder') applyExpanded(child, paths)
  }
}

function findFolder(node: FolderNode | null, path: string | null): FolderNode | null {
  if (!node || path === null) return null
  if (node.path === path) return node
  for (const child of node.children) {
    if (child.kind !== 'folder') continue
    const found = findFolder(child, path)
    if (found) return found
  }
  return null
}

function findFile(node: FolderNode | null, path: string | null): FileNode | null {
  if (!node || path === null) return null
  for (const child of node.children) {
    if (child.kind === 'file' && child.path === path) return child
    if (child.kind === 'folder') {
      const found = findFile(child, path)
      if (found) return found
    }
  }
  return null
}

function firstFile(nodes: FsNode[]): FileNode | null {
  for (const node of nodes) {
    if (node.kind === 'file') return node
    const found = firstFile(node.children)
    if (found) return found
  }
  return null
}

export function useFileSystem() {
  const rootHandle = ref<FileSystemDirectoryHandle | null>(null)
  const rootNode = ref<FolderNode | null>(null)
  const activeFile = ref<FileNode | null>(null)
  const activeFolder = ref<FolderNode | null>(null)
  const content = ref('')
  const dirty = ref(false)
  const saving = ref(false)
  const loading = ref(false)
  const lastSaved = ref<Date | null>(null)
  const error = ref<string | null>(null)

  const isSupported = typeof window !== 'undefined' && 'showDirectoryPicker' in window
  const tree = computed(() => rootNode.value?.children ?? [])
  const noteCount = computed(() => (rootNode.value ? countNotes(rootNode.value.children) : 0))

  let saveTimer: ReturnType<typeof setTimeout> | null = null
  let revision = 0

  function clearError(): void {
    error.value = null
  }

  function queueSave(): void {
    revision++
    dirty.value = true
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => { void save() }, 600)
  }

  async function save(): Promise<void> {
    if (saveTimer) {
      clearTimeout(saveTimer)
      saveTimer = null
    }
    if (!activeFile.value || !dirty.value) return

    const file = activeFile.value
    const value = content.value
    const savedRevision = revision
    saving.value = true
    error.value = null

    try {
      await ensureWritePermission(rootHandle.value)
      const writable = await file.handle.createWritable()
      await writable.write(value)
      await writable.close()
      if (activeFile.value?.path === file.path && revision === savedRevision) {
        dirty.value = false
        lastSaved.value = new Date()
      } else {
        queueSave()
      }
    } catch (cause) {
      error.value = describeError(cause, 'Could not save the note.')
    } finally {
      saving.value = false
    }
  }

  async function selectFile(node: FileNode): Promise<void> {
    if (activeFile.value?.path === node.path) return
    await save()

    loading.value = true
    error.value = null
    try {
      const file = await node.handle.getFile()
      activeFile.value = node
      content.value = await file.text()
      activeFolder.value = findFolder(rootNode.value, node.path.split('/').slice(0, -1).join('/')) ?? rootNode.value
      dirty.value = false
      lastSaved.value = null
      revision = 0
    } catch (cause) {
      error.value = describeError(cause, 'Could not open that note.')
    } finally {
      loading.value = false
    }
  }

  function selectFolder(node: FolderNode): void {
    activeFolder.value = node
    node.expanded = !node.expanded
  }

  async function createNote(rawName: string, parent?: FolderNode | null): Promise<boolean> {
    let name = rawName.trim().replace(/[\\/]/g, '-')
    if (!name) {
      error.value = 'Give the note a name.'
      return false
    }
    if (!/\.(md|markdown|txt)$/i.test(name)) name += '.md'

    const target = parent ?? activeFolder.value ?? rootNode.value
    if (!target) {
      error.value = 'Open a folder first.'
      return false
    }
    if (target.children.some((child) => child.name.toLowerCase() === name.toLowerCase())) {
      error.value = 'A file with that name already exists here.'
      return false
    }

    error.value = null
    try {
      await ensureWritePermission(rootHandle.value)
      const handle = await target.handle.getFileHandle(name, { create: true })
      const node: FileNode = { kind: 'file', name, path: joinPath(target.path, name), handle }
      target.children.push(node)
      sortNodes(target.children)
      target.expanded = true
      await selectFile(node)
      return true
    } catch (cause) {
      error.value = describeError(cause, 'Could not create the note.')
      return false
    }
  }

  async function createFolder(rawName: string, parent?: FolderNode | null): Promise<boolean> {
    const name = rawName.trim().replace(/[\\/]/g, '-')
    if (!name) {
      error.value = 'Give the folder a name.'
      return false
    }

    const target = parent ?? activeFolder.value ?? rootNode.value
    if (!target) {
      error.value = 'Open a folder first.'
      return false
    }
    if (target.children.some((child) => child.name.toLowerCase() === name.toLowerCase())) {
      error.value = 'A folder with that name already exists here.'
      return false
    }

    error.value = null
    try {
      await ensureWritePermission(rootHandle.value)
      const handle = await target.handle.getDirectoryHandle(name, { create: true })
      const node: FolderNode = {
        kind: 'folder',
        name,
        path: joinPath(target.path, name),
        handle,
        children: [],
        expanded: true,
      }
      target.children.push(node)
      sortNodes(target.children)
      target.expanded = true
      activeFolder.value = node
      return true
    } catch (cause) {
      error.value = describeError(cause, 'Could not create the folder.')
      return false
    }
  }

  async function moveFile(node: FileNode, target: FolderNode | null): Promise<boolean> {
    const destination = target ?? rootNode.value
    if (!destination) {
      error.value = 'Open a folder first.'
      return false
    }

    const source = findFolder(rootNode.value, parentPathOf(node))
    if (!source) {
      error.value = 'Could not find the folder containing that note.'
      return false
    }
    if (source.path === destination.path) return true

    if (findFile(rootNode.value, joinPath(destination.path, node.name))) {
      error.value = 'A file with that name already exists in the destination folder.'
      return false
    }

    loading.value = true
    error.value = null
    try {
      await ensureWritePermission(rootHandle.value)
      await save()
      if (dirty.value) {
        error.value = 'Save the note before moving it.'
        return false
      }

      const text = activeFile.value?.path === node.path
        ? content.value
        : await (await node.handle.getFile()).text()

      const newHandle = await destination.handle.getFileHandle(node.name, { create: true })
      const writable = await newHandle.createWritable()
      await writable.write(text)
      await writable.close()

      try {
        await source.handle.removeEntry(node.name)
      } catch (cause) {
        await destination.handle.removeEntry(node.name).catch(() => {})
        throw cause
      }

      const index = source.children.findIndex((child) => child.path === node.path)
      if (index !== -1) source.children.splice(index, 1)
      const moved: FileNode = { kind: 'file', name: node.name, path: joinPath(destination.path, node.name), handle: newHandle }
      destination.children.push(moved)
      sortNodes(destination.children)
      destination.expanded = true

      if (activeFile.value?.path === node.path) {
        activeFile.value = moved
        activeFolder.value = destination
        lastSaved.value = new Date()
      }
      return true
    } catch (cause) {
      error.value = describeError(cause, 'Could not move the note.')
      return false
    } finally {
      loading.value = false
    }
  }

  async function moveFileByPath(path: string, target: FolderNode | null): Promise<boolean> {
    const node = findFile(rootNode.value, path)
    if (!node) {
      error.value = 'That note is no longer in the workspace.'
      return false
    }
    return moveFile(node, target)
  }

  async function deleteFile(node: FileNode): Promise<boolean> {
    const parent = findFolder(rootNode.value, parentPathOf(node))
    if (!parent) {
      error.value = 'Could not find the folder containing that note.'
      return false
    }

    loading.value = true
    error.value = null
    try {
      await ensureWritePermission(rootHandle.value)
      if (activeFile.value?.path === node.path) {
        if (saveTimer) {
          clearTimeout(saveTimer)
          saveTimer = null
        }
        dirty.value = false
        revision = 0
      }

      await parent.handle.removeEntry(node.name)
      const index = parent.children.findIndex((child) => child.path === node.path)
      if (index !== -1) parent.children.splice(index, 1)

      if (activeFile.value?.path === node.path) {
        activeFile.value = null
        content.value = ''
        lastSaved.value = null
      }
      return true
    } catch (cause) {
      error.value = describeError(cause, 'Could not delete the note.')
      return false
    } finally {
      loading.value = false
    }
  }

  async function openFolder(): Promise<void> {
    if (!isSupported) {
      error.value = 'Folder access needs Chrome or Edge on a secure (https or localhost) page.'
      return
    }

    loading.value = true
    error.value = null
    try {
      await save()
      const handle = await window.showDirectoryPicker({ id: 'noiton-workspace', mode: 'readwrite' })
      const children = await readDirectory(handle, '', 0)
      rootHandle.value = handle
      rootNode.value = {
        kind: 'folder',
        name: handle.name,
        path: '',
        handle,
        children,
        expanded: true,
      }
      activeFile.value = null
      activeFolder.value = rootNode.value
      content.value = ''
      dirty.value = false
      lastSaved.value = null
      revision = 0

      const first = firstFile(children)
      if (first) await selectFile(first)
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === 'AbortError')) {
        error.value = describeError(cause, 'Could not open that folder.')
      }
    } finally {
      loading.value = false
    }
  }

  async function refresh(): Promise<void> {
    if (!rootHandle.value) return
    await save()

    const expanded = new Set<string>()
    collectExpanded(rootNode.value, expanded)
    const activePath = activeFile.value?.path ?? null
    const folderPath = activeFolder.value?.path ?? null

    loading.value = true
    error.value = null
    try {
      await ensureWritePermission(rootHandle.value)
      const children = await readDirectory(rootHandle.value, '', 0)
      const nextRoot: FolderNode = {
        kind: 'folder',
        name: rootHandle.value.name,
        path: '',
        handle: rootHandle.value,
        children,
        expanded: true,
      }
      applyExpanded(nextRoot, expanded)
      rootNode.value = nextRoot
      activeFolder.value = findFolder(nextRoot, folderPath) ?? nextRoot

      if (activePath) {
        const nextFile = findFile(nextRoot, activePath)
        if (nextFile) {
          activeFile.value = null
          await selectFile(nextFile)
        } else {
          activeFile.value = null
          content.value = ''
          dirty.value = false
        }
      }
    } catch (cause) {
      error.value = describeError(cause, 'Could not refresh the folder.')
    } finally {
      loading.value = false
    }
  }

  return {
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
    moveFile,
    moveFileByPath,
    deleteFile,
    openFolder,
    refresh,
  }
}
