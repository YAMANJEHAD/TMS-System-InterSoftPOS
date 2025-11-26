import { Component, OnInit, ChangeDetectorRef, AfterViewInit, NgZone } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, RouterOutlet, NavigationEnd } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';
import { TaskService } from '../services/task.service';
import { FilterService } from '../services/filter.service';
import { UserService } from '../services/user.service';
import { Notification } from '../models/notification.model';
import { CreateTaskRequest, SelfUpdateUserRequest } from '../models/request.model';
import { Priority, Project, Status, User } from '../models/filter.model';
import { filter, finalize, forkJoin } from 'rxjs';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterOutlet, DatePipe, FormsModule],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css']
})
export class LayoutComponent implements OnInit, AfterViewInit {
  userName: string | null = null;
  currentTime: Date = new Date();
  notifications: Notification[] = [];
  unreadCount: number = 0;
  showNotifications = false;
  showUserMenu = false;
  sidebarOpen = false;
  
  // Submenu toggle states
  inventoryOpen = false;
  transfersOpen = false;

  // Self-Update Modal
  showSelfUpdateModal = false;
  selfUpdateForm: SelfUpdateUserRequest = {
    name: '',
    phone: 0,
    avatar_color: '',
    theme: ''
  };
  updatingSelf = false;
  currentUser: User | null = null;
  selfUpdateError: string | null = null;
  selfUpdateSuccessMessage: string | null = null;

  // Add Task Modal
  showAddTaskModal = false;
  taskForm: CreateTaskRequest = {
    title: '',
    description: '',
    dueDate: '',
    statusId: 0,
    priorityId: 0,
    projectId: 0,
    ids: '',
    fileName: '',
    filePath: ''
  };
  creatingTask = false;
  taskError: string | null = null;
  taskSuccessMessage: string | null = null;

  // Filter options for task form
  priorities: Priority[] = [];
  projects: Project[] = [];
  statuses: Status[] = [];
  users: User[] = [];
  loadingTaskFilters = false;

  // Selected users for task assignment (hidden in UI)
  selectedUserIds: number[] = [];

  // File upload
  selectedFile: File | null = null;
  isDragging = false;
  uploadProgress = 0;

