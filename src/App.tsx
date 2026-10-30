import { useEffect } from 'preact/hooks';
import { setStorageErrorHandler, useDB } from './store';
import type { Page } from './types';
import { go, ModalRoot, pageAtom, Skeleton, Toast, toast } from './ui';
import { firstChar, todayIn } from './util';
import { CloudCheck, CloudOff, BookOpen, House, NotebookPen, RefreshCw, School, Settings as SettingsIcon, TriangleAlert, type LucideIcon } from 'lucide-preact';
import { Icon } from './icons';
import { Mark, Wordmark } from './Logo';
import { Dashboard } from './views/Dashboard';
import { Journal } from './views/Journal';
import { Teaching } from './views/Teaching';
import { Library } from './views/Library';
import { Settings } from './views/Settings';
import { Login } from './views/Login';
import { Privacy, Terms } from './views/Legal';
import { cloudEnabled } from './supabase';
import { useAuth } from './auth';
import { useSyncStatus } from './sync';

const NAV: { page: Page; icon: LucideIcon; label: string; short?: string }[] = [
  { page: 'dashboard', icon: House, label: 'Beranda' },
  { page: 'journal', icon: NotebookPen, label: 'Jurnal' },
  { page: 'mengajar', icon: School, label: 'Mengajar' },
  { page: 'bahan', icon: BookOpen, label: 'Bahan' },
];
const SETTINGS = { page: 'settings' as Page, icon: SettingsIcon, label: 'Pengaturan', short: 'Atur' };
const VIEWS: Record<Exclude<Page, 'privacy' | 'terms'>, () => preact.JSX.Element> = {
  dashboard: Dashboard, journal: Journal, mengajar: Teaching, bahan: Library, settings: Settings,
};
const PAGE_NAMES: Record<Page, string> = { dashboard: 'Beranda', journal: 'Jurnal', mengajar: 'Mengajar', bahan: 'Bahan', settings: 'Pengaturan', privacy: 'Kebijakan Privasi', terms: 'Syarat Penggunaan' };

function Shell() {
  const db = useDB();
  const page = pageAtom.use();
  const View = VIEWS[page as keyof typeof VIEWS];
  const sync = useSyncStatus();
  const today = todayIn(db.profile.tz);
  const dateLong = new Date(today + 'T12:00:00Z').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

  useEffect(() => { setStorageErrorHandler(toast); }, []);
  // Keep the document title meaningful per section (screen readers announce it on navigation).
  useEffect(() => { document.title = PAGE_NAMES[page] + ' — TeacherNotes'; }, [page]);

  const items = NAV;
  const isActive = (p: Page) => p === page;

  const navBtn = (n: (typeof NAV)[number], compact = false) => (
    <button class={'nav ' + (isActive(n.page) ? 'active' : '')} aria-current={isActive(n.page) ? 'page' : undefined} aria-label={compact ? n.short ?? n.label : n.label} onClick={() => go(n.page)}>
      <Icon as={n.icon} size={compact ? 20 : 16} /><span class="nav-text">{compact ? n.short ?? n.label : n.label}</span>
    </button>
  );

  return (
    <div class="layout">
      <a class="skip" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>Lompat ke konten</a>
      <header class="topbar">
        <div class="topbar-inner">
          <a class="brand" href="/" aria-label="TeacherNotes, ke Beranda" onClick={(e) => { e.preventDefault(); go('dashboard'); }}><Wordmark /></a>
          <nav class="topnav" aria-label="Navigasi utama">{items.map((n) => navBtn(n))}{navBtn(SETTINGS)}</nav>
          <span class="edition-right">
            <span class="label date">{dateLong}</span>
            {cloudEnabled && <SyncChip s={sync} />}
            <button class="avatar" aria-label={'Pengaturan profil (' + db.profile.name + ')'} onClick={() => go('settings')}>{firstChar(db.profile.name)}</button>
          </span>
        </div>
      </header>
      <main class="container" id="main" tabIndex={-1}>
        <div class="page" key={page}><View /></div>
      </main>
      <footer class="footer">
        <div class="footer-inner">
          <span class="footer-brand"><Mark size={28} /> TeacherNotes</span>
          <span class="footer-legal"><a href="/privacy" onClick={(e) => { e.preventDefault(); go('privacy'); }}>Privasi</a><a href="/terms" onClick={(e) => { e.preventDefault(); go('terms'); }}>Syarat</a></span>
          <span class="footer-credit">Dikembangkan oleh Muhammad Al Adli Adabi, S.Pd.</span>
        </div>
      </footer>
      <nav class="bottom-nav" aria-label="Navigasi seluler">
        {[...items, SETTINGS].map((n) => navBtn(n, true))}
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
  useEffect(() => { if (page === 'privacy' || page === 'terms') document.title = PAGE_NAMES[page] + ' — TeacherNotes'; }, [page]);
  if (page === 'privacy') return <Privacy />;
  if (page === 'terms') return <Terms />;
  if (!cloudEnabled) return <Shell />;
  if (!auth.ready) return <Skeleton />;
  if (!auth.session || auth.recovery) return <Login recovery={auth.recovery} />;
  return <Shell />;
}
