import { useEffect } from 'preact/hooks';
import { setStorageErrorHandler, useDB } from './store';
import type { Page } from './types';
import { go, ModalRoot, pageAtom, Skeleton, Toast, toast } from './ui';
import { openJournal } from './forms';
import { firstChar, todayIn } from './util';
import { CloudCheck, CloudOff, CalendarDays, CheckSquare, House, Library as LibraryIcon, NotebookPen, RefreshCw, Settings as SettingsIcon, Sprout, TriangleAlert, type LucideIcon } from 'lucide-preact';
import { Icon } from './icons';
import { SearchBox } from './SearchBox';
import { Mark, Wordmark } from './Logo';
import { Dashboard } from './views/Dashboard';
import { Journal } from './views/Journal';
import { Planner } from './views/Planner';
import { Library } from './views/Library';
import { Tasks } from './views/Tasks';
import { Journey } from './views/Journey';
import { Search } from './views/Search';
import { Settings } from './views/Settings';
import { Login } from './views/Login';
import { Privacy, Terms } from './views/Legal';
import { cloudEnabled } from './supabase';
import { useAuth } from './auth';
import { useSyncStatus } from './sync';

const NAV: { page: Page; icon: LucideIcon; label: string; short?: string }[] = [
  { page: 'dashboard', icon: House, label: 'Beranda' },
  { page: 'journal', icon: NotebookPen, label: 'Jurnal' },
  { page: 'planner', icon: CalendarDays, label: 'Perencana', short: 'Rencana' },
  { page: 'library', icon: LibraryIcon, label: 'Bahan' },
  { page: 'tasks', icon: CheckSquare, label: 'Tugas' },
  { page: 'journey', icon: Sprout, label: 'Perjalanan', short: 'Jejak' },
];
const SETTINGS = { page: 'settings' as Page, icon: SettingsIcon, label: 'Pengaturan', short: 'Atur' };
const VIEWS: Record<Exclude<Page, 'privacy' | 'terms'>, () => preact.JSX.Element> = {
  dashboard: Dashboard, journal: Journal, planner: Planner, library: Library,
  tasks: Tasks, journey: Journey, search: Search, settings: Settings,
};
const PAGE_NAMES: Record<Page, string> = { dashboard: 'Beranda', journal: 'Jurnal', planner: 'Perencana', library: 'Bahan', tasks: 'Tugas', journey: 'Perjalanan', search: 'Pencarian', settings: 'Pengaturan', privacy: 'Kebijakan Privasi', terms: 'Syarat Penggunaan' };

function Shell() {
  const db = useDB();
  const page = pageAtom.use();
    const View = VIEWS[page as keyof typeof VIEWS];
  const sync = useSyncStatus();
  const today = todayIn(db.profile.tz);
  const dateLong = new Date(today + 'T12:00:00Z').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

  useEffect(() => { setStorageErrorHandler(toast); }, []);
  // Keep the document title meaningful per section (screen readers announce it on navigation).
  useEffect(() => { document.title = PAGE_NAMES[page] + ' — NgampusNotes'; }, [page]);

  const navBtn = (n: (typeof NAV)[number], compact = false) => (
    <button class={'nav ' + (page === n.page ? 'active' : '')} aria-current={page === n.page ? 'page' : undefined} aria-label={compact ? n.short ?? n.label : n.label} onClick={() => go(n.page)}>
      <Icon as={n.icon} size={compact ? 20 : 16} /><span class="nav-text">{compact ? n.short ?? n.label : n.label}</span>
    </button>
  );

  const searchInput = <SearchBox />;

  return (
    <div class="layout">
      <a class="skip" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>Lompat ke konten</a>
      <header class="masthead">
        <div class="edition-bar">
          <span class="label">{dateLong}</span>
          <span class="edition-right">
            {cloudEnabled && <SyncChip s={sync} />}
            <button class="avatar" aria-label={'Pengaturan profil (' + db.profile.name + ')'} onClick={() => go('settings')}>{firstChar(db.profile.name)}</button>
          </span>
        </div>
        <div class="nameplate">
          <a class="nameplate-title" href="/" onClick={(e) => { e.preventDefault(); go('dashboard'); }}><Wordmark /></a>
          <p class="nameplate-sub">Catatan kecil, perjalanan kuliah yang berarti</p>
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
            <blockquote>“Kamu tidak harus langsung paham semuanya, cukup terus belajar sedikit demi sedikit dari setiap kuliah.”</blockquote>
          </div>
          <div class="footer-cta">
            <span class="label">Edisi hari ini</span>
            <span class="num">{db.journals.length}</span>
            <span class="muted">catatan kuliah tersimpan di edisimu</span>
            <button class="btn sm" onClick={() => { go('journal'); openJournal(); }}>Tulis catatan</button>
          </div>
          <div class="footer-meta"><span class="footer-brand"><Mark size={28} /> Edisi: Vol 1.0</span>
            <span class="footer-legal"><a href="/privacy" onClick={(e) => { e.preventDefault(); go('privacy'); }}>Privasi</a><a href="/terms" onClick={(e) => { e.preventDefault(); go('terms'); }}>Syarat</a></span><span>Dikembangkan oleh<br />Havidz Muhammad Iqbal, S.Kom.</span></div>
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
  const page = pageAtom.use();
  useEffect(() => { if (page === 'privacy' || page === 'terms') document.title = PAGE_NAMES[page] + ' — NgampusNotes'; }, [page]);
  if (page === 'privacy') return <Privacy />;
  if (page === 'terms') return <Terms />;
  if (!cloudEnabled) return <Shell />;
  if (!auth.ready) return <Skeleton />;
  if (!auth.session || auth.recovery) return <Login recovery={auth.recovery} />;
  return <Shell />;
}
