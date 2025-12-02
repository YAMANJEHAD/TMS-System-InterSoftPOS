import { Component, OnInit, ChangeDetectorRef, OnDestroy, NgZone } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { ChartData, ChartOptions, Chart, registerables } from 'chart.js';
import { HttpService } from '../../../services/http.service';
import { SessionService } from '../../../services/session.service';
import { ThemeService } from '../../../services/theme.service';
import { UserService } from '../../../services/user.service';
import { API_CONFIG } from '../../../config/api.config';
import { DateUtil } from '../../../utils/date.util';
import { ChartColorsUtil } from '../../../utils/chart-colors.util';
import { UserAvatarUtil } from '../../../utils/user-avatar.util';
import { BreadcrumbComponent } from '../../components/breadcrumb/breadcrumb';
import { Subscription } from 'rxjs';

// Register Chart.js components
Chart.register(...registerables);

interface ProjectSummary {
  projectName: string;
  totalTasks: number;
  completedTasks: number;
  onHoldTasks: number;
  underProcessTasks: number;
}

interface UserPerformance {
  userId: number;
  inventoryCount: number;
  transferCount: number;
}

interface ReportsData {
  projects: ProjectSummary[];
  users: UserPerformance[];
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, BaseChartDirective, BreadcrumbComponent],
  templateUrl: './reports.html',
  styleUrl: './reports.scss'
})
export class ReportsComponent implements OnInit, OnDestroy {
  reportsData: ReportsData | null = null;
  isLoading = false;
  private themeSubscription?: Subscription;
  
  // Filters
  startDate = DateUtil.getTodayISO();
  endDate = DateUtil.getTodayISO();
  
  // User names mapping
  users: Array<{ userId: number; name: string; avatarColor?: string | null }> = [];

