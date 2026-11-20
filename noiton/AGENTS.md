# wietyy's amazing AGENTS.md template

## Quoth Cave Johnson, "what the hell am i supposed to do with this"?
- This is the AGENTS.md file.
- Every time you do something in the project, look through here under "Agent Notes" and check the bullets.
- Update the bullets to help a future agent out.
- That's literally it.

## Agent Notes (place bullets here)
- `bun run build` (`vue-tsc -b && vite build`) is the only automated check — no test/lint scripts. Run it before saying done. No browser tests either: manually check folder open, autosave, drag-move and delete in Chromium.
- Tailwind v4 comes through `@tailwindcss/vite`; CSS lives in `src/style.css` with `@import 'tailwindcss'`. There is no `tailwind.config.*` — don't add one.
- `tsconfig.app.json` sets `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`: unused locals fail the build; no enums or parameter properties.
- All disk state lives in `src/composables/useFileSystem.ts`; `src/App.vue` owns UI state and the single `useFileSystem()` instance. Don't add a second store.
- Tree nodes hold live `FileSystemHandle`s in reactive objects. `refresh()` rebuilds the tree and re-resolves `activeFile`/`activeFolder` by path — never cache node identity across a refresh.
- Paths are `/`-joined; root folder path is `''`. `activeFolder` is both the new-note target and the clicked folder.
- Only `.md`, `.markdown`, `.txt` are ingested; dotfiles and `node_modules`/`dist`/`build`/`.git`/`.obsidian`/`.vscode`/`vendor` are skipped; recursion capped at depth 12.
- File System Access API needs Chromium + user gesture + localhost/HTTPS. `showDirectoryPicker` and handle permission methods are declared in `src/filesystem.d.ts` — update it if you use more of the API.
- Markdown is hand-rolled in `src/lib/markdown.ts`; don't add a library. Escape at emit time in `inline()`, never the whole source upfront (pre-escaping breaks `>` blockquotes). Keep `safeUrl()` filter because output goes through `v-html`.
- Autosave is a 600ms debounce with a `revision` counter. Await `save()` before switching, moving or refreshing notes; deleting the active note cancels the pending timer instead. `Ctrl/Cmd+S` is global in `App.vue` — don't duplicate it in `NoteEditor.vue`.
- Moves are copy-then-delete with rollback in `moveFile()`; reject same-folder drops and name conflicts before touching disk.
- Drag payload uses `NOTE_DRAG_MIME` from `src/lib/dragDrop.ts`, checked by both `FolderTree.vue` and `App.vue`'s root drop zone — keep the constant shared.
- Editor gutter and textarea must keep matching `py-5`/`leading-6` or line numbers drift.
- UI: pure black background, zinc greys, rounded borders, no colorful accents. New UI pieces go in `src/components/`.