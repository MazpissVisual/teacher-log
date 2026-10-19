export type Mood = 'great' | 'good' | 'neutral' | 'challenging';
export type Priority = 'low' | 'medium' | 'high';
export type PlanKind = 'kuliah' | 'kuis' | 'uts' | 'uas' | 'deadline';
export type StageStatus = 'todo' | 'doing' | 'done';
export type ResourceType = 'Materi' | 'Ide' | 'Link' | 'Aktivitas';

export interface Profile { name: string; tz: string }
export interface Journal {
  id: string; date: string; type: 'quick' | 'detailed'; title: string; content: string;
  className: string; subject: string; mood: Mood; topic: string; worked: string; improve: string; pinned: boolean;
}
export interface Plan {
  id: string; title: string; date: string; time: string; className: string; subject: string;
  objective: string; activities: string; kind: PlanKind;
}
export interface Resource { id: string; title: string; type: ResourceType; subject: string; description: string; url: string }
export interface Task { id: string; title: string; description?: string; subject: string; date: string; priority: Priority; done: boolean }
/** Weekly recurring class. `day` is 0 (Sunday) to 6 (Saturday); `until` (optional) is the last date it repeats. */
export interface Schedule { id: string; subject: string; className: string; day: number; start: string; end: string; room: string; until: string }
export interface Stage { id: string; title: string; status: StageStatus; date: string; note: string }
export interface Guidance { id: string; date: string; lecturer: string; notes: string; followup: string; followupDone: boolean }

export interface DB {
  version: 2;
  profile: Profile;
  classes: string[];
  subjects: string[];
  journals: Journal[];
  plans: Plan[];
  resources: Resource[];
  tasks: Task[];
  schedules: Schedule[];
  stages: Stage[];
  guidance: Guidance[];
}

export type Collection = 'journals' | 'plans' | 'resources' | 'tasks' | 'schedules' | 'stages' | 'guidance';
export type Page = 'dashboard' | 'journal' | 'planner' | 'library' | 'tasks' | 'courses' | 'thesis' | 'journey' | 'search' | 'settings' | 'privacy' | 'terms';
