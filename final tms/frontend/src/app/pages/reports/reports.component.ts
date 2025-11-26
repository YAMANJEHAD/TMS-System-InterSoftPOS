import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportService } from '../../services/report.service';
import { FilterService } from '../../services/filter.service';
import { ReportResponse, ReportQueryParams, ProjectReport, UserReport } from '../../models/report.model';
import { User } from '../../models/filter.model';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.css']
})
export class ReportsComponent implements OnInit {
  reportData: ReportResponse | null = null;
  projects: ProjectReport[] = [];
  users: UserReport[] = [];
  loading = true;
  error: string | null = null;

  // Filter parameters
  filters: ReportQueryParams = {
    startDate: '',
    endDate: ''
  };

  // Users lookup for display
  usersLookup: Map<number, string> = new Map();
  allUsers: User[] = [];

  constructor(
    private reportService: ReportService,
    private filterService: FilterService
  ) {}

  ngOnInit(): void {
    // Set default date filters to today
    this.setDefaultDateFilters();
    this.loadUsers();
    this.loadReports();
  }

  private setDefaultDateFilters(): void {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    
    // Set startDate and endDate to today (format: YYYY-MM-DD)
    this.filters.startDate = `${year}-${month}-${day}`;
    this.filters.endDate = `${year}-${month}-${day}`;
  }

  loadUsers(): void {
    this.filterService.getUsers().subscribe({
      next: (users) => {
        this.allUsers = users;
        // Create lookup map for user names
        users.forEach(user => {
          this.usersLookup.set(user.userId, user.name);
        });
      },
      error: (err) => {
        console.error('Error loading users:', err);
      }
    });
  }

  loadReports(): void {
    this.loading = true;
    this.error = null;
    
    // Build query params (only include non-empty values)
    const params: ReportQueryParams = {};
    if (this.filters.startDate) {
      params.startDate = new Date(this.filters.startDate).toISOString();
    }
    if (this.filters.endDate) {
      // Set end date to end of day
      const endDate = new Date(this.filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      params.endDate = endDate.toISOString();
    }

    this.reportService.getAllReports(Object.keys(params).length > 0 ? params : undefined).pipe(
      finalize(() => this.loading = false)
    ).subscribe({
      next: (data) => {
        this.reportData = data;
        this.projects = data.projects || [];
        this.users = data.users || [];
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to load reports.';
        console.error('Error:', err);
      }
    });
  }

  applyFilters(): void {
    this.loadReports();
  }

  clearFilters(): void {
    // Reset to today's date
    this.setDefaultDateFilters();
    this.loadReports();
  }

  getUserName(userId: number): string {
    return this.usersLookup.get(userId) || `User ${userId}`;
  }

  getTotalInventoryCount(): number {
    return this.users.reduce((sum, user) => sum + user.inventoryCount, 0);
  }

  getTotalTransferCount(): number {
    return this.users.reduce((sum, user) => sum + user.transferCount, 0);
  }

  getTotalTasks(): number {
    return this.projects.reduce((sum, project) => sum + project.totalTasks, 0);
  }

  getTotalCompletedTasks(): number {
    return this.projects.reduce((sum, project) => sum + project.completedTasks, 0);
  }

  getTotalOnHoldTasks(): number {
    return this.projects.reduce((sum, project) => sum + project.onHoldTasks, 0);
  }

  getTotalUnderProcessTasks(): number {
    return this.projects.reduce((sum, project) => sum + project.underProcessTasks, 0);
  }
}

