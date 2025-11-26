import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timeout, catchError, throwError } from 'rxjs';

export interface DashboardData {
  [key: string]: any;  // allow indexing by dynamic key in template
  totalTasks: number;
  completedTasks: number;
  onHoldTasks: number;
  underProcessTasks: number;
  unassignedTasks: number;
  overdueTasks: number;
  totalUsers: number;
  activeUsers: number;
  totalProjects: number;
  highPriorityTasks: number;
  recentTasks: number;
  completionRate: number;
  completionTrend: number;
  lastWeekCompleted: number;
  previousWeekCompleted: number;
  projectCounts: Array<{ name?: string; count?: number; Name?: string; Count?: number }>;
  taskCountsByDate: Array<{ dueDate?: string; taskCount?: number; DueDate?: string; TaskCount?: number; due_date?: string }>;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private apiUrl = '/api/Dashboard';
  private timeoutMs = 10000; // 10 seconds timeout

  constructor(private http: HttpClient) {}

  getDashboard(): Observable<DashboardData> {
    console.log('DashboardService: Making request to', this.apiUrl);
    return this.http.get<DashboardData>(this.apiUrl, { withCredentials: true }).pipe(
      timeout(this.timeoutMs),
      catchError(error => {
        console.error('DashboardService: Request error', error);
        if (error.name === 'TimeoutError') {
          return throwError(() => ({ 
            status: 0, 
            message: 'Request timed out. Please check if the backend server is running at https://localhost:49714' 
          }));
        }
        return throwError(() => error);
      })
    );
  }
}
