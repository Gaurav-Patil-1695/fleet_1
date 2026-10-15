export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  VEHICLES: '/vehicles',
  VEHICLE_NEW: '/vehicles/new',
  VEHICLE_DETAIL: '/vehicles/:id',
  VEHICLE_EDIT: '/vehicles/:id/edit',
  VEHICLE_READINGS_NEW: '/vehicles/:id/readings/new',
  WORK_ORDERS: '/work-orders',
  WORK_ORDER_NEW: '/work-orders/new',
  WORK_ORDER_DETAIL: '/work-orders/:id',
  WORK_ORDER_CLOSE: '/work-orders/:id/close',
  MY_WORK_ORDERS: '/my-work-orders',
  SCHEDULES: '/schedules',
  SCHEDULE_NEW: '/schedules/new',
  SCHEDULE_DETAIL: '/schedules/:id',
  SCHEDULE_EDIT: '/schedules/:id/edit',
  NOT_FOUND: '/404',
  UNAUTHORIZED: '/403',
} as const;

export type RouteKey = keyof typeof ROUTES;
export type RoutePath = (typeof ROUTES)[RouteKey];

/**
 * Resolves a parameterised route pattern to a concrete path.
 * Usage: resolveRoute(ROUTES.VEHICLE_DETAIL, { id: '42' }) => '/vehicles/42'
 */
export function resolveRoute(
  pattern: string,
  params: Record<string, string | number>,
): string {
  return Object.entries(params).reduce<string>(
    (path, [key, value]) => path.replace(`:${key}`, String(value)),
    pattern,
  );
}
