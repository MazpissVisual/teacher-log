import { useEffect } from 'preact/hooks';
import { setStorageErrorHandler, useDB } from './store';
import type { Page } from './types';
import { go, ModalRoot, pageAtom, searchAtom, Toast, toast } from './ui';
import { openJournal } from './forms';
import { firstChar, todayIn } from './util';
import { Dashboard } from './views/Dashboard';
import { Journal } from './views/Journal';
import { Planner } from './views/Planner';
import { Library } from './views/Library';
import { Tasks } from './views/Tasks';
import { Journey } from './views/Journey';
import { Search } from './views/Search';
import { Settings } from './views/Settings';

const NAV: { page: Page; icon: string; label: string }[] = [
  { page: 'dashboard', icon: '🏠', label: 'Beranda' },
  { page: 'journal', icon: '📝', label: 'Jurnal' },
  { page: 'planner', icon: '📅', label: 'Perencana' },
  { page: 'library', icon: '📚', label: 'Sumber' },
  { page: 'tasks', icon: '☑', label: 'Tugas' },
  { page: 'journey', icon: '🌱', label: 'Perjalanan' },
];
const VIEWS: Record<Page, () => preact.JSX.Element> = {
  dashboard: Dashboard, journal: Journal, planner: Planner, library: Library,
  tasks: Tasks, journey: Journey, search: Search, settings: Settings,
};

export function App() {
  const db = useDB();
  const page = pageAtom.use();
  const query = searchAtom.use();
  const View = VIEWS[page];

  useEffect(() => { setStorageErrorHandler(toast); }, []);

  const navBtn = (n: { page: Page; icon: string; label: string }) => (
    <button class={`nav ${page === n.page ? 'active' : ''}`} aria-current={page === n.page ? 'page' : undefined} aria-label={n.label} onClick={() => go(n.page)}>
      <span class="ico" aria-hidden="true">{n.icon}</span><span class="nav-text">{n.label}</span>
    </button>
  );

  return (
    <div class="layout">
      <aside class="sidebar">
        <div class="logo"><span class="logo-mark" aria-hidden="true">✦</span><span>GuruLog<span style="color:#776fe1">.</span></span></div>
        <nav aria-label="Navigasi utama">
          <div class="menu-label">RUANG KERJA</div>
          {NAV.map(navBtn)}
          <div class="menu-label">PRIBADI</div>
          {navBtn({ page: 'settings', icon: '⚙', label: 'Pengaturan' })}
        </nav>
        <div class="side-footer">
          <b>🌱 Kemajuan kecil itu berarti</b>
          <p>Setiap catatan kecil adalah bagian dari perjalananmu sebagai guru.</p>
          <button class="btn sm ghost" onClick={() => { go('journal'); openJournal(); }}>+ Tulis Catatan</button>
        </div>
      </aside>
      <div class="main">
        <header class="topbar">
          <form class="searchbar" role="search" onSubmit={(e) => { e.preventDefault(); if (query.trim()) go('search'); }}>
            <span aria-hidden="true">⌕</span>
            <input type="search" placeholder="Cari jurnal, rencana, sumber, tugas..." aria-label="Cari di aplikasi" value={query} onInput={(e) => searchAtom.set(e.currentTarget.value)} />
          </form>
          <div class="top-right">
            <span class="muted small profile-label">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: db.profile.tz })}</span>
            <button class="avatar" aria-label="Pengaturan profil" title={todayIn(db.profile.tz)} onClick={() => go('settings')}>{firstChar(db.profile.name)}</button>
          </div>
        </header>
        <main class="container" id="main"><View /></main>
      </div>
      <nav class="bottom-nav" aria-label="Navigasi seluler">
        {[...NAV.slice(0, 5), { page: 'settings' as Page, icon: '⚙', label: 'Atur' }].map(navBtn)}
      </nav>
      <ModalRoot />
      <Toast />
    </div>
  );
}
