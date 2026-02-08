import { API_GAP_SET } from './api-gaps.generated';

export function isApiActionAvailable(actionId: string): boolean {
  return !API_GAP_SET.has(actionId);
}
