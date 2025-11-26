import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TaskService } from '../../services/task.service';
import { FilterService } from '../../services/filter.service';
import { AuthService } from '../../services/auth.service';
import { CreateTaskRequest } from '../../models/request.model';
import { Priority, Project, Status } from '../../models/filter.model';
import { finalize, forkJoin } from 'rxjs';

@Component({
  selector: 'app-add-task',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-task.component.html',
  styleUrls: ['./add-task.component.css']
})
export class AddTaskComponent implements OnInit {
  formData: CreateTaskRequest = {
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
  loading = false;
  error: string | null = null;
  successMessage: string | null = null;

  // Filter options
  priorities: Priority[] = [];
  projects: Project[] = [];
  statuses: Status[] = [];
  loadingFilters = true;

  constructor(
    private taskService: TaskService,
    private filterService: FilterService,
    private authService: AuthService,
    public router: Router
  ) {}

  ngOnInit(): void {
    // Check if user is logged in
    const userName = this.authService.getUserName();
    if (!userName) {
      console.log('AddTaskComponent: No user session found, redirecting to login');
      this.router.navigate(['/login']);
      return;
    }

    this.loadFilters();
    // Set default due date to today
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const hours = String(today.getHours()).padStart(2, '0');
    const minutes = String(today.getMinutes()).padStart(2, '0');
    this.formData.dueDate = `${year}-${month}-${day}T${hours}:${minutes}`;
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

  onSubmit(): void {
    if (!this.validateForm()) {
      return;
    }

    this.loading = true;
    this.error = null;
    this.successMessage = null;

    // Convert datetime-local format to ISO string
    const taskToSend: CreateTaskRequest = {
      ...this.formData,
      dueDate: new Date(this.formData.dueDate).toISOString()
    };

    this.taskService.createTask(taskToSend).pipe(
      finalize(() => this.loading = false)
    ).subscribe({
      next: () => {
        this.successMessage = 'Task created successfully.';
        setTimeout(() => {
          this.router.navigate(['/tasks']);
        }, 1500);
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to create task.';
        console.error('Error creating task:', err);
      }
    });
  }

  validateForm(): boolean {
    if (!this.formData.title) {
      this.error = 'Title is required.';
      return false;
    }
    if (!this.formData.dueDate) {
      this.error = 'Due Date is required.';
      return false;
    }
    if (this.formData.statusId <= 0) {
      this.error = 'Please select a status.';
      return false;
    }
    if (this.formData.priorityId <= 0) {
      this.error = 'Please select a priority.';
      return false;
    }
    if (this.formData.projectId <= 0) {
      this.error = 'Please select a project.';
      return false;
    }
    return true;
  }

  dismissError(): void {
    this.error = null;
  }

  dismissSuccess(): void {
    this.successMessage = null;
  }
}

