export interface FileNode {
  kind: 'file'
  name: string
  path: string
  handle: FileSystemFileHandle
}

export interface FolderNode {
  kind: 'folder'
  name: string
  path: string
  handle: FileSystemDirectoryHandle
  children: FsNode[]
  expanded: boolean
}

export type FsNode = FileNode | FolderNode

export type ViewMode = 'edit' | 'split' | 'preview'

export type IconName =
  | 'file-text'
  | 'file-plus'
  | 'folder'
  | 'folder-open'
  | 'folder-plus'
  | 'chevron-right'
  | 'chevron-down'
  | 'plus'
  | 'refresh'
  | 'eye'
  | 'pencil'
  | 'columns'
  | 'check'
  | 'x'
  | 'spinner'
  | 'alert'
  | 'trash'
