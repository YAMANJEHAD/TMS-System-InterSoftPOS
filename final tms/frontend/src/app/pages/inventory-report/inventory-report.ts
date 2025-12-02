import { Component, OnInit, ChangeDetectorRef, ViewChild, OnDestroy, NgZone } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartData, ChartOptions, Chart, registerables } from 'chart.js';
import { HttpService } from '../../../services/http.service';
import { SessionService } from '../../../services/session.service';
import { ThemeService } from '../../../services/theme.service';
import { API_CONFIG } from '../../../config/api.config';
import { ChartColorsUtil } from '../../../utils/chart-colors.util';
import { BreadcrumbComponent } from '../../components/breadcrumb/breadcrumb';
import { forkJoin } from 'rxjs';
import { Subscription } from 'rxjs';

// Register Chart.js components
Chart.register(...registerables);

interface ChartItem {
  count: number;
  entryDate: string | null;
  userId: number | null;
  techId: number | null;
  reasonName: string | null;
}

interface User {
  userId: number;
  name: string;
}

interface Technician {
  techId: number;
  techName: string;
}

@Component({
  selector: 'app-inventory-report',
  standalone: true,
  imports: [CommonModule, DatePipe, BaseChartDirective, BreadcrumbComponent],
  templateUrl: './inventory-report.html',
  styleUrl: './inventory-report.scss'
})
export class InventoryReportComponent implements OnInit, OnDestroy {
  @ViewChild(BaseChartDirective) techChart?: BaseChartDirective;
  
  chartData: ChartItem[] = [];
  users: User[] = [];
  technicians: Technician[] = [];
  isLoading = false;
  private themeSubscription?: Subscription;

