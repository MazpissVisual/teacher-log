import { useEffect } from 'preact/hooks';
import { setStorageErrorHandler, useDB } from './store';
import type { Page } from './types';
import { go, ModalRoot, pageAtom, searchAtom, Toast, toast } from './ui';
import { openJournal } from './forms';
import { firstChar, todayIn } from './util';
import { CloudCheck, CloudOff, CalendarDays, CheckSquare, House, Library as LibraryIcon, NotebookPen, RefreshCw, Search as SearchIcon, Settings as SettingsIcon, Sprout, TriangleAlert, type LucideIcon } from 'lucide-preact';
import { Icon } from './icons';
import { Dashboard } from './views/Dashboard';
import { Journal } from './views/Journal';
import { Planner } from './views/Planner';
import { Library } from './views/Library';
import { Tasks } from './views/Tasks';
import { Journey } from './views/Journey';
import { Search } from './views/Search';
import { Settings } from './views/Settings';
import { Login } from './views/Login';
import { cloudEnabled } from './supabase';
import { useAuth } from './auth';
import { useSyncStatus } from './sync';

const NAV: { page: Page; icon: LucideIcon; label: string; short?: string }[] = [
  { page: 'dashboard', icon: House, label: 'Beranda' },
  { page: 'journal', icon: NotebookPen, label: 'Jurnal' },
  { page: 'planner', icon: CalendarDays, label: 'Perencana', short: 'Rencana' },
  { page: 'library', icon: LibraryIcon, label: 'Sumber' },
  { page: 'tasks', icon: CheckSquare, label: 'Tugas' },
  { page: 'journey', icon: Sprout, label: 'Perjalanan', short: 'Jejak' },
];
const SETTINGS = { page: 'settings' as Page, icon: SettingsIcon, label: 'Pengaturan', short: 'Atur' };
const VIEWS: Record<Page, () => preact.JSX.Element> = {
  dashboard: Dashboard, journal: Journal, planner: Planner, library: Library,
  tasks: Tasks, journey: Journey, search: Search, settings: Settings,
};
const PAGE_NAMES: Record<Page, string> = { dashboard: 'Beranda', journal: 'Jurnal', planner: 'Perencana', library: 'Sumber', tasks: 'Tugas', journey: 'Perjalanan', search: 'Pencarian', settings: 'Pengaturan' };

function Shell() {
  const db = useDB();
  const page = pageAtom.use();
  const query = searchAtom.use();
  const View = VIEWS[page];
  const sync = useSyncStatus();
  const today = todayIn(db.profile.tz);
  const dateLong = new Date(today + 'T12:00:00Z').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

  useEffect(() => { setStorageErrorHandler(toast); }, []);
  // Keep the document title meaningful per section (screen readers announce it on navigation).
  useEffect(() => { document.title = PAGE_NAMES[page] + ' — GuruLog'; }, [page]);

  const navBtn = (n: (typeof NAV)[number], compact = false) => (
    <button class={'nav ' + (page === n.page ? 'active' : '')} aria-current={page === n.page ? 'page' : undefined} aria-label={compact ? n.short ?? n.label : n.label} onClick={() => go(n.page)}>
      <Icon as={n.icon} size={compact ? 20 : 16} /><span class="nav-text">{compact ? n.short ?? n.label : n.label}</span>
    </button>
  );

  const submitSearch = (e: Event) => { e.preventDefault(); if (query.trim()) go('search'); };
  const searchInput = (
    <form class="searchbar" role="search" onSubmit={submitSearch}>
      <Icon as={SearchIcon} size={16} />
      <input type="search" placeholder="Cari jurnal, rencana, sumber…" aria-label="Cari di aplikasi" value={query} onInput={(e) => searchAtom.set(e.currentTarget.value)} />
    </form>
  );

  return (
    <div class="layout">
      <a class="skip" href="#main">Lompat ke konten</a>
      <header class="masthead">
        <div class="edition-bar">
          <span class="label">Vol. 1 · {dateLong}</span>
          <span class="label hide-sm">Edisi Guru · {db.profile.tz.split('/')[1]?.replace('_', ' ')}</span>
          <span class="edition-right">
            {cloudEnabled && <SyncChip s={sync} />}
            <button class="avatar" aria-label={'Pengaturan profil (' + db.profile.name + ')'} onClick={() => go('settings')}>{firstChar(db.profile.name)}</button>
          </span>
        </div>
        <div class="nameplate">
          <a class="nameplate-title" href="#/dashboard" onClick={() => go('dashboard')}>GuruLog<i>.</i></a>
          <p class="nameplate-sub">Catatan kecil, perjalanan mengajar yang berarti</p>
        </div>
      </header>
      <div class="navrow">
        <div class="navrow-inner">
          <nav class="topnav" aria-label="Navigasi utama">{NAV.map((n) => navBtn(n))}{navBtn(SETTINGS)}</nav>
          {searchInput}
        </div>
      </div>
      <main class="container" id="main" tabIndex={-1}>
        <div class="mobile-search">{searchInput}</div>
        <div class="page" key={page}><View /></div>
        <div class="ornament" aria-hidden="true">✧ ✧ ✧</div>
      </main>
      <footer class="footer inverted">
        <div class="footer-inner">
          <div>
            <span class="label">Pengingat kecil</span>
            <blockquote>“Menjadi guru hebat bukan tentang selalu sempurna, tetapi tentang terus belajar dari setiap pertemuan.”</blockquote>
          </div>
          <div class="footer-cta">
            <span class="label">Edisi hari ini</span>
            <span class="num">{db.journals.length}</span>
            <span class="muted">catatan jurnal tersimpan di edisimu</span>
            <button class="btn sm" onClick={() => { go('journal'); openJournal(); }}>Tulis catatan</button>
          </div>
          <div class="footer-meta"><span>Edisi: Vol 1.0</span><span>Dicetak di perangkatmu</span></div>
        </div>
      </footer>
      <nav class="bottom-nav" aria-label="Navigasi seluler">
        {[...NAV.slice(0, 5), SETTINGS].map((n) => navBtn(n, true))}
      </nav>
      <ModalRoot />
      <Toast />
    </div>
  );
}

function SyncChip({ s }: { s: ReturnType<typeof useSyncStatus> }) {
  const label = s.state === 'syncing' ? 'Menyinkronkan' : s.state === 'offline' ? 'Offline' : s.state === 'error' ? 'Gagal sinkron' : s.pending ? 'Menunggu' : 'Tersimpan';
  const ico = s.state === 'syncing' ? RefreshCw : s.state === 'offline' ? CloudOff : s.state === 'error' ? TriangleAlert : CloudCheck;
  return (
    <span key={s.state} class={'sync-chip ' + s.state} role="status" title={s.error ?? (s.pending ? s.pending + ' perubahan belum terkirim' : 'Semua perubahan tersimpan di akunmu')}>
      <Icon as={ico} size={14} /> <span class="sync-label">{label}</span>
    </span>
  );
}

export function App() {
  const auth = useAuth();
  if (!cloudEnabled) return <Shell />;
  if (!auth.ready) return <main class="auth-wrap"><p class="muted" role="status">Memuat…</p></main>;
  if (!auth.session || auth.recovery) return <Login recovery={auth.recovery} />;
  return <Shell />;
}
