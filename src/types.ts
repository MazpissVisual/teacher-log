export type ResourceType = 'Materi' | 'Ide' | 'Link' | 'Aktivitas';
export type PlanKind = 'pelajaran' | 'ulangan' | 'tugas' | 'lainnya';

export interface Profile { name: string; tz: string }
/** `className` is one entry from the teacher's class list, e.g. "Matematika 8B". */
export interface Journal { id: string; date: string; title: string; content: string; className: string }
export interface Plan {
  id: string; title: string; date: string; time: string; className: string; notes: string; kind: PlanKind;
  /** Only meaningful for kind "tugas". */
  done: boolean;
}
export interface Resource { id: string; title: string; type: ResourceType; className: string; description: string; url: string }
/** Weekly recurring class. `day` is 0 (Sunday) to 6 (Saturday); `until` (optional) is the last date it repeats. */
export interface Schedule { id: string; className: string; day: number; start: string; end: string; room: string; until: string }

export interface DB {
  version: 3;
  profile: Profile;
  classes: string[];
  journals: Journal[];
  plans: Plan[];
  resources: Resource[];
  schedules: Schedule[];
}

export type Collection = 'journals' | 'plans' | 'resources' | 'schedules';
export type Page = 'dashboard' | 'journal' | 'mengajar' | 'bahan' | 'settings' | 'privacy' | 'terms';
