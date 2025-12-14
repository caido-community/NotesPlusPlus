export function currentReplayTabData() {
  const activeTab = document.querySelector(
    '[data-is-selected="true"][data-session-id]',
  );
  if (!activeTab) return { id: "", label: "" };

  const id = activeTab.getAttribute("data-session-id") || "";
  const label = activeTab.querySelector("span")?.textContent || "";

  return { id, label };
}
