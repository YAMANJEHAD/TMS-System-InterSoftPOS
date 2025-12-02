import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { SessionService } from '../services/session.service';
import { roleGuard } from '../guards/role.guard';

const authGuard = () => {
  const sessionService = inject(SessionService);
  const router = inject(Router);
  
  if (!sessionService.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }
  return true;
};

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then(m => m.LoginComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },
  {
    path: 'all-tasks',
    loadComponent: () => import('./pages/all-tasks/all-tasks').then(m => m.AllTasksComponent),
    canActivate: [authGuard]
  },
  {
    path: 'my-tasks',
    loadComponent: () => import('./pages/my-tasks/my-tasks').then(m => m.MyTasksComponent),
    canActivate: [authGuard]
  },
  {
    path: 'task-details/:id',
    loadComponent: () => import('./pages/task-details/task-details').then(m => m.TaskDetailsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'settings',
    loadComponent: () => import('./pages/settings/settings').then(m => m.SettingsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'transfer',
    loadComponent: () => import('./pages/transfer/transfer').then(m => m.TransferComponent),
    canActivate: [authGuard]
  },
  {
    path: 'transfer-reports',
    loadComponent: () => import('./pages/transfer-reports/transfer-reports').then(m => m.TransferReportsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'inventory',
    loadComponent: () => import('./pages/inventory/inventory').then(m => m.InventoryComponent),
    canActivate: [authGuard]
  },
  {
    path: 'inventory-report',
    loadComponent: () => import('./pages/inventory-report/inventory-report').then(m => m.InventoryReportComponent),
    canActivate: [authGuard]
  },
  {
    path: 'paper-requests',
    loadComponent: () => import('./pages/paper-requests/paper-requests').then(m => m.PaperRequestsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'job-orders',
    loadComponent: () => import('./pages/job-orders/job-orders').then(m => m.JobOrdersComponent),
    canActivate: [authGuard]
  },
  {
    path: 'reports',
    loadComponent: () => import('./pages/reports/reports').then(m => m.ReportsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'users-management',
    loadComponent: () => import('./pages/users-management/users-management').then(m => m.UsersManagementComponent),
    canActivate: [authGuard, roleGuard([2])] // Block role ID 2 from accessing this route
  },
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];
