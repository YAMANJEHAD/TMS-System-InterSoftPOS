import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { ChartData, ChartOptions, Chart, registerables } from 'chart.js';
import { HttpService } from '../../../services/http.service';
import { SessionService } from '../../../services/session.service';
import { ThemeService } from '../../../services/theme.service';
import { UserService } from '../../../services/user.service';
import { API_CONFIG } from '../../../config/api.config';
import { ChartColorsUtil } from '../../../utils/chart-colors.util';
import { UserAvatarUtil } from '../../../utils/user-avatar.util';
import { BreadcrumbComponent } from '../../components/breadcrumb/breadcrumb';
import { Subscription } from 'rxjs';

// Register Chart.js components
Chart.register(...registerables);

interface TransferChartData {
  message: string;
  data: {
    byUserDay: Array<{ day: string; user_Id: number; count: number }>;
    byUserTotal: Array<{ user_Id: number; count: number }>;
    byDayTotal: Array<{ day: string; total_Count: number }>;
  };
}

interface User {
  userId: number;
  name: string;
  avatarColor?: string | null;
}

@Component({
  selector: 'app-transfer-reports',
  standalone: true,
  imports: [CommonModule, DatePipe, BaseChartDirective, FormsModule, BreadcrumbComponent],
  templateUrl: './transfer-reports.html',
  styleUrl: './transfer-reports.scss'
})
export class TransferReportsComponent implements OnInit, OnDestroy {
  chartData: TransferChartData | null = null;
  users: User[] = [];
  isLoading = false;
  selectedDate: string = '';
  filteredDailyTransfers: Array<{ day: string; user_Id: number; count: number }> = [];
  private themeSubscription?: Subscription;

  get maxDate(): string {
    return this.formatDateForInput(new Date());
  }

