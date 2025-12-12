# ⌨️ Query Editor Shortcuts

TablePlus Clone now supports keyboard shortcuts for faster query execution.

## 🚀 Execution Shortcut

| OS | Shortcut | Action |
|----|----------|--------|
| **macOS** | `Cmd + Enter` | Execute Query |
| **Windows/Linux** | `Ctrl + Enter` | Execute Query |

### Behavior

1. **If text is selected**:
   - Executes ONLY the selected SQL code.
   - Shows a toast: *"Executing selected query..."*

2. **If NO text is selected**:
   - Executes the ENTIRE SQL content in the editor.
   - Shortcut ensures the latest content is used (even if you just typed it).

## 🛠 Troubleshooting

If the shortcut doesn't work:

1. **Check Focus**: ensuring the cursor is blinking inside the editor.
2. **Check Console**: Open Developer Tools (F12) -> Console.
   - When you press `Cmd+Enter`, you should see:
   ```
   [QueryEditor] Shortcut detected: Mod-Enter
   ```
3. **Check Key Conflicts**: Some browser extensions (like Vimium) might intercept this shortcut.

## 🧩 Technical Details

- Uses `Prec.highest` priority to override default CodeMirror behaviors.
- Reads directly from `EditorView` state to avoid stale React closures.
- Supports both "Mod-Enter" (Cmd/Ctrl) automatically.
