import { useCallback, useState } from 'react';
import { TabBar } from './components';
import type { Route } from './routes';
import { Today } from './screens/Today';
import { Routines } from './screens/Routines';
import { EditDay } from './screens/EditDay';
import { Workout } from './screens/Workout';
import { Summary } from './screens/Summary';
import { Progress } from './screens/Progress';
import { Settings } from './screens/Settings';
import { Weight } from './screens/Weight';

export function App() {
  const [route, setRoute] = useState<Route>({ name: 'tab', tab: 'today' });
  const go = useCallback((r: Route) => setRoute(r), []);

  let screen;
  switch (route.name) {
    case 'tab':
      screen = route.tab === 'today' ? <Today go={go} /> : route.tab === 'routines' ? <Routines go={go} /> : route.tab === 'progress' ? <Progress go={go} /> : <Weight />;
      break;
    case 'editDay':
      screen = <EditDay key={`${route.routineId}-${route.day}`} routineId={route.routineId} day={route.day} go={go} />;
      break;
    case 'workout':
      screen = <Workout sessionId={route.sessionId} go={go} />;
      break;
    case 'summary':
      screen = <Summary sessionId={route.sessionId} justFinished={route.justFinished} back={route.back} go={go} />;
      break;
    case 'settings':
      screen = <Settings go={go} />;
      break;
  }

  return (
    <div className="app">
      {screen}
      {route.name === 'tab' && <TabBar tab={route.tab} onTab={(tab) => go({ name: 'tab', tab })} />}
    </div>
  );
}