  // Daily Inventory Entries - Line Chart
  dailyChartData: ChartData<'line'> = {
    labels: [],
    datasets: [{
      label: 'Daily Entries',
      data: [],
      borderColor: '#0A1A3A', // Will be updated by updateCharts
      backgroundColor: 'rgba(10, 26, 58, 0.1)',
      tension: 0.4,
      fill: true
    }]
  };
  dailyChartOptions: ChartOptions<'line'> = {
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

  // Inventory by User - Bar Chart
  userChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [{
      label: 'Inventory Count',
      data: [],
      backgroundColor: [
        '#0A1A3A', '#FFC107', '#2196F3', '#4CAF50', '#9C27B0',
        '#F44336', '#00BCD4', '#FF5722', '#673AB7', '#E91E63'
      ], // Will be updated by updateCharts
      borderColor: '#ffffff',
      borderWidth: 2
    }]
  };
  userChartOptions: ChartOptions<'bar'> = {
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

  // Inventory by Technician - Vertical Bar Chart
  techChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [{
      label: 'Inventory Count',
      data: [],
      backgroundColor: '#0DA8BB', // Will be updated by updateCharts with gradient
      borderColor: '#0DA8BB',
      borderWidth: 2
    }]
  };
  techChartOptions: ChartOptions<'bar'> = {
    indexAxis: 'y', // Horizontal bars (vertical chart)
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true
      }
    },
    scales: {
      x: {
        beginAtZero: true
      },
      y: {
        ticks: {
          font: {
            size: 12
          }
        }
      }
    }
  };

  // Inventory by Reason - Donut Chart
  reasonChartData: ChartData<'doughnut'> = {
    labels: [],
    datasets: [{
      label: 'Inventory Count',
      data: [],
      backgroundColor: [
        '#0A1A3A', '#FFC107', '#FF9800', '#2196F3', '#4CAF50',
        '#9C27B0', '#F44336', '#00BCD4', '#FF5722', '#673AB7',
        '#E91E63', '#009688', '#3F51B5', '#795548', '#607D8B'
      ], // Will be updated by updateCharts
      borderColor: '#ffffff',
      borderWidth: 3
    }]
  };
  reasonChartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '60%',
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

  constructor(
    private httpService: HttpService,
    private sessionService: SessionService,
    private themeService: ThemeService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    if (!this.sessionService.hasPermission('GetInventoryChart')) {
      return;
    }
    
    // Subscribe to theme changes
    this.themeSubscription = this.themeService.effectiveTheme$.subscribe(() => {
      this.updateCharts();
    });
    
    this.loadAllData();
  }
  
  ngOnDestroy(): void {
    if (this.themeSubscription) {
      this.themeSubscription.unsubscribe();
    }
  }

  loadAllData(): void {
    this.isLoading = true;
    
    // Load chart data, users, and technicians in parallel
    forkJoin({
      chartData: this.httpService.get<ChartItem[]>(API_CONFIG.ENDPOINTS.INVENTORY.CHART),
      users: this.httpService.get<User[]>(API_CONFIG.ENDPOINTS.FILTERS.USERS),
      technicians: this.httpService.get<Technician[]>(API_CONFIG.ENDPOINTS.FILTERS.TECHNICIANS)
    }).subscribe({
      next: (data) => {
        this.ngZone.run(() => {
        this.chartData = [...data.chartData];
        this.users = [...data.users];
        this.technicians = [...data.technicians];
        this.updateCharts();
        this.isLoading = false;
          this.cdr.markForCheck();
        this.cdr.detectChanges();
        });
      },
      error: (error) => {
        this.ngZone.run(() => {
        console.error('Error loading data:', error);
        this.isLoading = false;
          this.cdr.markForCheck();
        this.cdr.detectChanges();
        });
      }
    });
  }

  updateCharts(): void {
    const chartColors = ChartColorsUtil.getChartColors(this.themeService);
    
    // 1. Daily Inventory Entries - Line Chart
    const dailyData = this.chartData.filter(d => d.entryDate !== null);
    const dailyMap = new Map<string, number>();
    
    dailyData.forEach(item => {
      if (item.entryDate) {
        const date = new Date(item.entryDate);
        // Use ISO date string for consistent sorting
        const isoDate = date.toISOString().split('T')[0];
        dailyMap.set(isoDate, (dailyMap.get(isoDate) || 0) + item.count);
      }
    });

    // Sort dates properly using ISO format
    const sortedDates = Array.from(dailyMap.keys()).sort();
    
    // Format dates for display
    const formattedDates = sortedDates.map(isoDate => {
      const date = new Date(isoDate);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    this.dailyChartData = {
      labels: formattedDates,
      datasets: [{
        label: 'Daily Entries',
        data: sortedDates.map(isoDate => dailyMap.get(isoDate) || 0),
        borderColor: chartColors.primary,
        backgroundColor: chartColors.backgroundColor,
        tension: 0.4,
        fill: true
      }]
    };
    
    // Update daily chart options
    this.dailyChartOptions = {
      ...this.dailyChartOptions,
      plugins: {
        ...this.dailyChartOptions.plugins,
        legend: {
          ...this.dailyChartOptions.plugins?.legend,
          labels: {
            color: chartColors.primary
          }
        }
      },
        scales: {
          ...this.dailyChartOptions.scales,
          x: {
            ...this.dailyChartOptions.scales?.['x'],
            ticks: { color: chartColors.primary },
            grid: { color: chartColors.borderColor }
          },
          y: {
            ...this.dailyChartOptions.scales?.['y'],
            ticks: { color: chartColors.primary },
            grid: { color: chartColors.borderColor }
          }
        }
    };

    // 2. Inventory by User - Bar Chart
    const userData = this.chartData.filter(d => d.userId !== null);
    const userMap = new Map<number, number>();
    
    userData.forEach(item => {
      if (item.userId !== null) {
        userMap.set(item.userId, (userMap.get(item.userId) || 0) + item.count);
      }
    });

    const userEntries = Array.from(userMap.entries())
      .map(([userId, count]) => ({
        name: this.users.find(u => u.userId === userId)?.name || `User ${userId}`,
        count
      }))
      .sort((a, b) => b.count - a.count);

    this.userChartData = {
      labels: userEntries.map(u => u.name),
      datasets: [{
        label: 'Inventory Count',
        data: userEntries.map(u => u.count),
        backgroundColor: userEntries.map((_, index) => 
          ChartColorsUtil.getPaletteColor(index, this.themeService)
        ),
        borderColor: chartColors.borderColor,
        borderWidth: 2
      }]
    };
    
    // Update user chart options
    this.userChartOptions = {
      ...this.userChartOptions,
      plugins: {
        ...this.userChartOptions.plugins,
        legend: {
          ...this.userChartOptions.plugins?.legend,
          labels: {
            color: chartColors.primary
          }
        }
      },
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

    // 3. Inventory by Technician - Vertical Bar Chart
    const techData = this.chartData.filter(d => d.techId !== null);
    const techMap = new Map<number, number>();
    
    techData.forEach(item => {
      if (item.techId !== null) {
        techMap.set(item.techId, (techMap.get(item.techId) || 0) + item.count);
      }
    });

    const techEntries = Array.from(techMap.entries())
      .map(([techId, count]) => ({
        name: this.technicians.find(t => t.techId === techId)?.techName || `Technician ${techId}`,
        count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Limit to top 10 records

    // Create teal gradient function for bars (vertical gradient: light at top to dark at bottom)
    const tealGradient = (context: any) => {
      const chart = context.chart;
      const { ctx, chartArea } = chart;
      
      if (!chartArea) {
        return chartColors.info; // Fallback color
      }
      
      // For horizontal bars, create a vertical gradient (top to bottom)
      // The gradient goes from top of chart area to bottom
      const gradient = ctx.createLinearGradient(
        0, chartArea.top,
        0, chartArea.bottom
      );
      
      // Use theme-aware teal colors
      const isDark = this.themeService.getEffectiveTheme() === 'dark';
      if (isDark) {
        gradient.addColorStop(0, '#4DD0E1'); // Very light teal/cyan
        gradient.addColorStop(0.5, '#26C6DA'); // Medium teal
        gradient.addColorStop(1, '#0DA8BB'); // Darker teal at bottom
      } else {
        gradient.addColorStop(0, '#4DD0E1'); // Very light teal/cyan
        gradient.addColorStop(0.5, '#26C6DA'); // Medium teal
        gradient.addColorStop(1, '#0DA8BB'); // Darker teal at bottom
      }
      
      return gradient;
    };

    this.techChartData = {
      labels: techEntries.map(t => t.name),
      datasets: [{
        label: 'Inventory Count',
        data: techEntries.map(t => t.count),
        backgroundColor: tealGradient,
        borderColor: chartColors.info,
        borderWidth: 2,
        barThickness: 35, // Adjust bar size
        maxBarThickness: 40,
        categoryPercentage: 0.8, // Space between categories (bars)
        barPercentage: 0.7 // Width of bars relative to category width
      }]
    };
    
    // Update tech chart options
    this.techChartOptions = {
      ...this.techChartOptions,
      plugins: {
        ...this.techChartOptions.plugins,
        legend: {
          ...this.techChartOptions.plugins?.legend,
          labels: {
            color: chartColors.primary
          }
        }
      },
        scales: {
          ...this.techChartOptions.scales,
          x: {
            ...this.techChartOptions.scales?.['x'],
            ticks: { color: chartColors.primary },
            grid: { color: chartColors.borderColor }
          },
          y: {
            ...this.techChartOptions.scales?.['y'],
            ticks: { 
              color: chartColors.primary,
              font: {
                size: 12
              }
            },
            grid: { color: chartColors.borderColor }
          }
        }
    };

    // 4. Inventory by Reason - Donut Chart
    const reasonData = this.chartData.filter(d => d.reasonName !== null);
    const reasonMap = new Map<string, number>();
    
    reasonData.forEach(item => {
      if (item.reasonName) {
        reasonMap.set(item.reasonName, (reasonMap.get(item.reasonName) || 0) + item.count);
      }
    });

    const reasonEntries = Array.from(reasonMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    this.reasonChartData = {
      labels: reasonEntries.map(r => r.name),
      datasets: [{
        label: 'Inventory Count',
        data: reasonEntries.map(r => r.count),
        backgroundColor: reasonEntries.map((_, index) => 
          ChartColorsUtil.getPaletteColor(index, this.themeService)
        ),
        borderColor: chartColors.borderColor,
        borderWidth: 3
      }]
    };
    
    // Update reason chart options
    this.reasonChartOptions = {
      ...this.reasonChartOptions,
      plugins: {
        ...this.reasonChartOptions.plugins,
        legend: {
          ...this.reasonChartOptions.plugins?.legend,
          labels: {
            color: chartColors.primary
          }
        }
      }
    };

    this.cdr.markForCheck();
  }
}
