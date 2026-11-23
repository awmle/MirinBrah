import type { Tab } from './components';

export type Route =
  | { name: 'tab'; tab: Tab }
  | { name: 'editDay'; routineId: string; day: number }
  | { name: 'workout'; sessionId: string }
  | { name: 'summary'; sessionId: string; justFinished?: boolean; back?: Route }
  | { name: 'settings' };

export type Go = (r: Route) => void;
