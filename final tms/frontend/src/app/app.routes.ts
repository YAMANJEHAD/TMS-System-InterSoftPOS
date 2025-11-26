import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { LayoutComponent } from './layout/layout.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { TasksComponent } from './pages/tasks/tasks.component';
import { MyTasksComponent } from './pages/my-tasks/my-tasks.component';
import { InventoryComponent } from './pages/inventory/inventory.component';
import { AddInventoryComponent } from './pages/inventory/add-inventory.component';
import { InventoryReportsComponent } from './pages/inventory/inventory-reports.component';
import { TransferComponent } from './pages/transfer/transfer.component';
import { AddTransferComponent } from './pages/transfer/add-transfer.component';
import { TransferReportsComponent } from './pages/transfer/transfer-reports.component';
import { PapersComponent } from './pages/papers/papers.component';
import { JobOrdersComponent } from './pages/job-orders/job-orders.component';
import { ReportsComponent } from './pages/reports/reports.component';
import { UsersComponent } from './pages/users/users.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'tasks', component: TasksComponent },
      { path: 'my-tasks', component: MyTasksComponent },
      { path: 'inventory', redirectTo: 'inventory/add', pathMatch: 'full' },
      { path: 'inventory/add', component: AddInventoryComponent },
      { path: 'inventory/reports', component: InventoryReportsComponent },
      { path: 'transfer', redirectTo: 'transfer/add', pathMatch: 'full' },
      { path: 'transfer/add', component: AddTransferComponent },
      { path: 'transfer/reports', component: TransferReportsComponent },
      { path: 'papers', component: PapersComponent },
      { path: 'job-orders', component: JobOrdersComponent },
      { path: 'reports', component: ReportsComponent },
      { path: 'users', component: UsersComponent }
    ]
  },
  { path: '**', redirectTo: 'login' }
];
