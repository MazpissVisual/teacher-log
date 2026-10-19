import { actions, useDB } from '../store';
import { Empty, removeWithUndo } from '../ui';
import { openGuidance, openStage, STAGE_LABEL } from '../forms';
import type { Guidance, Stage, StageStatus } from '../types';
import { countdown, dateText, tap, todayIn, uid } from '../util';
import { Pencil, Plus, Trash2 } from 'lucide-preact';
import { Icon } from '../icons';
import { PageHead, SectionTabs } from './shared';

const DEFAULT_STAGES = ['Pengajuan judul', 'Proposal', 'Seminar proposal', 'Penelitian', 'Seminar hasil', 'Sidang', 'Revisi dan pengumpulan'];
const NEXT: Record<StageStatus, StageStatus> = { todo: 'doing', doing: 'done', done: 'todo' };

function StageRow({ s, today }: { s: Stage; today: string }) {
  const cd = s.status === 'done' ? null : countdown(s.date, today);
  return (
    <div class={'task-row' + (s.status === 'done' ? ' done' : '')}>
      <button
        class={'pill ' + (s.status === 'doing' ? 'peach' : 'lilac')} style="cursor:pointer;min-width:84px;justify-content:center"
        aria-label={`Status ${s.title}: ${STAGE_LABEL[s.status]}. Ketuk untuk mengubah.`}
        onClick={() => { tap(); actions.patch('stages', s.id, { status: NEXT[s.status] }); }}
      >{STAGE_LABEL[s.status]}</button>
      <div style="flex:1;min-width:0">
        <div class="task-title">{s.title}</div>
        {s.note && <div class="task-desc">{s.note}</div>}
        {s.date && <div class="task-meta"><span>Target {dateText(s.date)}</span>{cd && <span class={'pill ' + (cd.urgent ? 'peach' : 'lilac')}>{cd.text}</span>}</div>}
      </div>
      <button class="link" onClick={() => openStage(s)}>Ubah</button>
      <button class="icon-btn compact" aria-label={`Hapus tahap: ${s.title}`} onClick={() => removeWithUndo('stages', s, 'Tahap dihapus')}><Icon as={Trash2} size={16} /></button>
    </div>
  );
}

function GuidanceCard({ g }: { g: Guidance }) {
  return (
    <article class="journal-card">
      <div class="journal-meta"><span>{dateText(g.date)}</span>{g.lecturer && <span class="tag">{g.lecturer}</span>}</div>
      {g.notes && <p>{g.notes}</p>}
      {g.followup && (
        <label class="check-row">
          <input type="checkbox" checked={g.followupDone} onChange={() => { tap(); actions.patch('guidance', g.id, { followupDone: !g.followupDone }); }} />
          <span style={g.followupDone ? 'text-decoration:line-through;opacity:.6' : ''}><b>Tindak lanjut:</b> {g.followup}</span>
        </label>
      )}
      <div class="card-actions">
        <button class="btn sm secondary" onClick={() => openGuidance(g)}><Icon as={Pencil} size={14} /> Ubah</button>
        <button class="btn sm danger" onClick={() => removeWithUndo('guidance', g, 'Catatan bimbingan dihapus')}><Icon as={Trash2} size={14} /> Hapus</button>
      </div>
    </article>
  );
}

export function Thesis() {
  const db = useDB();
  const today = todayIn(db.profile.tz);
  const done = db.stages.filter((s) => s.status === 'done').length;
  const pct = db.stages.length ? Math.round((done / db.stages.length) * 100) : 0;
  const sessions = [...db.guidance].sort((a, b) => b.date.localeCompare(a.date));
  const pending = db.guidance.filter((g) => g.followup && !g.followupDone).length;

  return (
    <>
      <SectionTabs page="thesis" />
      <PageHead kicker="Seksi · Tesis" title="Tesis" sub="Tahapan, bimbingan, dan tindak lanjut dalam satu tempat." action={<button class="btn" onClick={() => openGuidance()}><Icon as={Plus} size={16} /> Catat bimbingan</button>} />
      <div class="grid-main">
        <section class="panel">
          <div class="panel-head"><h2>Tahapan</h2><button class="link" onClick={() => openStage()}>Tambah +</button></div>
          {db.stages.length > 0 && (
            <div style="margin-bottom:14px">
              <div class="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Progres tahapan"><span style={`width:${pct}%`} /></div>
              <p class="legend" style="margin-top:6px">{done} dari {db.stages.length} tahap selesai ({pct}%)</p>
            </div>
          )}
          {db.stages.length ? db.stages.map((s) => <StageRow s={s} today={today} />) : (
            <Empty title="Belum ada tahapan" action={{ label: 'Isi tahapan standar', run: () => DEFAULT_STAGES.forEach((title) => actions.upsert('stages', { id: uid(), title, status: 'todo', date: '', note: '' })) }} />
          )}
        </section>
        <section class="panel">
          <div class="panel-head"><h2>Catatan bimbingan</h2>{pending > 0 && <span class="pill peach">{pending} tindak lanjut</span>}</div>
          {sessions.length ? sessions.map((g) => <GuidanceCard g={g} />) : <Empty title="Belum ada catatan bimbingan" action={{ label: 'Catat bimbingan pertama', run: () => openGuidance() }} />}
        </section>
      </div>
    </>
  );
}
