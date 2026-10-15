import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppShell from '../components/layout/AppShell';
import ProtectedRoute from '../components/layout/ProtectedRoute';
import RoleGuard from '../components/layout/RoleGuard';

import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/DashboardPage';
import VehicleListPage from '../pages/VehicleListPage';
import VehicleDetailPage from '../pages/VehicleDetailPage';
import AddVehiclePage from '../pages/AddVehiclePage';
import EditVehiclePage from '../pages/EditVehiclePage';
import ManualOdometerPage from '../pages/ManualOdometerPage';
import WorkOrderListPage from '../pages/WorkOrderListPage';
import WorkOrderDetailPage from '../pages/WorkOrderDetailPage';
import CreateWorkOrderPage from '../pages/CreateWorkOrderPage';
import CloseWorkOrderPage from '../pages/CloseWorkOrderPage';
import MyWorkOrdersPage from '../pages/MyWorkOrdersPage';
import ScheduleListPage from '../pages/ScheduleListPage';
import ScheduleDetailPage from '../pages/ScheduleDetailPage';
import CreateSchedulePage from '../pages/CreateSchedulePage';
import EditSchedulePage from '../pages/EditSchedulePage';
import NotFoundPage from '../pages/NotFoundPage';
import UnauthorizedPage from '../pages/UnauthorizedPage';

export default function AppRouter(): React.ReactElement {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/403" element={<UnauthorizedPage />} />
        <Route path="/404" element={<NotFoundPage />} />

        {/* Protected — all authenticated users get AppShell */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>

            {/* Dashboard — manager, technician */}
            <Route
              path="/dashboard"
              element={
                <RoleGuard roles={['manager', 'technician']}>
                  <DashboardPage />
                </RoleGuard>
              }
            />

            {/* Vehicles — administrator, manager, technician can list/view */}
            <Route
              path="/vehicles"
              element={
                <RoleGuard roles={['administrator', 'manager', 'technician']}>
                  <VehicleListPage />
                </RoleGuard>
              }
            />
            <Route
              path="/vehicles/new"
              element={
                <RoleGuard roles={['administrator', 'manager']}>
                  <AddVehiclePage />
                </RoleGuard>
              }
            />
            <Route
              path="/vehicles/:id"
              element={
                <RoleGuard roles={['administrator', 'manager', 'technician']}>
                  <VehicleDetailPage />
                </RoleGuard>
              }
            />
            <Route
              path="/vehicles/:id/edit"
              element={
                <RoleGuard roles={['administrator', 'manager']}>
                  <EditVehiclePage />
                </RoleGuard>
              }
            />
            <Route
              path="/vehicles/:id/readings/new"
              element={
                <RoleGuard roles={['administrator', 'manager', 'technician']}>
                  <ManualOdometerPage />
                </RoleGuard>
              }
            />

            {/* Work Orders */}
            <Route
              path="/work-orders"
              element={
                <RoleGuard roles={['manager', 'technician']}>
                  <WorkOrderListPage />
                </RoleGuard>
              }
            />
            <Route
              path="/work-orders/new"
              element={
                <RoleGuard roles={['administrator', 'manager']}>
                  <CreateWorkOrderPage />
                </RoleGuard>
              }
            />
            <Route
              path="/work-orders/:id"
              element={
                <RoleGuard roles={['administrator', 'manager', 'technician']}>
                  <WorkOrderDetailPage />
                </RoleGuard>
              }
            />
            <Route
              path="/work-orders/:id/close"
              element={
                <RoleGuard roles={['technician']}>
                  <CloseWorkOrderPage />
                </RoleGuard>
              }
            />
            <Route
              path="/my-work-orders"
              element={
                <RoleGuard roles={['technician']}>
                  <MyWorkOrdersPage />
                </RoleGuard>
              }
            />

            {/* Schedules */}
            <Route
              path="/schedules"
              element={
                <RoleGuard roles={['administrator', 'manager']}>
                  <ScheduleListPage />
                </RoleGuard>
              }
            />
            <Route
              path="/schedules/new"
              element={
                <RoleGuard roles={['administrator']}>
                  <CreateSchedulePage />
                </RoleGuard>
              }
            />
            <Route
              path="/schedules/:id"
              element={
                <RoleGuard roles={['administrator', 'manager']}>
                  <ScheduleDetailPage />
                </RoleGuard>
              }
            />
            <Route
              path="/schedules/:id/edit"
              element={
                <RoleGuard roles={['administrator']}>
                  <EditSchedulePage />
                </RoleGuard>
              }
            />

            {/* Root redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Catch-all inside shell */}
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Route>
        </Route>

        {/* Catch-all outside shell */}
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
