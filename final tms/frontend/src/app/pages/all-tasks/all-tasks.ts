import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpService } from '../../../services/http.service';
import { SessionService } from '../../../services/session.service';
import { UserService } from '../../../services/user.service';
import { UserColorService } from '../../../services/user-color.service';
import { API_CONFIG } from '../../../config/api.config';
import { DateUtil } from '../../../utils/date.util';
import { UserAvatarUtil } from '../../../utils/user-avatar.util';
import { BreadcrumbComponent } from '../../components/breadcrumb/breadcrumb';
import { ExcelUtil } from '../../../utils/excel.util';
import { ToastService } from '../../../services/toast.service';

interface Task {
  taskId: number;
  title: string;
  dueDate: string;
  statusName: string;
  priorityName: string;
  projectName: string;
  asignTo: string;
}

interface Filter {
  priorityId: number;
  priorityName: string;
}

interface Project {
  projectId: number;
  name: string;
}

interface Status {
  statusId: number;
  statusName: string;
}

interface User {
  userId: number;
  name: string;
}

@Component({
  selector: 'app-all-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, BreadcrumbComponent],
  templateUrl: './all-tasks.html',
  styleUrl: './all-tasks.scss'
})
export class AllTasksComponent implements OnInit {
  tasks: Task[] = [];
  filteredTasks: Task[] = [];
  isLoading = false;
  
  // Filters
  fromDate = DateUtil.getTodayISO();
  toDate = DateUtil.getTodayISO();
  title = '';
  statusId = -1;
  priorityId = -1;
  projectId = -1;
  userId = -1;
  
  // Filter options
  priorities: Filter[] = [];
  projects: Project[] = [];
  statuses: Status[] = [];
  users: User[] = [];
  
  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;
  totalItems = 0;
  showAllMode = false;

  constructor(
    private httpService: HttpService,
    private sessionService: SessionService,
    private userService: UserService,
    private userColorService: UserColorService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private toastService: ToastService,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    if (!this.sessionService.hasPermission('GetTasks')) {
      return;
    }
    // Load users for avatar display
    this.userService.loadAllUsers();
    this.loadFilters();
    this.loadTasks();
  }

  loadFilters(): void {
    this.httpService.get<Filter[]>(API_CONFIG.ENDPOINTS.FILTERS.PRIORITIES).subscribe({
      next: (data) => {
        this.ngZone.run(() => {
        this.priorities = [...data];
          this.cdr.markForCheck();
        this.cdr.detectChanges();
        });
      }
    });
    this.httpService.get<Project[]>(API_CONFIG.ENDPOINTS.FILTERS.PROJECTS).subscribe({
      next: (data) => {
        this.ngZone.run(() => {
        this.projects = [...data];
          this.cdr.markForCheck();
        this.cdr.detectChanges();
        });
      }
    });
    this.httpService.get<Status[]>(API_CONFIG.ENDPOINTS.FILTERS.STATUSES).subscribe({
      next: (data) => {
        this.ngZone.run(() => {
        this.statuses = [...data];
          this.cdr.markForCheck();
        this.cdr.detectChanges();
        });
      }
    });
    this.httpService.get<User[]>(API_CONFIG.ENDPOINTS.FILTERS.USERS).subscribe({
      next: (data) => {
        this.ngZone.run(() => {
        this.users = [...data];
          this.cdr.markForCheck();
        this.cdr.detectChanges();
        });
      }
    });
  }

  loadTasks(): void {
    this.isLoading = true;
    const params: any = {
      fromDate: this.fromDate,
      toDate: this.toDate,
      PageNumber: this.currentPage,
      PageSize: this.pageSize
    };

    // Add optional filters (only if not -1 or empty)
    if (this.title) params.title = this.title;
    if (this.statusId !== -1) params.statusId = this.statusId;
    if (this.priorityId !== -1) params.priorityId = this.priorityId;
    if (this.projectId !== -1) params.projectId = this.projectId;
    if (this.userId !== -1) params.userId = this.userId;

    this.httpService.get<Task[]>(API_CONFIG.ENDPOINTS.TASKS.GET_ALL, params).subscribe({
      next: (data) => {
        this.ngZone.run(() => {
        this.tasks = [...data];
        this.filteredTasks = [...data];
        
        // If we got fewer items than pageSize, we're on the last page
        // Otherwise, assume there might be more pages
        if (data.length < this.pageSize) {
          this.totalPages = this.currentPage;
        } else {
          // Assume there's at least one more page
          this.totalPages = this.currentPage + 1;
        }
        
        this.totalItems = (this.currentPage - 1) * this.pageSize + data.length;
        this.isLoading = false;
          this.cdr.markForCheck();
        this.cdr.detectChanges();
        });
      },
      error: (error) => {
        this.ngZone.run(() => {
        console.error('Error loading tasks:', error);
        this.isLoading = false;
          this.cdr.markForCheck();
        this.cdr.detectChanges();
        });
      }
    });
  }

  onPageChange(page: number): void {
    if (page < 1 || (this.totalPages > 0 && page > this.totalPages)) return;
    this.currentPage = page;
    this.loadTasks();
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.loadTasks();
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.loadTasks();
  }

  resetFilters(): void {
    this.fromDate = DateUtil.getTodayISO();
    this.toDate = DateUtil.getTodayISO();
    this.title = '';
    this.statusId = -1;
    this.priorityId = -1;
    this.projectId = -1;
    this.userId = -1;
    this.currentPage = 1;
    this.loadTasks();
  }

  viewTaskDetails(taskId: number): void {
    this.router.navigate(['/task-details', taskId]);
  }

  getPriorityClass(priority: string): string {
    if (priority.toLowerCase().includes('high')) return 'priority-high';
    if (priority.toLowerCase().includes('medium')) return 'priority-medium';
    return 'priority-low';
  }

  getStatusClass(status: string): string {
    if (status === 'Completed') return 'status-completed';
    if (status === 'Under Process') return 'status-under-process';
    return 'status-on-hold';
  }

  getUserAvatarColor(userName: string): string {
    // Get color from service (fixed, non-reactive)
    const user = this.userService.getUserByName(userName);
    if (user) {
      return this.userColorService.getColor(user.userId);
    }
    return '#0A1A3A'; // Default
  }

  getUserInitials(userName: string): string {
    return UserAvatarUtil.getInitials(userName);
  }

  exportToExcel(): void {
    const exportData = this.filteredTasks.map(task => ({
      'Task ID': task.taskId,
      'Title': task.title,
      'Due Date': task.dueDate,
      'Status': task.statusName,
      'Priority': task.priorityName,
      'Project': task.projectName,
      'Assigned To': task.asignTo || ''
    }));
    
    ExcelUtil.exportToExcel(exportData, `all_tasks_${new Date().toISOString().split('T')[0]}`);
    this.toastService.success('Tasks data exported successfully');
  }
}
