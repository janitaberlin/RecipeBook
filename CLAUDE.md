# Janitas RecipeBook

Statische Rezept-Website (Astro 5, GitHub Pages). Live: https://janitaberlin.github.io/RecipeBook/
Sprache mit dem Nutzer: Deutsch. Jeder Push auf `main` geht sofort live – Commits und Pushes macht Claude selbstständig, aber erst wenn `npm test` und `npm run build` lokal grün sind.

**Git-Workflow (gilt überall, auch in Cloud-/Handy-Sitzungen):** Immer direkt auf `main` committen und pushen – keine eigenen Branches, keine Pull Requests. Startet die Sitzung auf einem anderen Branch (z. B. `claude/…`), die Änderungen nach `main` übernehmen (`git checkout main && git pull`, dann committen bzw. den Branch fast-forward mergen) und `main` pushen. Schlägt der Push auf `main` fehl (z. B. fehlende Berechtigung), dem Nutzer das sofort sagen statt still einen PR anzulegen.

**Fotos und Dateien:** Fotos und Screenshots kommen als Anhang im Chat; zum Verarbeiten zuerst in eine temporäre Datei außerhalb des Repos speichern und dann `npm run image` darauf anwenden. Vor `npm test` ggf. `npm ci` ausführen.

## Befehle

- `npm run dev` – lokale Vorschau unter http://localhost:4321/RecipeBook/
- `npm test` – Unit-Tests (Vitest)
- `npm run build` – baut die Seite; prüft dabei Schema, Mengenmarkierungen und Tags
- `npm run image -- <eingabe> <ausgabe.jpg>` – Foto (JPG/PNG/WebP/HEIC) auf max. 2000 px verkleinern und als JPG speichern

## Rezept einlesen

Eingaben können sein: URL, PDF, Screenshot/Foto eines Rezepts, kopierter Text, dazu einzelne Fotos.

1. Rezept vollständig erfassen (URL abrufen, PDF/Bild lesen). Ein Screenshot des Rezepttexts ist **nie** das Cover.
2. Vorhandene Tags ansehen: `grep -h "^tags:" src/content/recipes/*/index.md | sort -u`. Bestehende Tags bevorzugen; neue Tags nur bewusst und dem Nutzer nennen.
3. Ordner `src/content/recipes/<slug>/` anlegen. Slug = Titel in Kleinbuchstaben, `ä→ae ö→oe ü→ue ß→ss`, alles andere außer a–z/0–9 → `-`, keine doppelten/führenden/abschließenden `-`.
4. Fotos: Alle mitgeschickten Fotos verwenden. Das ansehnlichste Foto des fertigen Gerichts wird das Cover, die übrigen kommen als Schrittbilder unter die passenden Schritte. Bei Screenshots nur den Bildausschnitt ohne App-Oberfläche oder Text verwenden. Danach die verarbeiteten Upload-Dateien aus `/mnt/project-files/uploads/hearth/` löschen. `npm run image -- "<foto>" src/content/recipes/<slug>/cover.jpg`; Schrittbilder als `schritt-<N>.jpg` (bei mehreren `schritt-<N>-2.jpg`). Ohne Angabe des Nutzers ist das erste Foto das Cover.
5. `index.md` nach Format und Stilrichtlinie unten schreiben. `added` = heutiges Datum.
6. Nährwerte pro Portion (bzw. pro Stück) schätzen und als `nutrition` eintragen: aus den Zutatenmengen kcal, Eiweiß, Kohlenhydrate, Fett (ganze Zahlen, Gramm) überschlagen; Beilagen, die im Rezept stehen, zählen mit, optionale Toppings nicht. Fehlende Dauer schätzen und dem Nutzer sagen. Zeigt die Quelle nur ein fertiges Gericht ohne Mengen, sinnvolle Mengen vorschlagen und in `Tipps` nur „Mengen geschätzt.“ vermerken. Inhaltliche Unklarheiten (fehlende Zutaten, widersprüchliche Mengen, fehlende Portionszahl) nachfragen, nicht raten.
7. **Plausi-Check** (bei jedem neuen oder geänderten Rezept): Mengen pro Portion realistisch? Fehlen Mengen, die man zum Kochen braucht (z. B. Wasser für Reis, Nudelmenge)? Wird jede Zutat verwendet und jede verwendete Zutat aufgeführt? Garzeiten, Temperaturen und Reihenfolge stimmig? Passen Tags, Dauer und Nährwerte (auch nach Mengenänderungen neu schätzen)? Reine Stilfehler direkt korrigieren; inhaltliche Verbesserungsvorschläge dem Nutzer kurz auflisten und erst nach seinem OK umsetzen.
8. `npm test && npm run build`, dann committen und pushen. Dem Nutzer den Link `https://janitaberlin.github.io/RecipeBook/rezepte/<slug>/` nennen (ca. 2 Min. bis live).

