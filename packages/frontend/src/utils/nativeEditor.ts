import type { EditorView } from "@codemirror/view";

/**
 * Minimal shape shared by Caido's `HTTPRequestEditor` and
 * `HTTPResponseEditor` — both expose `getEditorView()`, just typed
 * separately in the SDK.
 */
type NativeEditorHandle = {
  getEditorView: () => EditorView;
};

/**
 * Sets content on a Caido native HTTP editor (`sdk.ui.httpRequestEditor()`
 * / `httpResponseEditor()`), retrying across a few animation frames if the
 * underlying CodeMirror view isn't mounted yet.
 *
 * `getEditorView()` isn't guaranteed to return a usable view on the same
 * tick the editor's element is appended to the DOM — in practice this can
 * throw, or return something that doesn't have `.dispatch` yet, until the
 * browser has had a chance to paint. A single `requestAnimationFrame` is
 * usually enough but isn't guaranteed, so this retries a bounded number of
 * times before giving up quietly (the embedded preview just stays empty
 * rather than crashing the note editor).
 */
export function setEditorContentWhenReady(
  editor: NativeEditorHandle,
  content: string,
  attemptsLeft = 5,
): void {
  requestAnimationFrame(() => {
    let view: EditorView | undefined;

    try {
      view = editor.getEditorView();
    } catch {
      view = undefined;
    }

    if (!view?.state?.doc || typeof view.dispatch !== "function") {
      if (attemptsLeft > 0) {
        setEditorContentWhenReady(editor, content, attemptsLeft - 1);
      } else {
        console.error(
          "Couldn't set editor content: editor view never became ready",
        );
      }
      return;
    }

    try {
      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: content,
        },
      });
    } catch (err) {
      console.error("Couldn't set editor content:", err);
    }
  });
}
