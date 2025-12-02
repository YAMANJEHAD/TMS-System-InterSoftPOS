import { Component, OnInit, OnDestroy, ChangeDetectorRef, HostListener, NgZone } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SessionService } from '../../../../services/session.service';
import { SidebarService } from '../../../../services/sidebar.service';
import { HttpService } from '../../../../services/http.service';
import { ToastService } from '../../../../services/toast.service';
import { API_CONFIG } from '../../../../config/api.config';
import { FileUtil } from '../../../../utils/file.util';
import { DateUtil } from '../../../../utils/date.util';

interface Notification {
  notificationId: number;
  taskId: number;
  userId: number;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

interface Priority {
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
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule],
  templateUrl: './header.html',
  styleUrl: './header.scss'
})
export class HeaderComponent implements OnInit, OnDestroy {
  currentTime = '';
  currentDate = '';
  userName = '';
  userRole = '';
  userEmail = '';
  userAvatarColor = '#0A1A3A'; // Default color
  showNotifications = false;
  showUserMenu = false;
  showAddTaskModal = false;
  notifications: Notification[] = [];
  unreadCount = 0;
  isSidebarCollapsed = false;
  private timeInterval: any;
  private routerSubscription: any;
  private sidebarSubscription: any;
  private sessionSubscription: any;
  
  // Add Task Form
  taskForm = {
    title: '',
    description: '',
    dueDate: DateUtil.getTodayISO(),
    statusId: 0,
    priorityId: 0,
    projectId: 0,
    selectedUserIds: [] as number[],
    fileName: '',
    fileBase64String: ''
  };
  selectedFile: File | null = null;
  priorities: Priority[] = [];
  projects: Project[] = [];
  statuses: Status[] = [];
  users: User[] = [];
  isSubmittingTask = false;