  constructor(
    public authService: AuthService,
    private notificationService: NotificationService,
    private taskService: TaskService,
    private filterService: FilterService,
    private userService: UserService,
    public router: Router,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    console.log('LayoutComponent: ngOnInit called');
    this.userName = this.authService.getUserName();
    console.log('LayoutComponent: userName =', this.userName);
    this.updateTime();
    setInterval(() => this.updateTime(), 1000);
    
    // Auto-expand submenus based on current route
    this.checkActiveRoutes();
    
    // Subscribe to route changes to auto-expand submenus
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.checkActiveRoutes();
    });
    
    const userId = sessionStorage.getItem('UserId');
    if (userId) {
      // Load notifications after view init to avoid change detection issues
      setTimeout(() => {
        this.loadNotifications(parseInt(userId));
      }, 0);
      
      // Load current user data for self-update
      this.loadCurrentUser();
    }
  }

  checkActiveRoutes(): void {
    const url = this.router.url;
    // Auto-expand inventory submenu if on inventory routes
    if (url.startsWith('/inventory')) {
      this.inventoryOpen = true;
    }
    // Auto-expand transfers submenu if on transfer routes
    if (url.startsWith('/transfer')) {
      this.transfersOpen = true;
    }
  }

  updateTime(): void {
    this.currentTime = new Date();
  }

  loadNotifications(userId: number): void {
    this.notificationService.getNotifications(userId).subscribe({
      next: (notifications) => {
        this.ngZone.run(() => {
          this.notifications = notifications;
          this.unreadCount = notifications.filter(n => !n.isRead).length;
        });
      },
      error: (err) => {
        console.error('Error loading notifications:', err);
      }
    });
  }

  ngAfterViewInit(): void {
    // Ensure change detection runs after view init
    this.cdr.detectChanges();
  }

  markAsRead(notificationId: number): void {
    this.notificationService.markAsRead(notificationId).subscribe({
      next: () => {
        const notification = this.notifications.find(n => n.notificationId === notificationId);
        if (notification) {
          notification.isRead = true;
          this.unreadCount = this.notifications.filter(n => !n.isRead).length;
        }
      },
      error: (err) => {
        console.error('Error marking notification as read:', err);
      }
    });
  }

  deleteNotification(notificationId: number): void {
    this.notificationService.deleteNotification(notificationId).subscribe({
      next: () => {
        this.notifications = this.notifications.filter(n => n.notificationId !== notificationId);
        this.unreadCount = this.notifications.filter(n => !n.isRead).length;
      },
      error: (err) => {
        console.error('Error deleting notification:', err);
      }
    });
  }

  openGoogleSheet(): void {
    window.open('https://docs.google.com/spreadsheets/d/1Y9SccKFiYAWz0mrAOT1e-T5Uv8FdPtjNqTOrOkMw7jw/edit?gid=0#gid=0', '_blank');
  }

  openAnalyzer(): void {
    window.open('https://intersoft-data-summaryteam.streamlit.app/#42466bca', '_blank');
  }

  logout(): void {
    sessionStorage.clear();
    this.router.navigate(['/login']);
  }

  loadCurrentUser(): void {
    const userId = this.authService.getUserId();
    if (userId) {
      this.userService.getAllUsers().subscribe({
        next: (users: User[]) => {
          this.currentUser = users.find((u: User) => u.userId === userId) || null;
          if (this.currentUser) {
            this.selfUpdateForm = {
              name: this.currentUser.name,
              phone: (this.currentUser as any).phone || 0,
              avatar_color: (this.currentUser as any).avatar_color || '',
              theme: (this.currentUser as any).theme || ''
            };
          }
        },
        error: (err: any) => {
          console.error('Error loading current user:', err);
        }
      });
    }
  }

  openSelfUpdateModal(): void {
    this.loadCurrentUser();
    this.showSelfUpdateModal = true;
    this.selfUpdateError = null;
    this.selfUpdateSuccessMessage = null;
  }

  closeSelfUpdateModal(): void {
    this.showSelfUpdateModal = false;
    this.selfUpdateError = null;
    this.selfUpdateSuccessMessage = null;
  }

  updateSelf(): void {
    this.updatingSelf = true;
    this.selfUpdateError = null;
    this.selfUpdateSuccessMessage = null;

    this.userService.selfUpdate(this.selfUpdateForm).subscribe({
      next: (updatedUser: User) => {
        this.updatingSelf = false;
        this.selfUpdateSuccessMessage = 'Profile updated successfully.';
        this.currentUser = updatedUser;
        this.userName = updatedUser.name;
        // Update session storage
        if (updatedUser.name) {
          sessionStorage.setItem('UserName', updatedUser.name);
        }
        setTimeout(() => {
          this.closeSelfUpdateModal();
        }, 1500);
      },
      error: (err: any) => {
        this.updatingSelf = false;
        this.selfUpdateError = err.error?.message || 'Failed to update profile.';
        console.error('Error updating profile:', err);
      }
    });
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  toggleInventory(): void {
    this.inventoryOpen = !this.inventoryOpen;
  }

  toggleTransfers(): void {
    this.transfersOpen = !this.transfersOpen;
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  openAddTaskModal(): void {
    this.showAddTaskModal = true;
    this.taskError = null;
    this.taskSuccessMessage = null;
    
    // Reset form
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const hours = String(today.getHours()).padStart(2, '0');
    const minutes = String(today.getMinutes()).padStart(2, '0');
    
    this.taskForm = {
      title: '',
      description: '',
      dueDate: `${year}-${month}-${day}T${hours}:${minutes}`,
      statusId: 0,
      priorityId: 0,
      projectId: 0,
      ids: '',
      fileName: '',
      filePath: ''
    };

    // Reset selections
    this.selectedUserIds = [];
    this.selectedFile = null;
    this.isDragging = false;
    this.uploadProgress = 0;

    // Load filters if not already loaded
    if (this.priorities.length === 0) {
      this.loadTaskFilters();
    }
  }

  closeAddTaskModal(): void {
    this.showAddTaskModal = false;
    this.taskForm = {
      title: '',
      description: '',
      dueDate: '',
      statusId: 0,
      priorityId: 0,
      projectId: 0,
      ids: '',
      fileName: '',
      filePath: ''
    };
    this.selectedUserIds = [];
    this.selectedFile = null;
    this.isDragging = false;
    this.uploadProgress = 0;
    this.taskError = null;
    this.taskSuccessMessage = null;
  }

  loadTaskFilters(): void {
    this.loadingTaskFilters = true;
    forkJoin({
      priorities: this.filterService.getPriorities(),
      projects: this.filterService.getProjects(),
      statuses: this.filterService.getStatuses(),
      users: this.filterService.getUsers()
    }).pipe(
      finalize(() => this.loadingTaskFilters = false)
    ).subscribe({
      next: (filters) => {
        this.priorities = filters.priorities;
        this.projects = filters.projects;
        this.statuses = filters.statuses;
        this.users = filters.users;
      },
      error: (err) => {
        console.error('Error loading task filters:', err);
      }
    });
  }

  createTask(): void {
    if (!this.validateTaskForm()) {
      return;
    }

    this.creatingTask = true;
    this.taskError = null;
    this.taskSuccessMessage = null;

    // Handle file upload first if file is selected
    if (this.selectedFile) {
      this.uploadFile().then(() => {
        this.submitTask();
      }).catch((err) => {
        this.taskError = 'Failed to upload file. Please try again.';
        this.creatingTask = false;
        console.error('Error uploading file:', err);
      });
    } else {
      this.submitTask();
    }
  }

  submitTask(): void {
    // Convert selected user IDs to comma-separated string
    const userIdsString = this.selectedUserIds.length > 0 
      ? this.selectedUserIds.join(',') 
      : '';

    // Convert datetime-local format to ISO string
    const taskToSend: CreateTaskRequest = {
      ...this.taskForm,
      dueDate: new Date(this.taskForm.dueDate).toISOString(),
      ids: userIdsString,
      fileName: this.selectedFile?.name || this.taskForm.fileName || '',
      filePath: this.taskForm.filePath || ''
    };

    this.taskService.createTask(taskToSend).pipe(
      finalize(() => this.creatingTask = false)
    ).subscribe({
      next: () => {
        this.taskSuccessMessage = 'Task created successfully.';
        // Reload current page if on tasks page, otherwise just close modal
        setTimeout(() => {
          if (this.router.url === '/tasks') {
            window.location.reload(); // Simple way to refresh tasks list
          }
          this.closeAddTaskModal();
        }, 1500);
      },
      error: (err) => {
        this.taskError = err.error?.message || 'Failed to create task.';
        console.error('Error creating task:', err);
      }
    });
  }

  uploadFile(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.selectedFile) {
        resolve();
        return;
      }

      // For now, we'll use a simple approach: create a file path
      // In a real application, you'd upload to a server and get the path back
      const reader = new FileReader();
      reader.onload = () => {
        // Simulate file upload - in production, upload to server
        // For now, we'll use a local path format
        const timestamp = new Date().getTime();
        this.taskForm.filePath = `/uploads/tasks/${timestamp}_${this.selectedFile!.name}`;
        this.taskForm.fileName = this.selectedFile!.name;
        this.uploadProgress = 100;
        resolve();
      };
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      reader.readAsDataURL(this.selectedFile);
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.taskForm.fileName = this.selectedFile.name;
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.selectedFile = event.dataTransfer.files[0];
      this.taskForm.fileName = this.selectedFile.name;
    }
  }

  removeFile(): void {
    this.selectedFile = null;
    this.taskForm.fileName = '';
    this.taskForm.filePath = '';
  }

  toggleUserSelection(userId: number): void {
    const index = this.selectedUserIds.indexOf(userId);
    if (index > -1) {
      this.selectedUserIds.splice(index, 1);
    } else {
      this.selectedUserIds.push(userId);
    }
  }

  isUserSelected(userId: number): boolean {
    return this.selectedUserIds.includes(userId);
  }

  validateTaskForm(): boolean {
    if (!this.taskForm.title) {
      this.taskError = 'Title is required.';
      return false;
    }
    if (!this.taskForm.dueDate) {
      this.taskError = 'Due Date is required.';
      return false;
    }
    if (this.taskForm.statusId <= 0) {
      this.taskError = 'Please select a status.';
      return false;
    }
    if (this.taskForm.priorityId <= 0) {
      this.taskError = 'Please select a priority.';
      return false;
    }
    if (this.taskForm.projectId <= 0) {
      this.taskError = 'Please select a project.';
      return false;
    }
    return true;
  }
}

