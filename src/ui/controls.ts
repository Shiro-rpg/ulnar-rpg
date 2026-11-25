export function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text?: string,
  className?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

export function button(label: string, action?: () => void, className?: string): HTMLButtonElement {
  const node = element('button', label, className);
  node.type = 'button';
  if (action) node.addEventListener('click', action);
  return node;
}

export function field(label: string, control: HTMLElement): HTMLLabelElement {
  const node = element('label', undefined, 'field');
  node.append(element('span', label), control);
  return node;
}

export function input(name: string, value: string | number = '', type = 'text'): HTMLInputElement {
  const node = element('input');
  node.name = name;
  node.type = type;
  node.value = String(value);
  return node;
}

export function select(
  name: string,
  entries: readonly { id: string; name: string }[],
  selected?: string,
  emptyLabel?: string,
): HTMLSelectElement {
  const node = element('select');
  node.name = name;
  if (emptyLabel !== undefined) node.add(new Option(emptyLabel, ''));
  for (const entry of entries) node.add(new Option(entry.name, entry.id));
  if (selected !== undefined) node.value = selected;
  return node;
}

export function formValue(data: FormData, name: string): string {
  const value = data.get(name);
  if (typeof value !== 'string') throw new Error('Un champ du formulaire est manquant.');
  return value;
}

export function numberValue(data: FormData, name: string): number {
  const raw = formValue(data, name).trim();
  if (!raw || !Number.isFinite(Number(raw))) throw new Error('Saisissez une valeur numérique.');
  return Number(raw);
}

export function form(
  submitLabel: string,
  run: (action: () => void | Promise<void>) => void,
  action: (data: FormData) => void | Promise<void>,
): HTMLFormElement {
  const node = element('form');
  const submit = element('button', submitLabel, 'primary');
  submit.type = 'submit';
  node.append(element('div', undefined, 'form-actions'));
  node.lastElementChild?.append(submit);
  node.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(node);
    run(() => action(data));
  });
  return node;
}

export function panel(title: string, content: HTMLElement, description?: string): HTMLElement {
  const section = element('section', undefined, 'panel');
  section.append(element('h2', title));
  if (description) section.append(element('p', description, 'muted'));
  section.append(content);
  return section;
}