  // Total Transfers by User - Bar Chart
  userChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [{
      label: 'Total Transfers',
      data: [],
      backgroundColor: '#0A1A3A', // Will be updated by updateCharts
      borderColor: '#1a2a4a',
      borderWidth: 1
    }]
  };
  userChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  // Total Transfers by Day - Line Chart
  dayChartData: ChartData<'line'> = {
    labels: [],
    datasets: [{
      label: 'Total Transfers',
      data: [],
      borderColor: '#FFC107', // Will be updated by updateCharts
      backgroundColor: 'rgba(255, 193, 7, 0.1)',
      tension: 0.4,
      fill: true
    }]
  };
  dayChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
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
    private userService: UserService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Subscribe to theme changes
    this.themeSubscription = this.themeService.effectiveTheme$.subscribe(() => {
      if (this.chartData) {
        this.updateCharts(this.chartData);
      }
    });
    
    // Set default date to today
    const today = new Date();
    this.selectedDate = this.formatDateForInput(today);
    this.loadUsers();
    this.loadChartData();
  }
  
  ngOnDestroy(): void {
    if (this.themeSubscription) {
      this.themeSubscription.unsubscribe();
    }
  }

  formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  formatDateForComparison(dateString: string | Date): string {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    // Handle timezone issues by using local date components
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  isToday(dateString: string): boolean {
    const today = new Date();
    const todayStr = this.formatDateForInput(today);
    return dateString === todayStr;
  }

  goToPreviousDay(): void {
    const currentDate = new Date(this.selectedDate);
    currentDate.setDate(currentDate.getDate() - 1);
    this.selectedDate = this.formatDateForInput(currentDate);
    this.filterDailyTransfers();
  }

  goToNextDay(): void {
    if (!this.isToday(this.selectedDate)) {
      const currentDate = new Date(this.selectedDate);
      currentDate.setDate(currentDate.getDate() + 1);
      this.selectedDate = this.formatDateForInput(currentDate);
      this.filterDailyTransfers();
    }
  }

  onDateChange(): void {
    this.filterDailyTransfers();
  }

  filterDailyTransfers(): void {
    if (!this.chartData) return;
    
    const selectedDateStr = this.formatDateForComparison(this.selectedDate);
    this.filteredDailyTransfers = this.chartData.data.byUserDay.filter(item => {
      // Handle both string and Date formats from API
      const itemDateStr = this.formatDateForComparison(item.day);
      return itemDateStr === selectedDateStr;
    });
    
    // Sort by user name for better display
    this.filteredDailyTransfers.sort((a, b) => {
      const nameA = this.getUserName(a.user_Id).toLowerCase();
      const nameB = this.getUserName(b.user_Id).toLowerCase();
      return nameA.localeCompare(nameB);
    });
    
    this.cdr.detectChanges();
  }

  loadUsers(): void {
    this.httpService.get<User[]>(API_CONFIG.ENDPOINTS.FILTERS.USERS).subscribe({
      next: (data) => this.users = data
    });
  }

  loadChartData(): void {
    this.isLoading = true;
    this.httpService.get<TransferChartData>(API_CONFIG.ENDPOINTS.TRANSFER_CHART).subscribe({
      next: (data) => {
        this.chartData = data;
        this.updateCharts(data);
        this.filterDailyTransfers(); // Filter after loading data
        this.cdr.detectChanges();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading chart data:', error);
        this.isLoading = false;
      }
    });
  }

  updateCharts(data: TransferChartData): void {
    const chartColors = ChartColorsUtil.getChartColors(this.themeService);
    
    // Update Total Transfers by User - Bar Chart
    if (data.data.byUserTotal && data.data.byUserTotal.length > 0) {
      const userLabels = data.data.byUserTotal.map(item => this.getUserName(item.user_Id));
      const userCounts = data.data.byUserTotal.map(item => item.count);
      
      this.userChartData = {
        labels: [...userLabels],
        datasets: [{
          label: 'Total Transfers',
          data: [...userCounts],
          backgroundColor: chartColors.primary,
          borderColor: chartColors.secondary,
          borderWidth: 1
        }]
      };
      
      // Update chart options
      this.userChartOptions = {
        ...this.userChartOptions,
        scales: {
          ...this.userChartOptions.scales,
          x: {
            ...this.userChartOptions.scales?.['x'],
            ticks: { color: chartColors.primary },
            grid: { color: chartColors.borderColor }
          },
          y: {
            ...this.userChartOptions.scales?.['y'],
            ticks: { color: chartColors.primary },
            grid: { color: chartColors.borderColor }
          }
        }
      };
    }

    // Update Total Transfers by Day - Line Chart
    if (data.data.byDayTotal && data.data.byDayTotal.length > 0) {
      const sortedDays = [...data.data.byDayTotal].sort((a, b) => 
        new Date(a.day).getTime() - new Date(b.day).getTime()
      );
      
      const dayLabels = sortedDays.map(item => {
        const date = new Date(item.day);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      });
      const dayCounts = sortedDays.map(item => item.total_Count);
      
      this.dayChartData = {
        labels: [...dayLabels],
        datasets: [{
          label: 'Total Transfers',
          data: [...dayCounts],
          borderColor: chartColors.accent,
          backgroundColor: chartColors.backgroundColor,
          tension: 0.4,
          fill: true
        }]
      };
      
      // Update chart options
      this.dayChartOptions = {
        ...this.dayChartOptions,
        plugins: {
          ...this.dayChartOptions.plugins,
          legend: {
            ...this.dayChartOptions.plugins?.legend,
            labels: {
              color: chartColors.primary
            }
          }
        },
        scales: {
          ...this.dayChartOptions.scales,
          x: {
            ...this.dayChartOptions.scales?.['x'],
            ticks: { color: chartColors.primary },
            grid: { color: chartColors.borderColor }
          },
          y: {
            ...this.dayChartOptions.scales?.['y'],
            ticks: { color: chartColors.primary },
            grid: { color: chartColors.borderColor }
          }
        }
      };
    }
    
    this.cdr.markForCheck();
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
}
