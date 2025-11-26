import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../services/task.service';
import { Task } from '../../models/task.model';
import { AuthService } from '../../services/auth.service';
import { FilterService } from '../../services/filter.service';
import { Priority, Project, Status } from '../../models/filter.model';
import { TaskQueryParams } from '../../models/request.model';
import { finalize, forkJoin, switchMap } from 'rxjs';

@Component({
  selector: 'app-my-tasks',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule],
  templateUrl: './my-tasks.component.html',
  styleUrls: ['./my-tasks.component.css']
})
export class MyTasksComponent implements OnInit {
  tasks: Task[] = [];
  loading = true;
  error: string | null = null;
  filteredTasks: Task[] = [];
  paginatedTasks: Task[] = [];
  
  // Filter values - matching All Tasks page structure
  fromDate: string = '';
  toDate: string = '';
  title: string = '';
  statusId: number | null = null;
  priorityId: number | null = null;
  projectId: number | null = null;
  
  userName: string | null = null;
  userId: number | null = null;
  
  // Track if filters have been modified from default
  private filtersModified = false;

  // Pagination
  currentPage: number = 1;
  itemsPerPage: number = 5;
  totalPages: number = 0;

  // Filter options from API
  priorities: Priority[] = [];
  projects: Project[] = [];
  statuses: Status[] = [];
  loadingFilters = true;

  constructor(
    private taskService: TaskService,
    private authService: AuthService,
    private filterService: FilterService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.userName = this.authService.getUserName();
    
    // Set default date filters to today
    this.setDefaultDateFilters();
    this.loadFilters();
    
    // Get session first to get userId, then load tasks
    this.loadSessionAndTasks();
  }

