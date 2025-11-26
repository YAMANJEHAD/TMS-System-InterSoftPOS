import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../services/task.service';
import { Task } from '../../models/task.model';
import { FilterService } from '../../services/filter.service';
import { Priority, Project, Status, User } from '../../models/filter.model';
import { TaskQueryParams } from '../../models/request.model';
import { finalize, forkJoin, debounceTime, distinctUntilChanged, Subject } from 'rxjs';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule],
  templateUrl: './tasks.component.html',
  styleUrls: ['./tasks.component.css']
})
export class TasksComponent implements OnInit {
  tasks: Task[] = [];
  loading = true;
  error: string | null = null;

  // Filter values - Set default to today's date
  fromDate: string = '';
  toDate: string = '';
  title: string = '';
  statusId: number | null = null;
  priorityId: number | null = null;
  projectId: number | null = null;
  userId: number | null = null;
  
  // Track if filters have been modified from default
  private filtersModified = false;

  // Filter options from API
  priorities: Priority[] = [];
  projects: Project[] = [];
  statuses: Status[] = [];
  users: User[] = [];
  loadingFilters = true;

  private searchSubject = new Subject<string>();

  constructor(
    private taskService: TaskService,
    private filterService: FilterService,
    private cdr: ChangeDetectorRef
  ) {
    // Debounce search input
    this.searchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe(() => {
      this.loadTasks();
    });
  }

  ngOnInit(): void {
    // Set default date filters to today
    this.setDefaultDateFilters();
    this.loadFilters();
    this.loadTasks();
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
      statuses: this.filterService.getStatuses(),
      users: this.filterService.getUsers()
    }).pipe(
      finalize(() => this.loadingFilters = false)
    ).subscribe({
      next: (filters) => {
        this.priorities = filters.priorities;
        this.projects = filters.projects;
        this.statuses = filters.statuses;
        this.users = filters.users;
      },
      error: (err) => {
        console.error('Error loading filters:', err);
      }
    });
  }

  loadTasks(): void {
    this.loading = true;
    this.error = null;
    
    const params: TaskQueryParams = {};
    
    if (this.fromDate && this.fromDate.trim()) {
      params.fromDate = this.fromDate.trim();
    }
    if (this.toDate && this.toDate.trim()) {
      params.toDate = this.toDate.trim();
    }
    if (this.title && this.title.trim()) {
      params.title = this.title.trim();
    }
    if (this.statusId !== null && this.statusId !== undefined && this.statusId !== 0) {
      params.statusId = this.statusId;
    }
    if (this.priorityId !== null && this.priorityId !== undefined && this.priorityId !== 0) {
      params.priorityId = this.priorityId;
    }
    if (this.projectId !== null && this.projectId !== undefined && this.projectId !== 0) {
      params.projectId = this.projectId;
    }
    if (this.userId !== null && this.userId !== undefined && this.userId !== 0) {
      params.userId = this.userId;
    }
    
    this.taskService.getAllTasks(params).pipe(
      finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (tasks) => {
        let filteredTasks = tasks || [];
        
        // If no filters are modified (default state), show only last 10 tasks from today
        if (!this.filtersModified && !this.title && 
            this.statusId === null && this.priorityId === null && 
            this.projectId === null && this.userId === null) {
          // Sort by creation date (most recent first) and take first 10
          filteredTasks = filteredTasks
            .sort((a, b) => {
              const dateA = new Date(a.createdAt || a.dueDate || 0).getTime();
              const dateB = new Date(b.createdAt || b.dueDate || 0).getTime();
              return dateB - dateA; // Descending order (newest first)
            })
            .slice(0, 10);
        }
        
        this.tasks = filteredTasks;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = 'Failed to load tasks. Please try again.';
        console.error('Error loading tasks:', err);
        this.tasks = [];
        this.cdr.detectChanges();
      }
    });
  }

  onSearchChange(): void {
    this.filtersModified = true;
    this.searchSubject.next(this.title);
  }

  onFilterChange(): void {
    this.filtersModified = true;
    this.loadTasks();
  }

  clearFilters(): void {
    this.filtersModified = false;
    this.fromDate = '';
    this.toDate = '';
    this.title = '';
    this.statusId = null;
    this.priorityId = null;
    this.projectId = null;
    this.userId = null;
    // Reset to default (today's date)
    this.setDefaultDateFilters();
    this.loadTasks();
  }
}

