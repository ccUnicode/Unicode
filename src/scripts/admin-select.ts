/** Small, single-selection listboxes. DOM focus stays on the combobox while navigating. */
export function setupAdminSelects() {
  const controls = Array.from(document.querySelectorAll<HTMLElement>("[data-admin-select]")).map((wrapper) => {
    const trigger = wrapper.querySelector<HTMLButtonElement>('[role="combobox"]')!;
    const menu = wrapper.querySelector<HTMLElement>('[role="listbox"]')!;
    const valueLabel = wrapper.querySelector<HTMLElement>("[data-admin-value]")!;
    const options = Array.from(menu.querySelectorAll<HTMLButtonElement>('[role="option"]'));
    let activeIndex = 0;
    let search = "";
    let searchTime = 0;
    const isOpen = () => trigger.getAttribute("aria-expanded") === "true";
    const selectedIndex = () => Math.max(0, options.findIndex((option) => option.dataset.value === trigger.dataset.value));

    function highlight(index: number) {
      activeIndex = index;
      options.forEach((option, i) => { option.dataset.highlighted = String(i === index); });
      trigger.setAttribute("aria-activedescendant", options[index].id);
    }
    function close() {
      trigger.setAttribute("aria-expanded", "false");
      trigger.removeAttribute("aria-activedescendant");
      menu.inert = true;
      menu.hidden = true;
      search = "";
    }
    function open(index = selectedIndex()) {
      controls.forEach((control) => control.close());
      menu.hidden = false;
      menu.inert = false;
      trigger.setAttribute("aria-expanded", "true");
      highlight(index);
    }
    function select(index: number) {
      const option = options[index];
      const changed = trigger.dataset.value !== option.dataset.value;
      trigger.dataset.value = option.dataset.value;
      valueLabel.textContent = option.textContent!.trim();
      options.forEach((item, i) => item.setAttribute("aria-selected", String(i === index)));
      close();
      trigger.focus({ preventScroll: true });
      if (changed) trigger.dispatchEvent(new Event("change", { bubbles: true }));
    }

    trigger.addEventListener("click", () => isOpen() ? close() : open());
    trigger.addEventListener("keydown", (event) => {
      if (event.key === "Tab") { close(); return; }
      if (event.key === "Escape") {
        if (isOpen()) { event.preventDefault(); event.stopPropagation(); close(); }
        return;
      }
      if (["ArrowDown", "ArrowUp", "Home", "End", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        if (!isOpen()) {
          open(event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : selectedIndex());
        } else if (event.key === "Enter" || event.key === " ") select(activeIndex);
        else highlight(event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : (activeIndex + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length);
        return;
      }
      if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
        event.preventDefault();
        if (!isOpen()) open();
        const now = Date.now();
        search = now - searchTime < 700 ? search + event.key : event.key;
        searchTime = now;
        const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        const index = options.findIndex((option) => normalize(option.textContent!.trim()).startsWith(normalize(search)));
        if (index >= 0) highlight(index);
      }
    });
    options.forEach((option, index) => {
      option.addEventListener("pointerdown", (event) => event.preventDefault());
      option.addEventListener("pointermove", () => highlight(index));
      option.addEventListener("click", () => select(index));
    });
    wrapper.addEventListener("focusout", (event) => {
      if (!wrapper.contains(event.relatedTarget as Node | null)) close();
    });
    return { wrapper, close };
  });
  document.addEventListener("pointerdown", (event) => {
    controls.forEach((control) => { if (!control.wrapper.contains(event.target as Node)) control.close(); });
  });
  return () => controls.forEach((control) => control.close());
}
