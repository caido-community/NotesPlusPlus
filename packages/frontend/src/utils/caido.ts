export function currentReplayTabData() {
  const activeTab = document.querySelector(
    '.c-tab-list__tab [data-is-selected="true"]',
  );
  if (!activeTab) return { id: "", label: "" };

  const id = activeTab.getAttribute("data-session-id") || "";
  const span = activeTab.querySelector("span")?.querySelector("span");
  const label = span?.textContent || "";

  return { id, label };
}