**Zwei Rezeptbücher:** Startseite zeigt nur Janitas Rezepte; Umschalter „Mircos Rezepte“ zeigt seine (`book: mirco`); die Suche durchsucht beide. Neue Rezepte von Janita bekommen kein `book`-Feld. Janitas Kategorien (Tags): Healthy, Lunch, Dinner, Dessert, Comfort Food, Fleisch (mit Fleisch, ohne Fisch), Fisch (Fisch und Meeresfrüchte), Vegetarisch, Protein Power (ab 30 g Eiweiß pro Portion, nur Essen – Shakes nie, die stehen nur unter Shakes; Janita 18.10.2026), Grillen (alles vom Grill), Platten (nur echte Platten zum Teilen, z. B. Antipasti-Platte; Janitas Entscheidung 17.10.2026), Shakes (alle Shakes, Smoothies und Drinks; sie bekommen nur den Tag Shakes, keine weitere Kategorie – Ausnahme: Apfelessig-Minz-Spritz bleibt auch bei Healthy; Janita 18.10.2026), Healthy Eis (gesunde, einfache, schnelle Eis-Riegel und Bites aus dem Gefrierfach; Janita hat Riegel-Silikonformen; nur dieser Tag; Janita 22.10.2026), Suppen (alle Suppen und Brühen, zusätzlich zu den übrigen Kategorien; Janita 28.10.2026) (fest in `src/pages/index.astro`); Fischgerichte bekommen Fisch, nie Fleisch oder Vegetarisch; Mircos Tags nicht für ihre Rezepte verwenden.

Gekocht melden („Hab X gekocht, 4 Sterne“): `rating` setzen, bauen, pushen. Ein Rezept gilt als gekocht, sobald es Sterne oder einen `cooked`-Eintrag hat (Filter „Noch nicht gekocht“). Ohne Sternangabe nachfragen.

Löschen und Teilen in der App: Karte in der Übersicht lange drücken (Computer: Rechtsklick) öffnet ein Menü. Löschen macht über die GitHub-API einen Commit „Rezept gelöscht: …“ auf `main` (Schlüssel = Fine-grained Token, liegt nur in Janitas Browser). Deshalb vor jeder Arbeit `git pull`. Gelöschte Rezepte lassen sich aus der Git-Historie wiederherstellen.

Herz auf der Rezeptseite: setzt/entfernt das Stichwort `Lieblingsessen` per Commit „Lieblingsessen: …“ / „Kein Lieblingsessen mehr: …“ auf `main` (gleicher Schlüssel). Claude setzt oder entfernt `Lieblingsessen` nie selbst. Button „Heute gekocht“: trägt das heutige Datum in `cooked` ein (Commit „Gekocht: …“, pro Tag nur einmal, mit „Rückgängig“); Anzeige „Schon N× gekocht“, Sortierung „Am häufigsten gekocht“.

**Bilder:** Janita will kein Rezept ohne Bild. Echte Fotos haben immer Vorrang. Solange keins da ist, bekommt das Rezept ein gezeichnetes Cover (`npm run illustration`, siehe `scripts/illustration.mjs`, Janitas Entscheidung 17.10.2026); sobald sie ein Foto schickt, ersetzt es das gezeichnete Cover. Fotos mit Personen sind erlaubt (Janita 17.10.2026).

