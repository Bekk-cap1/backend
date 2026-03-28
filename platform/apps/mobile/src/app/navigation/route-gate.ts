import type { AuthState } from '../../stores/auth/auth.store';

export type RootRouteName =
  | 'AuthStack'
  | 'AdminBlocked'
  | 'PassengerTabs'
  | 'DriverTabs'
  | 'Bootstrapping';

export function resolveRootRoute(state: Pick<AuthState, 'status' | 'user'>): RootRouteName {
  const role = state.user?.role;
  const isPassenger = state.status === 'authenticated' && role === 'passenger';
  const isDriver = state.status === 'authenticated' && role === 'driver';
  const isBlocked = state.status === 'blocked' || (state.status === 'authenticated' && !isPassenger && !isDriver);

  if (state.status === 'anonymous') return 'AuthStack';
  if (isBlocked) return 'AdminBlocked';
  if (isPassenger) return 'PassengerTabs';
  if (isDriver) return 'DriverTabs';
  return 'Bootstrapping';
}

export function resolveRoleAccess(state: Pick<AuthState, 'status' | 'user'>) {
  const role = state.user?.role;
  return {
    isPassenger: state.status === 'authenticated' && role === 'passenger',
    isDriver: state.status === 'authenticated' && role === 'driver',
    isBlocked: state.status === 'blocked' || (state.status === 'authenticated' && role !== 'passenger' && role !== 'driver'),
  };
}