  // Projects Overview Chart
  projectsChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [
      {
        label: 'Total Tasks',
        data: [],
        backgroundColor: '#0A1A3A', // Will be updated by updateCharts
        borderColor: '#1a2a4a',
        borderWidth: 1
      },
      {
        label: 'Completed',
        data: [],
        backgroundColor: '#2e7d32',
        borderColor: '#1b5e20',
        borderWidth: 1
      },
      {
        label: 'On Hold',
        data: [],
        backgroundColor: '#F57F17',
        borderColor: '#E65100',
        borderWidth: 1
      },
      {
        label: 'Under Process',
        data: [],
        backgroundColor: '#2196F3',
        borderColor: '#1565C0',
        borderWidth: 1
      }
    ]
  };
  projectsChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top'
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  // Users Performance Chart
  usersChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [
      {
        label: 'Inventory Count',
        data: [],
        backgroundColor: '#0A1A3A', // Will be updated by updateCharts
        borderColor: '#1a2a4a',
        borderWidth: 1
      },
      {
        label: 'Transfer Count',
        data: [],
        backgroundColor: '#FFC107',
        borderColor: '#F57F17',
        borderWidth: 1
      }
    ]
  };
  usersChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top'
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
    private userService: UserService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    if (!this.sessionService.hasPermission('GetReports')) {
      return;
    }
    
    // Subscribe to theme changes
    this.themeSubscription = this.themeService.effectiveTheme$.subscribe(() => {
      this.updateChartColors();
    });
    
    // Set default dates to today
    this.startDate = DateUtil.getTodayISO();
    this.endDate = DateUtil.getTodayISO();
    
    this.loadUsers();
    this.loadReports();
  }

  formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  loadUsers(): void {
    this.httpService.get<Array<{ userId: number; name: string }>>(API_CONFIG.ENDPOINTS.FILTERS.USERS).subscribe({
      next: (data) => {
        this.ngZone.run(() => {
        this.users = [...data];
          this.cdr.markForCheck();
        this.cdr.detectChanges();
        });
      }
    });
  }

  loadReports(): void {
    this.isLoading = true;
    const params: any = {};
    if (this.startDate) params.startDate = this.startDate;
    if (this.endDate) params.endDate = this.endDate;

    this.httpService.get<ReportsData>(API_CONFIG.ENDPOINTS.REPORTS, params).subscribe({
      next: (data) => {
        this.ngZone.run(() => {
        this.reportsData = { ...data };
        this.updateCharts();
        this.isLoading = false;
          this.cdr.markForCheck();
        this.cdr.detectChanges();
        });
      },
      error: (error) => {
        this.ngZone.run(() => {
        console.error('Error loading reports:', error);
        this.isLoading = false;
          this.cdr.markForCheck();
        this.cdr.detectChanges();
        });
      }
    });
  }

  applyFilters(): void {
    this.loadReports();
  }

  resetFilters(): void {
    // Reset to today
    this.startDate = DateUtil.getTodayISO();
    this.endDate = DateUtil.getTodayISO();
    this.loadReports();
  }

  getUserName(userId: number): string {
    const user = this.userService.getUserById(userId);
    return user ? user.name : `User ${userId}`;
  }

  getUserAvatarColor(userId: number): string {
    // Use centralized method that checks session first for current user
    return UserAvatarUtil.getUserAvatarColorById(userId, this.sessionService, this.userService);
  }

  getUserInitials(userId: number): string {
    const userName = this.getUserName(userId);
    return UserAvatarUtil.getInitials(userName);
  }

  ngOnDestroy(): void {
    if (this.themeSubscription) {
      this.themeSubscription.unsubscribe();
    }
  }

  updateChartColors(): void {
    if (this.reportsData) {
      this.updateCharts();
    }
  }

  updateCharts(): void {
    if (!this.reportsData) return;

    const chartColors = ChartColorsUtil.getChartColors(this.themeService);

    // Update Projects Overview Chart
    if (this.reportsData.projects && this.reportsData.projects.length > 0) {
      const projectLabels = this.reportsData.projects.map(p => p.projectName);
      const totalTasks = this.reportsData.projects.map(p => p.totalTasks);
      const completedTasks = this.reportsData.projects.map(p => p.completedTasks);
      const onHoldTasks = this.reportsData.projects.map(p => p.onHoldTasks);
      const underProcessTasks = this.reportsData.projects.map(p => p.underProcessTasks);

      this.projectsChartData = {
        labels: [...projectLabels],
        datasets: [
          {
            label: 'Total Tasks',
            data: [...totalTasks],
            backgroundColor: chartColors.primary,
            borderColor: chartColors.secondary,
            borderWidth: 1
          },
          {
            label: 'Completed',
            data: [...completedTasks],
            backgroundColor: chartColors.success,
            borderColor: chartColors.success,
            borderWidth: 1
          },
          {
            label: 'On Hold',
            data: [...onHoldTasks],
            backgroundColor: chartColors.warning,
            borderColor: chartColors.warning,
            borderWidth: 1
          },
          {
            label: 'Under Process',
            data: [...underProcessTasks],
            backgroundColor: chartColors.info,
            borderColor: chartColors.info,
            borderWidth: 1
          }
        ]
      };
    }

    // Update Users Performance Chart
    if (this.reportsData.users && this.reportsData.users.length > 0) {
      const userLabels = this.reportsData.users.map(u => this.getUserName(u.userId));
      const inventoryCounts = this.reportsData.users.map(u => u.inventoryCount);
      const transferCounts = this.reportsData.users.map(u => u.transferCount);

      this.usersChartData = {
        labels: [...userLabels],
        datasets: [
          {
            label: 'Inventory Count',
            data: [...inventoryCounts],
            backgroundColor: chartColors.primary,
            borderColor: chartColors.secondary,
            borderWidth: 1
          },
          {
            label: 'Transfer Count',
            data: [...transferCounts],
            backgroundColor: chartColors.accent,
            borderColor: chartColors.warning,
            borderWidth: 1
          }
        ]
      };
    }

    // Update chart options for theme
    this.projectsChartOptions = {
      ...this.projectsChartOptions,
      plugins: {
        ...this.projectsChartOptions.plugins,
        legend: {
          ...this.projectsChartOptions.plugins?.legend,
          labels: {
            color: chartColors.primary
          }
        }
      },
        scales: {
          ...this.projectsChartOptions.scales,
          x: {
            ...this.projectsChartOptions.scales?.['x'],
            ticks: { color: chartColors.primary },
            grid: { color: chartColors.borderColor }
          },
          y: {
            ...this.projectsChartOptions.scales?.['y'],
            ticks: { color: chartColors.primary },
            grid: { color: chartColors.borderColor }
          }
        }
    };

    this.usersChartOptions = {
      ...this.usersChartOptions,
      plugins: {
        ...this.usersChartOptions.plugins,
        legend: {
          ...this.usersChartOptions.plugins?.legend,
          labels: {
            color: chartColors.primary
          }
        }
      },
        scales: {
          ...this.usersChartOptions.scales,
          x: {
            ...this.usersChartOptions.scales?.['x'],
            ticks: { color: chartColors.primary },
            grid: { color: chartColors.borderColor }
          },
          y: {
            ...this.usersChartOptions.scales?.['y'],
            ticks: { color: chartColors.primary },
            grid: { color: chartColors.borderColor }
          }
        }
    };

    this.cdr.markForCheck();
  }
}
