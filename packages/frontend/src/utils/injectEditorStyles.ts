import editorCSS from "@/components/content/editor/editor.css?raw";

const STYLE_ID = "notesplusplus-editor-styles";

export function injectEditorStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = editorCSS;
  document.head.appendChild(style);
}
