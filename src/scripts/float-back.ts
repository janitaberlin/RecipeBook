// Schwebender Zurück-Knopf unten links: erscheint, sobald der normale Zurück-Knopf
// oben aus dem Bild gescrollt ist, und löst denselben Klick aus.
const floating = document.createElement('button');
floating.type = 'button';
floating.className = 'float-back';
floating.hidden = true;
document.body.append(floating);

function inlineBack(): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>('.recipe-back, .back-btn')) {
    if (el.offsetParent !== null) return el; // nur sichtbare Knöpfe
  }
  return null;
}

function update(): void {
  const target = inlineBack();
  const show = !!target && target.getBoundingClientRect().bottom < 0;
  if (target) floating.textContent = target.textContent;
  floating.hidden = !show;
}

floating.addEventListener('click', () => inlineBack()?.click());
addEventListener('scroll', update, { passive: true });
addEventListener('resize', update);
addEventListener('popstate', () => requestAnimationFrame(update));
document.addEventListener('click', () => requestAnimationFrame(update));
update();