**Geschmack:** Mixer: Janita hat einen Kenwood Smoothie-to-go-Aufsatz und einen Glasmixaufsatz (Kenwood Cooking Chef); bei Shakes in `Equipment` „Kenwood Smoothie-to-go-Aufsatz oder Glasmixaufsatz“ statt „Standmixer“. Janita will wenige Zutaten und schnelle Rezepte; sie kocht gern mit Kokosöl, Olivenöl, Salz, Pfeffer, Zitrone und gekörntem Frischkäse (bei geschätzten Rezepten bevorzugen). Janita mag keinen Dill – in ihren Rezepten nie Dill verwenden (weglassen oder durch ein anderes Kraut ersetzen). Janita backt und süßt ohne Zucker: Agavendicksaft bevorzugt, Kokosblütenzucker nur wo trockener Zucker nötig ist; auch Güsse ohne Puderzucker (z. B. Skyr mit Agavendicksaft). Honig ist in Ordnung. Chia-Pudding immer mit Kokosmilch (andere Milch mag sie nicht). Kuchen und Gebäck ohne Butter: Kokosöl statt Butter, Böden und Streusel z. B. aus Haferflocken und Mandeln statt Butterkeksen. Janita hasst Ziegenkäse und Schafskäse – nie verwenden; bei Vorlagen damit durch Mozzarella, Burrata oder gekörnten Frischkäse ersetzen und den Ersatz nicht kommentieren. Wenn Janita „Feta“ sagt, meint sie Hirtenkäse aus Kuhmilch – den darf man verwenden.

Bild nachreichen („Hier ist das Bild für …“): `npm run image` in den Rezeptordner, `cover: ./cover.jpg` in der Frontmatter ergänzen bzw. Bild unter den Schritt setzen, bauen, pushen.

## Format

```markdown
---
title: Mediterrane Hähnchen-Orzo
cover: ./cover.jpg            # optional
tags: [Hähnchen, Hauptspeise, OnePot]
keywords: [Weihnachten]       # optional; Stichwörter für die Suche (z. B. Zyklus, Party), erscheinen als Schnellsuche auf der Startseite und als Untertitel unter dem Rezepttitel (Rezeptseite und Karte); „Lieblingsessen“ setzt nur Janita per Herz, nie Claude
zyklus: { phase: Lutealphase, grund: "Magnesium gegen PMS" }  # bei Stichwort Zyklus immer; Phase Periode|Follikelphase|Eisprung|Lutealphase und kurzer Grund, steht oben unter dem Titel
duration: 60                  # Minuten, optional aber immer setzen
rating: 4                     # 1–5, optional (nur der Nutzer vergibt Sterne; Rezept mit Sternen = schon gekocht)
cooked: [2026-10-17]          # optional; Koch-Tage, setzt nur der Button „Heute gekocht“ (nie Claude)
servings: 4
servingsLabel: Stück          # optional, Standard „Personen“
book: mirco                   # nur bei Mircos Rezepten (aus esstobst/RecipeBook); Standard „janita“
nutrition: { kcal: 650, protein: 40, carbs: 70, fat: 22 }  # Pflicht; pro Portion bzw. Stück, von Claude geschätzt
health: ["Immunsystem: viel Vitamin C aus Paprika", "Darm: Ballaststoffe aus Kichererbsen"]  # bei Janitas Rezepten immer; 2–3 Einträge „Bereich: Grund“
micros: [{ name: Eisen, amount: 4.5 }, { name: Vitamin C, amount: 60 }, { name: Magnesium, amount: 90 }]  # bei Janitas Rezepten immer; Top 3 pro Portion, Namen/Einheiten in src/lib/micros.ts
source: TikTok                # optional; URLs vollständig
added: 2026-10-08
---

## Zutaten
### Gruppe (optional)
- {{500 g}} Orzo (Kritharaki)

## Equipment
- Auflaufform (ca. 20 × 30 cm)

## Zubereitung
1. **Kurzer Titel:** Text …
   ![Beschreibung](./schritt-1.jpg)

## Tipps
- …
```