  constructor(
    private sessionService: SessionService,
    private sidebarService: SidebarService,
    private httpService: HttpService,
    private toastService: ToastService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.updateTime();
    // Use NgZone to ensure change detection runs for time updates
    this.timeInterval = setInterval(() => {
      this.ngZone.run(() => {
        this.updateTime();
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      });
    }, 1000);
    this.loadUserInfo();
    this.loadNotifications();
    
    // Subscribe to sidebar state changes
    this.isSidebarCollapsed = this.sidebarService.getIsCollapsed();
    this.sidebarSubscription = this.sidebarService.isCollapsed$.subscribe(collapsed => {
      this.isSidebarCollapsed = collapsed;
      this.cdr.detectChanges();
    });
    
    // Subscribe to session data changes (for avatar color updates)
    this.sessionSubscription = this.sessionService.sessionDataChanges$.subscribe(sessionData => {
      if (sessionData) {
        this.loadUserInfo();
      }
    });
    
    // Reload user info when navigating (especially after returning from settings)
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.loadUserInfo();
      });
  }

  toggleSidebar(): void {
    this.sidebarService.toggle();
  }

  ngOnDestroy(): void {
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
    }
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
    if (this.sidebarSubscription) {
      this.sidebarSubscription.unsubscribe();
    }
    if (this.sessionSubscription) {
      this.sessionSubscription.unsubscribe();
    }
  }

  updateTime(): void {
    const now = new Date();
    this.currentTime = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    this.currentDate = now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  loadUserInfo(): void {
    const sessionData = this.sessionService.getSessionData();
    if (sessionData) {
      this.userName = sessionData.name;
      this.userEmail = sessionData.email;
      // Use avatar color from session (source of truth for current user)
      this.userAvatarColor = sessionData.avatarColor || '#0A1A3A';
      // Map roleId to role name
      if (sessionData.roleId === 1) {
        this.userRole = 'Admin';
      } else if (sessionData.roleId === 2) {
        this.userRole = 'Employee';
      } else {
        this.userRole = 'User'; // Default for other role IDs
      }
      this.cdr.detectChanges();
    }
  }

  loadNotifications(): void {
    const sessionData = this.sessionService.getSessionData();
    if (sessionData) {
      this.httpService.get<Notification[]>(
        API_CONFIG.ENDPOINTS.NOTIFICATIONS.GET_BY_USER(sessionData.userId)
      ).subscribe({
        next: (notifications) => {
          this.ngZone.run(() => {
          this.notifications = [...notifications];
          this.unreadCount = notifications.filter(n => !n.isRead).length;
            this.cdr.markForCheck();
          this.cdr.detectChanges();
          });
        },
        error: (error) => {
          this.ngZone.run(() => {
          console.error('Error loading notifications:', error);
            this.cdr.markForCheck();
          this.cdr.detectChanges();
          });
        }
      });
    }
  }

  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
    if (this.showNotifications) {
      this.loadNotifications();
    }
  }

  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    // Close notifications dropdown if clicking outside
    if (this.showNotifications && !target.closest('.notifications-dropdown') && !target.closest('.notifications-btn')) {
      this.showNotifications = false;
    }
    // Close user menu if clicking outside
    if (this.showUserMenu && !target.closest('.user-profile')) {
      this.showUserMenu = false;
    }
  }

  markNotificationAsRead(notificationId: number): void {
    this.httpService.put(
      API_CONFIG.ENDPOINTS.NOTIFICATIONS.MARK_READ(notificationId),
      {}
    ).subscribe({
      next: () => {
        this.ngZone.run(() => {
        this.toastService.success('Notification marked as read');
        this.loadNotifications();
          this.cdr.markForCheck();
        this.cdr.detectChanges();
        });
      },
      error: (error) => {
        this.ngZone.run(() => {
        this.toastService.error('Failed to mark notification as read');
        console.error('Error marking notification as read:', error);
        });
      }
    });
  }

  deleteNotification(notificationId: number): void {
    this.httpService.delete(
      API_CONFIG.ENDPOINTS.NOTIFICATIONS.DELETE(notificationId)
    ).subscribe({
      next: () => {
        this.ngZone.run(() => {
        this.toastService.success('Notification deleted successfully');
        this.loadNotifications();
          this.cdr.markForCheck();
        this.cdr.detectChanges();
        });
      },
      error: (error) => {
        this.ngZone.run(() => {
        this.toastService.error('Failed to delete notification');
        console.error('Error deleting notification:', error);
        });
      }
    });
  }

  clearOldNotifications(): void {
    this.httpService.delete(
      API_CONFIG.ENDPOINTS.NOTIFICATIONS.CLEAR_OLD
    ).subscribe({
      next: () => {
        this.ngZone.run(() => {
        this.toastService.success('Old notifications cleared successfully');
        this.loadNotifications();
          this.cdr.markForCheck();
        this.cdr.detectChanges();
        });
      },
      error: (error) => {
        this.ngZone.run(() => {
        this.toastService.error('Failed to clear old notifications');
        console.error('Error clearing old notifications:', error);
        });
      }
    });
  }

  openAddTaskModal(): void {
    this.showAddTaskModal = true;
    this.loadTaskFilters();
    this.resetTaskForm();
  }

  closeAddTaskModal(): void {
    this.showAddTaskModal = false;
    this.resetTaskForm();
  }

  loadTaskFilters(): void {
    this.httpService.get<Priority[]>(API_CONFIG.ENDPOINTS.FILTERS.PRIORITIES).subscribe({
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

  resetTaskForm(): void {
    this.taskForm = {
      title: '',
      description: '',
      dueDate: DateUtil.getTodayISO(),
      statusId: 0,
      priorityId: 0,
      projectId: 0,
      selectedUserIds: [],
      fileName: '',
      fileBase64String: ''
    };
    this.selectedFile = null;
  }

  onTaskFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile = input.files[0];
      this.taskForm.fileName = this.selectedFile.name;
      FileUtil.fileToBase64(this.selectedFile).then(base64 => {
        this.taskForm.fileBase64String = base64;
      });
    }
  }

  createTask(): void {
    if (!this.taskForm.title || !this.taskForm.dueDate) {
      this.toastService.warning('Title and Due Date are required');
      return;
    }

    if (!this.taskForm.statusId || this.taskForm.statusId === 0) {
      this.toastService.warning('Status is required');
      return;
    }

    if (!this.taskForm.priorityId || this.taskForm.priorityId === 0) {
      this.toastService.warning('Priority is required');
      return;
    }

    if (!this.taskForm.projectId || this.taskForm.projectId === 0) {
      this.toastService.warning('Project is required');
      return;
    }

    this.isSubmittingTask = true;
    // Convert selected user IDs array to comma-separated string
    // Ensure all values are numbers (HTML select returns strings)
    const userIds = this.taskForm.selectedUserIds.map(id => 
      typeof id === 'string' ? parseInt(id, 10) : id
    ).filter(id => !isNaN(id));
    
    const idsString = userIds.length > 0 
      ? userIds.join(',') 
      : '';
    
    const taskData: any = {
      title: this.taskForm.title,
      description: this.taskForm.description,
      dueDate: this.taskForm.dueDate,
      statusId: this.taskForm.statusId,
      priorityId: this.taskForm.priorityId,
      projectId: this.taskForm.projectId,
      ids: idsString
    };

    if (this.taskForm.fileBase64String && this.taskForm.fileName) {
      taskData.fileName = this.taskForm.fileName;
      taskData.fileBase64String = this.taskForm.fileBase64String;
    }

    this.httpService.post(API_CONFIG.ENDPOINTS.TASKS.CREATE, taskData).subscribe({
      next: () => {
        this.ngZone.run(() => {
        this.isSubmittingTask = false;
        this.toastService.success('Task created successfully');
        this.closeAddTaskModal();
          this.cdr.markForCheck();
        this.cdr.detectChanges();
        // Reload current page or refresh tasks if on tasks page
        if (this.router.url.includes('/all-tasks') || this.router.url.includes('/my-tasks')) {
          window.location.reload();
        }
        });
      },
      error: (error) => {
        this.ngZone.run(() => {
        this.isSubmittingTask = false;
        console.error('Error creating task:', error);
        this.toastService.error('Failed to create task. Please try again.');
          this.cdr.markForCheck();
        this.cdr.detectChanges();
        });
      }
    });
  }

  goToSettings(): void {
    this.showUserMenu = false;
    this.router.navigate(['/settings']);
  }

  logout(): void {
    this.sessionService.clearSession();
    this.router.navigate(['/login']);
  }

  getInitials(): string {
    return this.userName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  hasPermission(permission: string): boolean {
    return this.sessionService.hasPermission(permission);
  }
}
