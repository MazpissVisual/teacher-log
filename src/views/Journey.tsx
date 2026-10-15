import { exportJSON, useDB } from '../store';
import { openJournal } from '../forms';
import { CountUp, download, Empty, toast } from '../ui';
import { addDays, dateText, todayIn } from '../util';
import { BookOpen, CheckSquare, Download, NotebookPen, Smile } from 'lucide-preact';
import { Icon, MoodIcon } from '../icons';
import { PageHead } from './shared';

export function Journey() {
  const db = useDB();
  const today = todayIn(db.profile.tz);
  const journals = [...db.journals].sort((a, b) => b.date.localeCompare(a.date));

  // Four contiguous 7-day windows ending today, compared as date strings (no timezone/time-of-day drift).
  const weeks = [3, 2, 1, 0].map((w) => {
    const end = addDays(today, -7 * w);
    const start = addDays(end, -6);
    return db.journals.filter((j) => j.date >= start && j.date <= end).length;
  });
  const max = Math.max(1, ...weeks);

  const stats: [typeof NotebookPen, string, number][] = [
    [NotebookPen, 'Total refleksi', journals.length],
    [Smile, 'Mood positif', journals.filter((x) => x.mood === 'great' || x.mood === 'good').length],
    [BookOpen, 'Bahan tersimpan', db.resources.length],
    [CheckSquare, 'Tugas tuntas', db.tasks.filter((x) => x.done).length],
  ];

  return (
    <>
      <PageHead kicker="Seksi · Perjalanan" title="Perjalanan Mengajarku" sub="Setiap pengalaman adalah langkah untuk berkembang." action={<button class="btn secondary" onClick={() => { download(`gurulog-data-${today}.json`, exportJSON()); toast('Data berhasil diekspor'); }}><Icon as={Download} size={16} /> Ekspor data</button>} />
      <div class="cards4">
        {stats.map(([Ico, l, n]) => <div class="stat"><div class="stat-top"><span>{l}</span><span class="stat-icon"><Icon as={Ico} size={16} /></span></div><strong><CountUp value={n} /></strong><p>Aktivitas pribadi</p></div>)}
      </div>
      <div class="grid-main">
        <div class="panel">
          <div class="panel-head"><h2>Linimasa Mengajar</h2></div>
          <div class="timeline">
            {journals.length ? journals.map((x) => (
              <div class="timeline-item">
                <div class="journal-meta"><span>{dateText(x.date)}</span><span style="display:inline-flex;align-items:center;gap:6px"><MoodIcon m={x.mood} size={16} /> {x.className || 'Pribadi'}</span></div>
                <h3>{x.title}</h3>
                <p>{x.content}</p>
                <button class="link" onClick={() => openJournal(x)}>Buka refleksi →</button>
              </div>
            )) : <Empty title="Perjalanan mengajarmu dimulai dengan satu catatan" />}
          </div>
        </div>
        <div class="stack">
          <div class="panel">
            <h2>Ritme Jurnalmu</h2>
            <p class="muted small">Total catatan dalam 4 minggu terakhir</p>
            <div style="margin-top:25px">
              {weeks.map((n, i) => (
                <div style="display:flex;gap:14px;align-items:center;margin:15px 0">
                  <span class="muted small" style="min-width:60px">{i === 3 ? 'Minggu ini' : `${3 - i} mgg lalu`}</span>
                  <div class="progress" style="flex:1" role="progressbar" aria-label={(i === 3 ? 'Minggu ini' : (3 - i) + ' minggu lalu') + ': ' + n + ' catatan'} aria-valuemin={0} aria-valuemax={max} aria-valuenow={n}><span style={`width:${(n / max) * 100}%`} /></div>
                  <b>{n}</b>
                </div>
              ))}
            </div>
          </div>
          <div class="panel quote inverted">
            <h2>Renungkan &amp; Tumbuh</h2>
            <p>Catatan bukan alat untuk menilai apakah kamu guru yang baik. Ini adalah ruang aman untuk melihat apa yang telah dipelajari sepanjang perjalananmu.</p>
          </div>
        </div>
      </div>
    </>
  );
}
