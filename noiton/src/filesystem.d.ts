interface FileSystemPermissionDescriptor {
  mode?: 'read' | 'readwrite'
}

interface FileSystemHandle {
  queryPermission(descriptor?: FileSystemPermissionDescriptor): Promise<'granted' | 'prompt' | 'denied'>
  requestPermission(descriptor?: FileSystemPermissionDescriptor): Promise<'granted' | 'prompt' | 'denied'>
}

interface DirectoryPickerOptions {
  id?: string
  mode?: 'read' | 'readwrite'
  startIn?: 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos' | FileSystemDirectoryHandle
}

interface Window {
  showDirectoryPicker(options?: DirectoryPickerOptions): Promise<FileSystemDirectoryHandle>
}

declare function showDirectoryPicker(options?: DirectoryPickerOptions): Promise<FileSystemDirectoryHandle>
