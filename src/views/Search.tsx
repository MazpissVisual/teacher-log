import { useDB } from '../store';
import { Empty, searchAtom } from '../ui';
import { todayIn } from '../util';
import { JournalCard, PageHead, PlanCard, ResourceCard, TaskRow } from './shared';

export function Search() {
  const db = useDB();
  const q = searchAtom.use().trim().toLowerCase();
  const has = (...f: string[]) => f.join(' ').toLowerCase().includes(q);
  const today = todayIn(db.profile.tz);

  const journals = q ? db.journals.filter((j) => has(j.title, j.content, j.topic, j.worked, j.improve)) : [];
  const plans = q ? db.plans.filter((p) => has(p.title, p.objective, p.activities)) : [];
  const resources = q ? db.resources.filter((r) => has(r.title, r.description)) : [];
  const tasks = q ? db.tasks.filter((t) => has(t.title)) : [];
  const total = journals.length + plans.length + resources.length + tasks.length;

  const Section = ({ title, n, children }: { title: string; n: number; children: preact.ComponentChildren }) =>
    n ? <div class="panel section-spacer"><div class="panel-head"><h2>{title} ({n})</h2></div>{children}</div> : null;

  return (
    <>
      <PageHead kicker="Arsip" title="Hasil Pencarian" sub={q ? `${total} hasil untuk “${searchAtom.get().trim()}”` : 'Ketik kata kunci di kolom pencarian lalu tekan Enter.'} />
      {q && !total && <div class="panel"><Empty title="Tidak ada hasil" /></div>}
      <Section title="Jurnal" n={journals.length}>{journals.map((j) => <JournalCard j={j} />)}</Section>
      <Section title="Rencana" n={plans.length}>{plans.map((p) => <PlanCard p={p} today={today} />)}</Section>
      <Section title="Sumber" n={resources.length}><div class="list-grid">{resources.map((r) => <ResourceCard r={r} />)}</div></Section>
      <Section title="Tugas" n={tasks.length}>{tasks.map((t) => <TaskRow t={t} today={today} />)}</Section>
    </>
  );
}
