// Lädt die Seite am Zwischenspeicher vorbei neu, damit neue Rezepte sofort erscheinen.
const button = document.querySelector<HTMLButtonElement>('.refresh-btn');

button?.addEventListener('click', () => {
  button.classList.add('is-loading');
  const target = new URL(location.href);
  target.searchParams.set('neu', String(Date.now()));
  location.replace(target.href);
});
