import { UNIVERSITIES } from "../lib/recruitment/universities.ts";

const normalize = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const STOPWORDS = new Set(["de", "del", "la", "las", "los", "y", "universidad"]);
const entries = UNIVERSITIES.map(([name, acronym]) => {
  const words = normalize(name).split(/\s+/);
  return { name, acronym, key: normalize(name), acronymKey: normalize(acronym), words };
});

/** Best matches first: acronym, then names whose words start with what was typed, then any substring. */
export function matchUniversities(query: string, limit = 8): { name: string; acronym: string }[] {
  const q = normalize(query);
  if (!q) return [];
  const tokens = q.split(/\s+/).filter(token => !STOPWORDS.has(token));
  const scored = entries.flatMap(entry => {
    let score: number;
    if (entry.acronymKey === q) score = 0;
    else if (entry.acronymKey.startsWith(q)) score = 1;
    else if (tokens.length && tokens.every(token => entry.words.some(word => word.startsWith(token)))) score = 2;
    else if (entry.key.includes(q)) score = 3;
    else return [];
    return [{ entry, score }];
  });
  return scored.sort((a, b) => a.score - b.score || a.entry.name.length - b.entry.name.length)
    .slice(0, limit).map(({ entry }) => ({ name: entry.name, acronym: entry.acronym }));
}

/** Suggestion list under the university input; any other name can still be typed. */
export function attachUniversityCombobox(input: HTMLInputElement, list: HTMLUListElement) {
  let options: { name: string; acronym: string }[] = [];
  let active = -1;
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-controls", list.id);
  input.setAttribute("aria-expanded", "false");
  input.autocomplete = "off";

  const close = () => { list.hidden = true; active = -1; input.setAttribute("aria-expanded", "false"); input.removeAttribute("aria-activedescendant"); };
  const highlight = (index: number) => {
    active = index;
    [...list.children].forEach((item, i) => item.setAttribute("aria-selected", String(i === index)));
    if (index >= 0) { input.setAttribute("aria-activedescendant", `${list.id}-${index}`); list.children[index]?.scrollIntoView({ block: "nearest" }); }
    else input.removeAttribute("aria-activedescendant");
  };
  const choose = (index: number) => {
    input.value = options[index].name;
    close();
    input.dispatchEvent(new Event("input", { bubbles: true }));
  };
  const render = () => {
    options = matchUniversities(input.value);
    if (!options.length || (options.length === 1 && options[0].name === input.value)) { close(); return; }
    list.replaceChildren(...options.map((option, index) => {
      const item = document.createElement("li");
      item.id = `${list.id}-${index}`;
      item.setAttribute("role", "option");
      item.setAttribute("aria-selected", "false");
      const name = document.createElement("span");
      name.textContent = option.name;
      const acronym = document.createElement("small");
      acronym.textContent = option.acronym;
      item.append(name, acronym);
      item.addEventListener("mousedown", event => { event.preventDefault(); choose(index); });
      return item;
    }));
    list.hidden = false;
    input.setAttribute("aria-expanded", "true");
    highlight(0);
  };

  input.addEventListener("input", event => { if (event.isTrusted) render(); });
  input.addEventListener("focus", render);
  input.addEventListener("blur", close);
  input.addEventListener("keydown", event => {
    if (list.hidden) { if (event.key === "ArrowDown") render(); return; }
    if (event.key === "ArrowDown") { event.preventDefault(); highlight((active + 1) % options.length); }
    else if (event.key === "ArrowUp") { event.preventDefault(); highlight((active - 1 + options.length) % options.length); }
    else if (event.key === "Enter" && active >= 0) { event.preventDefault(); choose(active); }
    else if (event.key === "Escape") close();
  });
}
