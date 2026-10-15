import { useState } from 'preact/hooks';
import { Check } from 'lucide-preact';
import { useDB } from '../store';
import { openJournal, openPlan } from '../forms';
import { Icon } from '../icons';
import { go } from '../ui';

const KEY = 'gurulog-onboarding-hidden';
const hidden = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };

/** First-run checklist. Disappears on its own when everything is done, or when the teacher hides it. */
export function Onboarding() {
  const db = useDB();
  const [off, setOff] = useState(hidden());

  const steps = [
    { done: db.classes.length > 0 && db.subjects.length > 0, title: 'Isi kelas dan mata pelajaranmu', desc: 'Dipakai di dropdown dan filter jurnal maupun perencana.', cta: 'Buka pengaturan', run: () => go('settings') },
    { done: db.journals.length > 0, title: 'Tulis catatan pertamamu', desc: 'Cukup satu-dua kalimat tentang pembelajaran hari ini.', cta: 'Tulis catatan', run: () => openJournal() },
    { done: db.plans.length > 0, title: 'Rencanakan satu pertemuan', desc: 'Atur tanggal, kelas, dan tujuan pembelajarannya.', cta: 'Buat rencana', run: () => openPlan() },
  ];
  const left = steps.filter((s) => !s.done).length;
  if (off || left === 0) return null;

  const hide = () => { try { localStorage.setItem(KEY, '1'); } catch { /* ignore */ } setOff(true); };

  return (
    <section class="panel onboarding" aria-labelledby="ob-title">
      <div class="panel-head">
        <h2 id="ob-title">Mulai dalam 3 langkah</h2>
        <button class="link" onClick={hide}>Sembunyikan</button>
      </div>
      <ol class="ob-list">
        {steps.map((s, i) => (
          <li class={s.done ? 'done' : ''}>
            <span class="ob-mark" aria-hidden="true">{s.done ? <Icon as={Check} size={16} /> : i + 1}</span>
            <div class="ob-text">
              <b>{s.title}</b>
              <span>{s.desc}</span>
              <span class="sr-only">{s.done ? 'Selesai' : 'Belum selesai'}</span>
            </div>
            {!s.done && <button class="btn sm secondary" onClick={s.run}>{s.cta}</button>}
          </li>
        ))}
      </ol>
    </section>
  );
}
