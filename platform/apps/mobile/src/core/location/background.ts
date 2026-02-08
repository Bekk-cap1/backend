import { setBackgroundLocationHandler, startBackgroundLocationTask, stopBackgroundLocationTask } from './background-task';
import type { LocationPoint } from './foreground';

export async function startBackgroundTracking(onPoint: (point: LocationPoint) => Promise<void>) {
  setBackgroundLocationHandler(onPoint);
  await startBackgroundLocationTask();

  return async () => {
    setBackgroundLocationHandler(null);
    await stopBackgroundLocationTask();
  };
}
