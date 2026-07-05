/**
 * The deliverables. Unlike SCORE MORE's 450-item database catalogue, this
 * product is two static PDFs, so the catalogue is defined right here.
 * Files live under config.media.contentRoot (outside httpdocs).
 */

const CATALOG = [
  {
    id: 1,
    title: 'Football Forms for the Winning Coach — Complete Digital Edition',
    desc: '134 ready-to-use football coaching forms across 20 chapters — practice, game-day and program management, with completed examples of most forms. 304 pages, printable PDF.',
    type: 'pdf',
    kind: 'pdf',
    fileName: 'FootballForms.pdf',
    pages: 304,
    primary: true,
  },
  {
    id: 2,
    title: 'Bonus: The Complete Football Guide',
    desc: 'Companion guide included free with your purchase. 37 pages, printable PDF.',
    type: 'pdf',
    kind: 'pdf',
    fileName: 'complete-football-guide.pdf',
    pages: 37,
    primary: false,
  },
];

const byId = new Map(CATALOG.map((it) => [it.id, it]));

/** Full catalogue (client-safe fields). */
export async function getCatalog() {
  return CATALOG.map(({ id, title, desc, type, kind, fileName, pages, primary }) => ({
    id, title, desc, type, kind, fileName, pages, primary,
  }));
}

export async function getSummary() {
  return {
    total: CATALOG.length,
    byKind: { pdf: CATALOG.length },
    folders: [],
  };
}

/** A single item including its filename, for media serving (server-side only). */
export async function getMaterialFile(id) {
  const item = byId.get(Number(id));
  return item ? { id: item.id, filename: item.fileName, title: item.title } : null;
}
