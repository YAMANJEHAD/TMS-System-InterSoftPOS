import { Component, OnInit, ChangeDetectorRef, NgZone, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartData, ChartOptions, Chart, registerables } from 'chart.js';
import { HttpService } from '../../../services/http.service';
import { SessionService } from '../../../services/session.service';
import { ThemeService } from '../../../services/theme.service';
import { API_CONFIG } from '../../../config/api.config';
import { ChartColorsUtil } from '../../../utils/chart-colors.util';
import { Subscription } from 'rxjs';

// Register Chart.js components
Chart.register(...registerables);

interface DashboardStats {
  totalTasks?: number;
  completedTasks?: number;
  onHoldTasks?: number;
  underProcessTasks?: number;
  unassignedTasks?: number;
  overdueTasks?: number;
  totalUsers?: number;
  activeUsers?: number;
  totalProjects?: number;
  recentTasks?: number;
  highPriorityTasks?: number;
  completionRate?: number;
  completionTrend?: number;
  lastWeekCompleted?: number;
  previousWeekCompleted?: number;
  projectCounts?: Array<{ name?: string; Name?: string; count?: number; Count?: number }>;
  taskCountsByDate?: Array<{ dueDate?: string; DueDate?: string; taskCount?: number; TaskCount?: number }>;
  // PascalCase versions (in case backend returns PascalCase)
  TotalTasks?: number;
  CompletedTasks?: number;
  OnHoldTasks?: number;
  UnderProcessTasks?: number;
  UnassignedTasks?: number;
  OverdueTasks?: number;
  TotalUsers?: number;
  ActiveUsers?: number;
  TotalProjects?: number;
  RecentTasks?: number;
  HighPriorityTasks?: number;
  CompletionRate?: number;
  CompletionTrend?: number;
  LastWeekCompleted?: number;
  PreviousWeekCompleted?: number;
  ProjectCounts?: Array<{ name?: string; Name?: string; count?: number; Count?: number }>;
  TaskCountsByDate?: Array<{ dueDate?: string; DueDate?: string; taskCount?: number; TaskCount?: number }>;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, DatePipe, BaseChartDirective],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class DashboardComponent implements OnInit, OnDestroy {
  stats: DashboardStats | null = null;
  isLoading = true;
  errorMessage = '';
  private themeSubscription?: Subscription;

  // Project Counts Chart (Donut Chart)
  projectChartData: ChartData<'doughnut'> = {
    labels: [],
    datasets: [{
      label: 'Task Count',
      data: [],
      backgroundColor: [
        '#0A1A3A', // Navy Blue
        '#FFC107', // Amber
        '#FF9800', // Orange
        '#2196F3', // Blue
        '#4CAF50', // Green
        '#9C27B0', // Purple
        '#F44336', // Red
        '#00BCD4', // Cyan
        '#FF5722', // Deep Orange
        '#673AB7', // Deep Purple
        '#E91E63', // Pink
        '#009688', // Teal
        '#3F51B5', // Indigo
        '#795548', // Brown
        '#607D8B'  // Blue Grey
      ],
      borderColor: '#ffffff',
      borderWidth: 3
    }]
  };
  projectChartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '60%', // Makes it a donut chart (60% inner radius)
    plugins: {
      legend: {
        display: true,
        position: 'right'
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  };

  // Task Counts by Date Chart
  taskDateChartData: ChartData<'line'> = {
    labels: [],
    datasets: [{
      label: 'Tasks',
      data: [],
      borderColor: '#FFC107',
      backgroundColor: 'rgba(255, 193, 7, 0.1)',
      tension: 0.4,
      fill: true
    }]
  };
  taskDateChartOptions: ChartOptions<'line'> = {
    responsive: true,
    plugins: {
      legend: {
        display: true
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  constructor(
    private httpService: HttpService,
    private sessionService: SessionService,
    private themeService: ThemeService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    if (!this.sessionService.hasPermission('GetDashboardStats')) {
      this.errorMessage = 'You do not have permission to view the dashboard';
      this.isLoading = false;
      return;
    }

    // Subscribe to theme changes
    this.themeSubscription = this.themeService.effectiveTheme$.subscribe(() => {
      if (this.stats) {
        this.updateCharts(this.stats);
      }
    });

    this.loadDashboardStats();
  }
  
  ngOnDestroy(): void {
    if (this.themeSubscription) {
      this.themeSubscription.unsubscribe();
    }
  }

  loadDashboardStats(): void {
    this.isLoading = true;
    this.httpService.get<DashboardStats>(API_CONFIG.ENDPOINTS.DASHBOARD).subscribe({
      next: (data) => {
        // Run inside Angular zone to ensure change detection
        this.ngZone.run(() => {
          // Create new object reference for change detection
          this.stats = { ...data };
          // Ensure arrays are new references
          if (data.projectCounts) {
            this.stats.projectCounts = [...data.projectCounts];
          }
          if (data.ProjectCounts) {
            this.stats.ProjectCounts = [...data.ProjectCounts];
          }
          if (data.taskCountsByDate) {
            this.stats.taskCountsByDate = [...data.taskCountsByDate];
          }
          if (data.TaskCountsByDate) {
            this.stats.TaskCountsByDate = [...data.TaskCountsByDate];
          }
          this.updateCharts(this.stats);
          this.isLoading = false;
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        });
      },
      error: (error) => {
        this.ngZone.run(() => {
          this.errorMessage = 'Failed to load dashboard data';
          this.isLoading = false;
          console.error('Dashboard error:', error);
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        });
      }
    });
  }

  updateCharts(data: DashboardStats): void {
    // Handle both camelCase and PascalCase property names
    const projectCounts = data.projectCounts || data.ProjectCounts || [];
    const taskCountsByDate = data.taskCountsByDate || data.TaskCountsByDate || [];

    // Update Project Counts Chart (Donut Chart)
    if (projectCounts && projectCounts.length > 0) {
      const projectLabels = projectCounts.map(p => {
        const name = p.name || p.Name || 'Unnamed';
        return name;
      });
      const projectCountsData = projectCounts.map(p => p.count || p.Count || 0);
      
      // Get theme-aware colors
      const chartColors = ChartColorsUtil.getChartColors(this.themeService);
      const backgroundColor = projectLabels.map((_, index) => 
        ChartColorsUtil.getPaletteColor(index, this.themeService)
      );
      
      // Create new object reference for change detection
      this.projectChartData = {
        labels: [...projectLabels],
        datasets: [{
          label: 'Task Count',
          data: [...projectCountsData],
          backgroundColor: [...backgroundColor],
          borderColor: chartColors.borderColor,
          borderWidth: 3
        }]
      };
      
      // Update chart options with theme colors
      this.projectChartOptions = {
        ...this.projectChartOptions,
        plugins: {
          ...this.projectChartOptions.plugins,
          legend: {
            ...this.projectChartOptions.plugins?.legend,
            labels: {
              color: chartColors.primary
            }
          }
        }
      };
      
      // Force chart update
      this.cdr.markForCheck();
    } else {
      // Show empty state
      const chartColors = ChartColorsUtil.getChartColors(this.themeService);
      this.projectChartData = {
        labels: ['No Data'],
        datasets: [{
          label: 'Task Count',
          data: [0],
          backgroundColor: [chartColors.primary],
          borderColor: chartColors.borderColor,
          borderWidth: 3
        }]
      };
      
      // Update chart options with theme colors
      this.projectChartOptions = {
        ...this.projectChartOptions,
        plugins: {
          ...this.projectChartOptions.plugins,
          legend: {
            ...this.projectChartOptions.plugins?.legend,
            labels: {
              color: chartColors.primary
            }
          }
        }
      };
    }

    // Update Task Counts by Date Chart
    if (taskCountsByDate && taskCountsByDate.length > 0) {
      const sortedDates = [...taskCountsByDate].sort((a, b) => {
        const dateA = a.dueDate || a.DueDate || '';
        const dateB = b.dueDate || b.DueDate || '';
        return new Date(dateA).getTime() - new Date(dateB).getTime();
      });
      
      const dateLabels = sortedDates.map(d => {
        const dateStr = d.dueDate || d.DueDate || '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      });
      const taskCounts = sortedDates.map(d => d.taskCount || d.TaskCount || 0);
      
      // Get theme-aware colors
      const chartColors = ChartColorsUtil.getChartColors(this.themeService);
      
      // Create new object reference for change detection
      this.taskDateChartData = {
        labels: [...dateLabels],
        datasets: [{
          label: 'Tasks',
          data: [...taskCounts],
          borderColor: chartColors.accent,
          backgroundColor: chartColors.backgroundColor,
          tension: 0.4,
          fill: true
        }]
      };
      
      // Update chart options with theme colors
      this.taskDateChartOptions = {
        ...this.taskDateChartOptions,
        plugins: {
          ...this.taskDateChartOptions.plugins,
          legend: {
            ...this.taskDateChartOptions.plugins?.legend,
            labels: {
              color: chartColors.primary
            }
          }
        },
        scales: {
          ...this.taskDateChartOptions.scales,
          x: {
            ...this.taskDateChartOptions.scales?.['x'],
            ticks: { color: chartColors.primary },
            grid: { color: chartColors.borderColor }
          },
          y: {
            ...this.taskDateChartOptions.scales?.['y'],
            ticks: { color: chartColors.primary },
            grid: { color: chartColors.borderColor }
          }
        }
      };
      
      // Force chart update
      this.cdr.markForCheck();
    } else {
      // Show empty state
      const chartColors = ChartColorsUtil.getChartColors(this.themeService);
      this.taskDateChartData = {
        labels: ['No Data'],
        datasets: [{
          label: 'Tasks',
          data: [0],
          borderColor: chartColors.accent,
          backgroundColor: chartColors.backgroundColor,
          tension: 0.4,
          fill: true
        }]
      };
      
      // Update chart options with theme colors
      this.taskDateChartOptions = {
        ...this.taskDateChartOptions,
        plugins: {
          ...this.taskDateChartOptions.plugins,
          legend: {
            ...this.taskDateChartOptions.plugins?.legend,
            labels: {
              color: chartColors.primary
            }
          }
        },
        scales: {
          ...this.taskDateChartOptions.scales,
          x: {
            ...this.taskDateChartOptions.scales?.['x'],
            ticks: { color: chartColors.primary },
            grid: { color: chartColors.borderColor }
          },
          y: {
            ...this.taskDateChartOptions.scales?.['y'],
            ticks: { color: chartColors.primary },
            grid: { color: chartColors.borderColor }
          }
        }
      };
    }
  }
}