Nur `Zutaten` und `Zubereitung` sind Pflicht; erlaubte Abschnitte sind ausschließlich diese vier, in dieser Reihenfolge.

## Stilrichtlinie

**Titel:** deutsche Groß-/Kleinschreibung („Erdnusseintopf mit Borlottibohnen“), englische Eigennamen in Title Case („Rockos White Cream Stew“). Keine Abkürzungen, keine Mengen im Titel.

**Mengen-Markierung:** Alles, was mit der Portionszahl skaliert, steht in `{{…}}` – in Zutaten und Zubereitung. Nie markieren: Zeiten, Temperaturen, Maße (cm). Zusätze stehen außerhalb: `ca. {{200 g}}`. Erlaubt im Inneren: Zahl, Bruch, gemischter Bruch, Bereich, jeweils mit Leerzeichen vor der Einheit: `{{500 g}}`, `{{1,5 l}}`, `{{1/2 TL}}`, `{{4 1/8 Tassen}}`, `{{2–3 EL}}`, `{{2}}`. Bereiche mit gemeinsamer Einheit: `{{800–1000 ml}}`.

**Zutaten:**
- Format `{{Menge Einheit}} Zutat, Verarbeitung (Hinweis)` – z. B. `{{2}} Zwiebeln, fein gewürfelt`.
- Einheiten: `g`, `kg`, `ml`, `l`, `EL`, `TL`, `Prise`, `Dose`, `Bund`, `Packung`, `Päckchen`, `Zweig`, `Stück` (nur wo nötig), `Tassen` nur wenn die Quelle so misst. Immer Leerzeichen vor der Einheit, Einheiten nie in Großbuchstaben.
- Brüche als `1/2`, Dezimalzahlen mit Komma.
- Reihenfolge der Verwendung; Grundzutaten ohne Menge (Öl, Salz, Pfeffer, Zucker, Gewürze) gesammelt am Ende, z. B. `- Öl, Salz, Pfeffer`.
- Jede Zutat aus der Zubereitung steht in der Liste und umgekehrt. Geräte gehören in `Equipment`.

**Zubereitung:**
- Jeder Schritt beginnt mit `**Kurzer Titel:**`. Ein Schritt = ein Arbeitsabschnitt, 1–4 Sätze.
- Vorbereitung (Ofen vorheizen, Fleisch temperieren) ist ein normaler erster Schritt.
- Zeiten „ca. 5 Min.“, „1 Std.“; Temperaturen „200 °C“; „mittlere Hitze“.
- Warnungen kursiv in Klammern: *(Keinen Mixer verwenden, sonst wird die Masse klebrig!)*. Sonst kein Fettdruck im Fließtext.
- Mengen im Schritt wiederholen und markieren, wenn nur ein Teil der Zutat gemeint ist oder sie zur Orientierung wichtig sind; mitwachsende Stückzahlen ebenfalls („in {{12}} Portionen teilen“).
- Neutraler Infinitiv („Zwiebeln würfeln.“), kein „du“. Letzter Schritt ist Servieren/Anrichten.

**Metadaten:** `source` kurz ohne Zusätze wie „(Screenshot)“. Inhalt immer auf Deutsch.

## Code-Überblick

- `src/content.config.ts` – Schema; `src/lib/scale.ts` – Mengen parsen/runden; `src/lib/remark-quantities.ts`, `src/lib/rehype-sections.ts` – Markdown-Plugins
- `src/pages/index.astro` + `src/scripts/overview.ts` – Übersicht; `src/scripts/card-menu.ts` + `src/lib/github.ts` – Teilen/Löschen per langem Drücken; `src/scripts/recipe-actions.ts` + `src/lib/keywords.ts`/`cooked.ts` – Herz und „Heute gekocht“; `src/pages/rezepte/[slug].astro` + `src/scripts/recipe-page.ts` – Rezeptseite
