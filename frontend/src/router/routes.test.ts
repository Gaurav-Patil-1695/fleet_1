import { describe, it, expect } from 'vitest';
import { ROUTES, resolveRoute } from './routes';

describe('ROUTES constants', () => {
  it('contains all required route paths', () => {
    expect(ROUTES.LOGIN).toBe('/login');
    expect(ROUTES.DASHBOARD).toBe('/dashboard');
    expect(ROUTES.VEHICLES).toBe('/vehicles');
    expect(ROUTES.VEHICLE_NEW).toBe('/vehicles/new');
    expect(ROUTES.VEHICLE_DETAIL).toBe('/vehicles/:id');
    expect(ROUTES.VEHICLE_EDIT).toBe('/vehicles/:id/edit');
    expect(ROUTES.VEHICLE_READINGS_NEW).toBe('/vehicles/:id/readings/new');
    expect(ROUTES.WORK_ORDERS).toBe('/work-orders');
    expect(ROUTES.WORK_ORDER_NEW).toBe('/work-orders/new');
    expect(ROUTES.WORK_ORDER_DETAIL).toBe('/work-orders/:id');
    expect(ROUTES.WORK_ORDER_CLOSE).toBe('/work-orders/:id/close');
    expect(ROUTES.MY_WORK_ORDERS).toBe('/my-work-orders');
    expect(ROUTES.SCHEDULES).toBe('/schedules');
    expect(ROUTES.SCHEDULE_NEW).toBe('/schedules/new');
    expect(ROUTES.SCHEDULE_DETAIL).toBe('/schedules/:id');
    expect(ROUTES.SCHEDULE_EDIT).toBe('/schedules/:id/edit');
    expect(ROUTES.NOT_FOUND).toBe('/404');
    expect(ROUTES.UNAUTHORIZED).toBe('/403');
  });
});

describe('resolveRoute', () => {
  it('replaces a single :id param with the provided value', () => {
    const result = resolveRoute(ROUTES.VEHICLE_DETAIL, { id: '42' });
    expect(result).toBe('/vehicles/42');
  });

  it('replaces :id in a nested path correctly', () => {
    const result = resolveRoute(ROUTES.VEHICLE_EDIT, { id: '99' });
    expect(result).toBe('/vehicles/99/edit');
  });

  it('replaces :id for readings new path', () => {
    const result = resolveRoute(ROUTES.VEHICLE_READINGS_NEW, { id: '7' });
    expect(result).toBe('/vehicles/7/readings/new');
  });

  it('accepts numeric param values', () => {
    const result = resolveRoute(ROUTES.WORK_ORDER_DETAIL, { id: 123 });
    expect(result).toBe('/work-orders/123');
  });

  it('leaves unreplaced params as-is when no matching key provided', () => {
    const result = resolveRoute(ROUTES.VEHICLE_DETAIL, {});
    expect(result).toBe('/vehicles/:id');
  });
});
