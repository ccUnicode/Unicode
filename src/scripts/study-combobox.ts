import { UNIVERSITIES } from "../lib/recruitment/universities.ts";
import { ALL_CAREERS, CAREERS_WITHOUT_FACULTY, FACULTIES } from "../lib/recruitment/study-options.ts";

export type Suggestion = { name: string; hint?: string };

const normalize = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const STOPWORDS = new Set(["de", "del", "la", "las", "los", "y", "e", "universidad", "facultad", "instituto"]);

/** Best matches first: exact hint (acronym), hint prefix, names whose words start with what was typed, then any substring. */
export function matchSuggestions(query: string, items: readonly Suggestion[], limit = 8): Suggestion[] {
  const q = normalize(query);
  if (!q) return [];
  const tokens = q.split(/\s+/).filter(token => !STOPWORDS.has(token));
  return items.flatMap(item => {
    const key = normalize(item.name); const hint = normalize(item.hint ?? ""); const words = key.split(/\s+/);
    let score: number;
    if (hint && hint === q) score = 0;
    else if (hint && hint.startsWith(q)) score = 1;
    else if (tokens.length && tokens.every(token => words.some(word => word.startsWith(token)))) score = 2;
    else if (key.includes(q)) score = 3;
    else return [];
    return [{ item, score }];
  }).sort((a, b) => a.score - b.score || a.item.name.length - b.item.name.length).slice(0, limit).map(({ item }) => item);
}

const PLACES: Suggestion[] = UNIVERSITIES.map(([name, acronym]) => ({ name, hint: acronym }));
export const matchUniversities = (query: string, limit = 8) => matchSuggestions(query, PLACES, limit);

/** Acronym of a listed place of study, whether the applicant picked the full name or typed the acronym. */
function placeKey(value: string): string | null {
  const q = normalize(value);
  return q ? UNIVERSITIES.find(([name, acronym]) => normalize(name) === q || normalize(acronym) === q)?.[1] ?? null : null;
}

/** Faculties of the chosen place of study, if we know them. */
export function facultySuggestions(place: string): Suggestion[] {
  return (FACULTIES[placeKey(place) ?? ""] ?? []).map(([name, acronym]) => ({ name, hint: acronym || undefined }));
}

/** Careers of the chosen faculty, else of the place of study, else every known career. */
/** True when the place of study is one whose faculties or careers we know. */
export const knownPlace = (place: string) => { const key = placeKey(place); return !!key && (key in FACULTIES || key in CAREERS_WITHOUT_FACULTY); };

export function careerSuggestions(place: string, faculty: string): Suggestion[] {
  const key = placeKey(place) ?? "";
  const faculties = FACULTIES[key] ?? [];
  const f = normalize(faculty);
  const chosen = f ? faculties.find(([name, acronym]) => normalize(name) === f || (acronym && normalize(acronym) === f)) : undefined;
  const careers = chosen ? chosen[2] : faculties.length ? [...new Set(faculties.flatMap(([, , list]) => list))] : CAREERS_WITHOUT_FACULTY[key] ?? ALL_CAREERS;
  return careers.map(name => ({ name }));
}

/**
 * Suggestion list under a text input. Suggestions only help: the applicant can always keep what they typed.
 * With `showAllOnFocus`, a short list (e.g. the faculties of the chosen university) opens before typing.
 */
export function attachCombobox(input: HTMLInputElement, list: HTMLUListElement, source: () => Suggestion[], showAllOnFocus: () => boolean = () => false) {
  let options: Suggestion[] = [];
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
    const items = source();
    options = !input.value.trim() && showAllOnFocus() ? items.slice(0, 30) : matchSuggestions(input.value, items, 8);
    if (!options.length || options.some(option => option.name === input.value)) { close(); return; }
    list.replaceChildren(...options.map((option, index) => {
      const item = document.createElement("li");
      item.id = `${list.id}-${index}`;
      item.setAttribute("role", "option");
      item.setAttribute("aria-selected", "false");
      const name = document.createElement("span");
      name.textContent = option.name;
      item.append(name);
      if (option.hint) { const hint = document.createElement("small"); hint.textContent = option.hint; item.append(hint); }
      item.addEventListener("mousedown", event => { event.preventDefault(); choose(index); });
      return item;
    }));
    list.hidden = false;
    input.setAttribute("aria-expanded", "true");
    highlight(input.value.trim() ? 0 : -1);
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
