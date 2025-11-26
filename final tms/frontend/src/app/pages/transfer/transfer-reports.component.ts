import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { TransferService } from '../../services/transfer.service';
import { TransferChartResponse } from '../../models/transfer.model';
import { FilterService } from '../../services/filter.service';
import { User } from '../../models/filter.model';
import { finalize } from 'rxjs';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-transfer-reports',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './transfer-reports.component.html',
  styleUrls: ['./transfer-reports.component.css']
})
export class TransferReportsComponent implements OnInit, AfterViewInit, OnDestroy {
  loading = true;
  error: string | null = null;
  
  // Chart data
  chartData: TransferChartResponse | null = null;
  
  // Users lookup for display
  usersLookup: Map<number, string> = new Map();
  
  // Processed data for tables
  byUserDayTable: Array<{ day: string; userName: string; userId: number; count: number }> = [];
  byUserTotalTable: Array<{ userName: string; userId: number; count: number }> = [];
  
  // Chart instances
  private byUserTotalChart: Chart<'bar'> | null = null;
  private byDayTotalChart: Chart<'line'> | null = null;
  
  // Canvas element references
  @ViewChild('byUserTotalCanvas', { static: false }) byUserTotalCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('byDayTotalCanvas', { static: false }) byDayTotalCanvas!: ElementRef<HTMLCanvasElement>;
  
  constructor(
    private transferService: TransferService,
    private filterService: FilterService,
    private cdr: ChangeDetectorRef
  ) {}
  
  ngOnInit(): void {
    this.loadUsers();
    this.loadChartData();
  }
  
  ngAfterViewInit(): void {
    this.cdr.detectChanges();
    // Initialize charts after view is ready
    if (this.chartData) {
      setTimeout(() => {
        this.initializeCharts();
      }, 200);
    }
  }
  
  ngOnDestroy(): void {
    this.destroyCharts();
  }
  
  loadUsers(): void {
    this.filterService.getUsers().subscribe({
      next: (users) => {
        users.forEach(user => {
          this.usersLookup.set(user.userId, user.name);
        });
        console.log('TransferReportsComponent: Loaded users:', this.usersLookup.size);
        // If chart data is already loaded, update tables and reinitialize charts
        if (this.chartData) {
          this.processChartData();
          setTimeout(() => {
            this.initializeCharts();
          }, 200);
        }
      },
      error: (err) => {
        console.error('Error loading users:', err);
      }
    });
  }
  
  loadChartData(): void {
    this.loading = true;
    this.error = null;
    
    this.transferService.getTransferChart().pipe(
      finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (response) => {
        this.chartData = response;
        this.processChartData();
        // Initialize charts after a short delay to ensure canvas elements are ready
        setTimeout(() => {
          this.initializeCharts();
        }, 300);
      },
      error: (err) => {
        this.error = 'Failed to load transfer chart data.';
        console.error('Error loading transfer chart data:', err);
      }
    });
  }
  
  processChartData(): void {
    if (!this.chartData?.data) {
      return;
    }
    
    // Process byUserDay for table
    this.byUserDayTable = (this.chartData.data.byUserDay || []).map(item => ({
      day: item.day,
      userName: this.usersLookup.get(item.user_Id) || `User ${item.user_Id}`,
      userId: item.user_Id,
      count: item.count
    })).sort((a, b) => {
      // Sort by day descending, then by count descending
      const dateA = new Date(a.day).getTime();
      const dateB = new Date(b.day).getTime();
      if (dateA !== dateB) {
        return dateB - dateA;
      }
      return b.count - a.count;
    });
    
    // Process byUserTotal for table
    this.byUserTotalTable = (this.chartData.data.byUserTotal || []).map(item => ({
      userName: this.usersLookup.get(item.user_Id) || `User ${item.user_Id}`,
      userId: item.user_Id,
      count: item.count
    })).sort((a, b) => b.count - a.count);
  }
  
  initializeCharts(): void {
    if (!this.chartData?.data) {
      return;
    }
    
    this.destroyCharts();
    
    // By User Total Chart (Bar Chart)
    if (this.byUserTotalCanvas?.nativeElement && this.chartData.data.byUserTotal && this.chartData.data.byUserTotal.length > 0) {
      const userLabels = this.chartData.data.byUserTotal.map(item => 
        this.usersLookup.get(item.user_Id) || `User ${item.user_Id}`
      );
      const userData = this.chartData.data.byUserTotal.map(item => item.count);
      
      const config: ChartConfiguration<'bar'> = {
        type: 'bar',
        data: {
          labels: userLabels,
          datasets: [{
            label: 'Total Transfers',
            data: userData,
            backgroundColor: '#36A2EB'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'top'
            },
            title: {
              display: true,
              text: 'Total Transfers by User'
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Number of Transfers'
              }
            },
            x: {
              title: {
                display: true,
                text: 'User'
              }
            }
          }
        }
      };
      
      this.byUserTotalChart = new Chart(this.byUserTotalCanvas.nativeElement, config);
    }
    
    // By Day Total Chart (Line Chart)
    if (this.byDayTotalCanvas?.nativeElement && this.chartData.data.byDayTotal && this.chartData.data.byDayTotal.length > 0) {
      const sortedDays = [...this.chartData.data.byDayTotal].sort((a, b) => {
        return new Date(a.day).getTime() - new Date(b.day).getTime();
      });
      
      const dayLabels = sortedDays.map(item => {
        const date = new Date(item.day);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      });
      const dayData = sortedDays.map(item => item.total_Count);
      
      const config: ChartConfiguration<'line'> = {
        type: 'line',
        data: {
          labels: dayLabels,
          datasets: [{
            label: 'Total Transfers',
            data: dayData,
            borderColor: '#28a745',
            backgroundColor: 'rgba(40, 167, 69, 0.1)',
            tension: 0.4,
            fill: true,
            pointRadius: 4,
            pointHoverRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'top'
            },
            title: {
              display: true,
              text: 'Total Transfers by Day'
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Number of Transfers'
              }
            },
            x: {
              title: {
                display: true,
                text: 'Date'
              }
            }
          }
        }
      };
      
      this.byDayTotalChart = new Chart(this.byDayTotalCanvas.nativeElement, config);
    }
  }
  
  destroyCharts(): void {
    if (this.byUserTotalChart) {
      this.byUserTotalChart.destroy();
      this.byUserTotalChart = null;
    }
    if (this.byDayTotalChart) {
      this.byDayTotalChart.destroy();
      this.byDayTotalChart = null;
    }
  }
  
  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
}