  loadSessionAndTasks(): void {
    this.loading = true;
    this.error = null;
    
    // Try to get userId from sessionStorage first as fallback
    const fallbackUserId = this.authService.getUserId();
    
    // Call /api/Auth/session to get current user session data
    this.authService.getSession().pipe(
      switchMap(sessionResponse => {
        // Extract userId from session response
        this.userId = sessionResponse.userId ?? sessionResponse.UserId ?? fallbackUserId;
        this.userName = sessionResponse.name ?? sessionResponse.Name ?? this.userName;
        
        if (!this.userId) {
          throw new Error('User ID not found in session. Please log in again.');
        }
        
        console.log('MyTasksComponent: Session loaded, userId:', this.userId);
        
        // Now load tasks with the userId from session
        return this.loadTasksWithUserId(this.userId);
      }),
      finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (tasks) => {
        this.processTasks(tasks);
      },
      error: (err) => {
        console.error('Error loading session:', err);
        
        // Fallback: Use userId from sessionStorage if session endpoint fails
        if (fallbackUserId) {
          console.log('MyTasksComponent: Falling back to sessionStorage userId:', fallbackUserId);
          this.userId = fallbackUserId;
          this.loadTasksWithUserId(fallbackUserId).subscribe({
            next: (tasks) => {
              this.processTasks(tasks);
              this.loading = false;
              this.cdr.detectChanges();
            },
            error: (taskErr) => {
              this.error = 'Failed to load tasks. Please try again.';
              console.error('Error loading tasks:', taskErr);
              this.tasks = [];
              this.filteredTasks = [];
              this.paginatedTasks = [];
              this.loading = false;
              this.cdr.detectChanges();
            }
          });
        } else {
          this.error = 'User ID not found. Please log in again.';
          this.tasks = [];
          this.filteredTasks = [];
          this.paginatedTasks = [];
          this.loading = false;
          this.cdr.detectChanges();
        }
      }
    });
  }

  private processTasks(tasks: Task[]): void {
    // Tasks are already filtered by userId from the API
    let allTasks = tasks || [];
    
    // Sort: Today's tasks first, then by due date (ascending), then by creation date (descending)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    allTasks.sort((a, b) => {
      // Check if due date is today
      const dueDateA = a.dueDate ? new Date(a.dueDate) : null;
      const dueDateB = b.dueDate ? new Date(b.dueDate) : null;
      
      if (dueDateA && dueDateB) {
        dueDateA.setHours(0, 0, 0, 0);
        dueDateB.setHours(0, 0, 0, 0);
        
        const isTodayA = dueDateA.getTime() === today.getTime();
        const isTodayB = dueDateB.getTime() === today.getTime();
        
        // Today's tasks first
        if (isTodayA && !isTodayB) return -1;
        if (!isTodayA && isTodayB) return 1;
        
        // Then sort by due date (ascending - earliest first)
        if (dueDateA.getTime() !== dueDateB.getTime()) {
          return dueDateA.getTime() - dueDateB.getTime();
        }
      }
      
      // Finally sort by creation date (newest first)
      const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return createdB - createdA;
    });
    
    this.tasks = allTasks;
    this.applyFilters();
    
    console.log('MyTasksComponent: Tasks loaded from API with userId:', this.userId);
    console.log('MyTasksComponent: Total tasks:', allTasks.length);
    console.log('MyTasksComponent: Filtered tasks:', this.filteredTasks.length);
    console.log('MyTasksComponent: Current user name:', this.userName);
    console.log('MyTasksComponent: Current user ID:', this.userId);
  }

  private setDefaultDateFilters(): void {
    if (!this.filtersModified) {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      
      // Set fromDate and toDate to today (format: YYYY-MM-DD)
      this.fromDate = `${year}-${month}-${day}`;
      this.toDate = `${year}-${month}-${day}`;
    }
  }

  loadFilters(): void {
    this.loadingFilters = true;
    forkJoin({
      priorities: this.filterService.getPriorities(),
      projects: this.filterService.getProjects(),
      statuses: this.filterService.getStatuses()
    }).pipe(
      finalize(() => this.loadingFilters = false)
    ).subscribe({
      next: (filters) => {
        this.priorities = filters.priorities;
        this.projects = filters.projects;
        this.statuses = filters.statuses;
      },
      error: (err) => {
        console.error('Error loading filters:', err);
      }
    });
  }

  private loadTasksWithUserId(userId: number) {
    // Build query parameters - include userId from session
    const params: TaskQueryParams = {
      userId: userId
    };
    
    // Add other filters if they are set
    if (this.fromDate && this.fromDate.trim()) {
      params.fromDate = this.fromDate.trim();
    }
    if (this.toDate && this.toDate.trim()) {
      params.toDate = this.toDate.trim();
    }
    if (this.title && this.title.trim()) {
      params.title = this.title.trim();
    }
    if (this.statusId !== null && this.statusId !== 0) {
      params.statusId = this.statusId;
    }
    if (this.priorityId !== null && this.priorityId !== 0) {
      params.priorityId = this.priorityId;
    }
    if (this.projectId !== null && this.projectId !== 0) {
      params.projectId = this.projectId;
    }
    
    return this.taskService.getAllTasks(params).pipe(
      finalize(() => {
        this.cdr.detectChanges();
      })
    );
  }

  loadTasks(): void {
    if (!this.userId) {
      // If userId is not set, get it from session first
      this.loadSessionAndTasks();
      return;
    }
    
    this.loading = true;
    this.error = null;
    
    this.loadTasksWithUserId(this.userId).subscribe({
      next: (tasks) => {
        // Tasks are already filtered by userId from the API
        let allTasks = tasks || [];
        
        // Sort: Today's tasks first, then by due date (ascending), then by creation date (descending)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        allTasks.sort((a, b) => {
          // Check if due date is today
          const dueDateA = a.dueDate ? new Date(a.dueDate) : null;
          const dueDateB = b.dueDate ? new Date(b.dueDate) : null;
          
          if (dueDateA && dueDateB) {
            dueDateA.setHours(0, 0, 0, 0);
            dueDateB.setHours(0, 0, 0, 0);
            
            const isTodayA = dueDateA.getTime() === today.getTime();
            const isTodayB = dueDateB.getTime() === today.getTime();
            
            // Today's tasks first
            if (isTodayA && !isTodayB) return -1;
            if (!isTodayA && isTodayB) return 1;
            
            // Then sort by due date (ascending - earliest first)
            if (dueDateA.getTime() !== dueDateB.getTime()) {
              return dueDateA.getTime() - dueDateB.getTime();
            }
          }
          
          // Finally sort by creation date (newest first)
          const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return createdB - createdA;
        });
        
        this.tasks = allTasks;
        this.applyFilters();
        
        console.log('MyTasksComponent: Tasks loaded from API with userId:', this.userId);
        console.log('MyTasksComponent: Total tasks:', allTasks.length);
        console.log('MyTasksComponent: Filtered tasks:', this.filteredTasks.length);
        console.log('MyTasksComponent: Current user name:', this.userName);
        console.log('MyTasksComponent: Current user ID:', this.userId);
        
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = 'Failed to load tasks. Please try again.';
        console.error('Error loading tasks:', err);
        this.tasks = [];
        this.filteredTasks = [];
        this.paginatedTasks = [];
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  applyFilters(): void {
    // Since we're using server-side filtering, filteredTasks = tasks
    // The server already filters by userId and other parameters
    this.filteredTasks = [...this.tasks];
    
    // Reset to page 1 when filters change
    this.currentPage = 1;
    this.updatePagination();
  }

  onFilterChange(): void {
    this.filtersModified = true;
    this.currentPage = 1;
    this.loadTasks();
  }

  clearFilters(): void {
    this.fromDate = '';
    this.toDate = '';
    this.title = '';
    this.statusId = null;
    this.priorityId = null;
    this.projectId = null;
    this.filtersModified = false;
    this.setDefaultDateFilters();
    this.onFilterChange();
  }

  updatePagination(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedTasks = this.filteredTasks.slice(startIndex, endIndex);
    this.totalPages = Math.ceil(this.filteredTasks.length / this.itemsPerPage);
    
    // Reset to page 1 if current page is out of bounds
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = 1;
      this.updatePagination();
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
    }
  }

  getPageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  getStartIndex(): number {
    return this.filteredTasks.length === 0 ? 0 : (this.currentPage - 1) * this.itemsPerPage + 1;
  }

  getEndIndex(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.filteredTasks.length);
  }

  getVisiblePageNumbers(): (number | string)[] {
    const total = this.totalPages;
    const current = this.currentPage;

    // If 6 or fewer pages, show all
    if (total <= 6) {
      return this.getPageNumbers();
    }

    const pages: (number | string)[] = [];

    // Always show first 3 pages
    pages.push(1);
    pages.push(2);
    pages.push(3);

    // Determine if we need ellipsis and what to show in the middle
    const showFirstEllipsis = current > 4;
    const showLastEllipsis = current < total - 3;

    if (showFirstEllipsis && showLastEllipsis) {
      // In the middle: 1 2 3 ... (current-1) current (current+1) ... (total-2) (total-1) total
      pages.push('...');
      pages.push(current - 1);
      pages.push(current);
      pages.push(current + 1);
      pages.push('...');
    } else if (showFirstEllipsis) {
      // Near the end: 1 2 3 ... (total-3) (total-2) (total-1) total
      pages.push('...');
      pages.push(total - 2);
      pages.push(total - 1);
      pages.push(total);
    } else {
      // Near the beginning: 1 2 3 4 ... (total-2) (total-1) total
      if (current === 4) {
        pages.push(4);
      }
      pages.push('...');
      pages.push(total - 2);
      pages.push(total - 1);
      pages.push(total);
    }

    // Remove duplicates while preserving order
    const result: (number | string)[] = [];
    const seen = new Set<number | string>();
    
    for (const page of pages) {
      if (!seen.has(page)) {
        seen.add(page);
        result.push(page);
      }
    }

    return result;
  }

  isCurrentPage(page: number | string): boolean {
    return typeof page === 'number' && page === this.currentPage;
  }

  handlePageClick(page: number | string): void {
    if (typeof page === 'number') {
      this.goToPage(page);
    }
  }

  isToday(dateString: string | null | undefined): boolean {
    if (!dateString) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const itemDate = new Date(dateString);
    itemDate.setHours(0, 0, 0, 0);
    return itemDate.getTime() === today.getTime();
  }

  formatDate(dateString: string | null | undefined): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

}

