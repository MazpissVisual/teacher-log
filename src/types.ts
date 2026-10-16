export type Mood = 'great' | 'good' | 'neutral' | 'challenging';
export type Priority = 'low' | 'medium' | 'high';
export type ResourceType = 'Materi' | 'Ide' | 'Link' | 'Aktivitas';

export interface Profile { name: string; tz: string }
export interface Journal {
  id: string; date: string; type: 'quick' | 'detailed'; title: string; content: string;
  className: string; subject: string; mood: Mood; topic: string; worked: string; improve: string; pinned: boolean;
}
export interface Plan {
  id: string; title: string; date: string; time: string; className: string; subject: string;
  objective: string; activities: string;
}
export interface Resource { id: string; title: string; type: ResourceType; description: string; url: string }
export interface Task { id: string; title: string; description?: string; date: string; priority: Priority; done: boolean }

export interface DB {
  version: 2;
  profile: Profile;
  classes: string[];
  subjects: string[];
  journals: Journal[];
  plans: Plan[];
  resources: Resource[];
  tasks: Task[];
}

export type Collection = 'journals' | 'plans' | 'resources' | 'tasks';
export type Page = 'dashboard' | 'journal' | 'planner' | 'library' | 'tasks' | 'journey' | 'search' | 'settings' | 'privacy' | 'terms';
