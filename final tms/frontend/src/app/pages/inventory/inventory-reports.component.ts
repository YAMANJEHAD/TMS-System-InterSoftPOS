import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InventoryService } from '../../services/inventory.service';
import { InventoryChartData, Inventory } from '../../models/inventory.model';
import { FilterService } from '../../services/filter.service';
import { User } from '../../models/filter.model';
import { finalize } from 'rxjs';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-inventory-reports',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inventory-reports.component.html',
  styleUrls: ['./inventory-reports.component.css']
})
export class InventoryReportsComponent implements OnInit, AfterViewInit, OnDestroy {
  loading = true;
  error: string | null = null;

  // Chart data
  trendingData: InventoryChartData[] = []; // For Trending Movement Chart
  itemsDistributionData: InventoryChartData[] = []; // For Items Distribution Chart
  userCountData: InventoryChartData[] = []; // For User Count Chart (replaces Stock Levels)
  technicalReasonsData: InventoryChartData[] = []; // For Technical Reasons Chart

  // Users lookup for display
  usersLookup: Map<number, string> = new Map();
  
  // Technicians lookup for display
  techniciansLookup: Map<number, string> = new Map();

  // Summary metrics
  totalInventory: number = 0; // Count of unique Terminal IDs
  totalTechnicians: number = 0; // Count of unique Technician IDs

  // Chart instances
  private trendingMovementChart: Chart<'line'> | null = null;
  private itemsDistributionChart: Chart<'bar'> | null = null;
  private userCountChart: Chart<'bar'> | null = null;
  private technicalReasonsChart: Chart<'pie'> | null = null;

  // Canvas element references
  @ViewChild('trendingMovementCanvas', { static: false }) trendingMovementCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('itemsDistributionCanvas', { static: false }) itemsDistributionCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('userCountCanvas', { static: false }) userCountCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('technicalReasonsCanvas', { static: false }) technicalReasonsCanvas!: ElementRef<HTMLCanvasElement>;

  constructor(
    private inventoryService: InventoryService,
    private filterService: FilterService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadUsers();
    this.loadTechnicians();
    this.loadInventoryItems();
    this.loadChartData();
  }

  ngAfterViewInit(): void {
    this.cdr.detectChanges();
    // If data is already loaded, initialize charts
    if (this.trendingData.length > 0 || this.itemsDistributionData.length > 0 || 
        this.userCountData.length > 0 || this.technicalReasonsData.length > 0) {
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
        console.log('InventoryReportsComponent: Loaded users:', this.usersLookup.size);
      },
      error: (err) => {
        console.error('Error loading users:', err);
      }
    });
  }

  loadTechnicians(): void {
    this.filterService.getTechnicians().subscribe({
      next: (technicians) => {
        technicians.forEach(tech => {
          this.techniciansLookup.set(tech.techId, tech.techName);
        });
        console.log('InventoryReportsComponent: Loaded technicians:', this.techniciansLookup.size);
      },
      error: (err) => {
        console.error('Error loading technicians:', err);
      }
    });
  }

  loadInventoryItems(): void {
    // Load inventory items from status 1 to calculate unique terminalIds
    this.inventoryService.getInventoryByStatus(1).subscribe({
      next: (items) => {
        this.calculateTotalInventory(items || []);
      },
      error: (err) => {
        console.error('Error loading inventory items:', err);
        this.totalInventory = 0;
      }
    });
  }

  calculateTotalInventory(items: Inventory[]): void {
    // Calculate Total Inventory: Count of unique Terminal IDs
    const uniqueTerminalIds = new Set<number>();
    items.forEach(item => {
      if (item.terminalId != null && item.terminalId > 0) {
        uniqueTerminalIds.add(item.terminalId);
      }
    });
    this.totalInventory = uniqueTerminalIds.size;
    console.log('InventoryReportsComponent: Total Inventory (unique terminals):', this.totalInventory);
    this.cdr.detectChanges();
  }

  calculateSummaryMetrics(): void {
    // Calculate Total Technicians: Count of unique Technician IDs from chart data
    const uniqueTechIds = new Set<number>();
    this.itemsDistributionData.forEach(item => {
      if (item.techId != null && item.techId > 0) {
        uniqueTechIds.add(item.techId);
      }
    });
    this.totalTechnicians = uniqueTechIds.size;
    console.log('InventoryReportsComponent: Total Technicians (unique techIds):', this.totalTechnicians);
    this.cdr.detectChanges();
  }

  loadChartData(): void {
    this.loading = true;
    this.error = null;

    console.log('InventoryReportsComponent: Loading chart data...');

    this.inventoryService.getChartData().pipe(
      finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (data) => {
        console.log('InventoryReportsComponent: Received chart data:', data);
        console.log('InventoryReportsComponent: Data length:', data?.length);

        // 1. Trending Movement Chart - entries grouped by date (entryDate not null)
        this.trendingData = data.filter(item => 
          item.entryDate != null && 
          item.userId == null && 
          item.techId == null && 
          item.reasonName == null
        );

        // 2. Items Distribution Chart - entries grouped by techId only
        // Group by techId first, then map to techName for display
        this.itemsDistributionData = data.filter(item => 
          item.techId != null &&
          item.entryDate == null &&
          item.userId == null &&
          item.reasonName == null
        );

        // 3. User Count Chart - entries grouped by userId (replaces Stock Levels)
        this.userCountData = data.filter(item => 
          item.userId != null &&
          item.entryDate == null &&
          item.techId == null &&
          item.reasonName == null
        );

        // 4. Technical Reasons Chart - entries grouped by reasonName
        this.technicalReasonsData = data.filter(item => 
          item.reasonName != null && 
          item.entryDate == null && 
          item.userId == null
        );

        console.log('InventoryReportsComponent: Trending data count:', this.trendingData.length);
        console.log('InventoryReportsComponent: Items distribution count:', this.itemsDistributionData.length);
        console.log('InventoryReportsComponent: User count count:', this.userCountData.length);
        console.log('InventoryReportsComponent: Technical reasons count:', this.technicalReasonsData.length);

        // Calculate summary metrics
        this.calculateSummaryMetrics();

        // Sort trending data by date
        this.trendingData.sort((a, b) => {
          const dateA = new Date(a.entryDate || '').getTime();
          const dateB = new Date(b.entryDate || '').getTime();
          return dateA - dateB;
        });

        // Sort items distribution by count (descending)
        this.itemsDistributionData.sort((a, b) => b.count - a.count);

        // Sort user count by count (descending)
        this.userCountData.sort((a, b) => b.count - a.count);

        // Sort technical reasons by count (descending)
        this.technicalReasonsData.sort((a, b) => b.count - a.count);

        // Initialize charts after data is loaded and view is ready
        setTimeout(() => {
          this.cdr.detectChanges();
          // Double-check that ViewChild elements are available
          if (this.trendingMovementCanvas?.nativeElement || 
              this.itemsDistributionCanvas?.nativeElement || 
              this.userCountCanvas?.nativeElement || 
              this.technicalReasonsCanvas?.nativeElement) {
            this.initializeCharts();
          } else {
            // If ViewChild elements aren't ready, try again after a short delay
            setTimeout(() => {
              this.initializeCharts();
            }, 200);
          }
        }, 300);
      },
      error: (err) => {
        this.error = 'Failed to load inventory chart data.';
        console.error('InventoryReportsComponent: Error loading chart data:', err);
      }
    });
  }

  initializeCharts(): void {
    console.log('InventoryReportsComponent: Initializing charts...');
    this.destroyCharts();

    // 1. Trending Movement Chart (Line Chart) - Only inbound/entries over time
    if (this.trendingMovementCanvas?.nativeElement && this.trendingData.length > 0) {
      console.log('InventoryReportsComponent: Creating trending movement chart...');
      const labels = this.trendingData.map(d => {
        const date = new Date(d.entryDate || '');
        return date.toLocaleDateString();
      });
      const inboundData = this.trendingData.map(d => d.inbound || d.count);

      const config: ChartConfiguration<'line'> = {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Inbound',
              data: inboundData,
              borderColor: '#28a745',
              backgroundColor: 'rgba(40, 167, 69, 0.2)',
              tension: 0.4,
              fill: true
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: 'Trending Movement Chart'
            },
            legend: {
              display: true
            },
            tooltip: {
              enabled: false // Remove hover effects
            }
          },
          scales: {
            y: {
              beginAtZero: true
            }
          },
          interaction: {
            intersect: false,
            mode: 'index' as const
          },
          onHover: (event, activeElements) => {
            // Disable hover highlighting
            if (event.native) {
              (event.native.target as HTMLElement).style.cursor = 'default';
            }
          }
        }
      };

      this.trendingMovementChart = new Chart(this.trendingMovementCanvas.nativeElement, config);
    }

    // 2. Items Distribution Chart (Bar Chart) - Group by techId, display techName
    if (this.itemsDistributionCanvas?.nativeElement && this.itemsDistributionData.length > 0) {
      console.log('InventoryReportsComponent: Creating items distribution chart...');
      
      // Group by techId and aggregate counts
      const techIdGroups = new Map<number, number>();
      this.itemsDistributionData.forEach(item => {
        const techId = item.techId || 0;
        const currentCount = techIdGroups.get(techId) || 0;
        techIdGroups.set(techId, currentCount + item.count);
      });

      // Convert to arrays, sorted by count (descending)
      const sortedTechIds = Array.from(techIdGroups.entries())
        .sort((a, b) => b[1] - a[1]);

      // Map techId to techName for labels
      const labels = sortedTechIds.map(([techId]) => {
        const techName = this.techniciansLookup.get(techId) || 
                        this.itemsDistributionData.find(d => d.techId === techId)?.techName ||
                        `Technician ${techId}`;
        return techName;
      });
      
      const counts = sortedTechIds.map(([, count]) => count);
      const colors = ['#36A2EB', '#FF6384', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];

      const config: ChartConfiguration<'bar'> = {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Items',
            data: counts,
            backgroundColor: labels.map((_, i) => colors[i % colors.length])
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: 'Items Distribution Chart'
            },
            legend: {
              display: false
            }
          },
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      };

      this.itemsDistributionChart = new Chart(this.itemsDistributionCanvas.nativeElement, config);
      console.log('InventoryReportsComponent: Items distribution chart created with technician names');
    }

    // 3. User Count Chart (Bar Chart) - User activity (replaces Stock Levels)
    if (this.userCountCanvas?.nativeElement && this.userCountData.length > 0) {
      console.log('InventoryReportsComponent: Creating user count chart...');
      const labels = this.userCountData.map(d => {
        const userName = this.usersLookup.get(d.userId || 0);
        return userName || `User ${d.userId}`;
      });
      const counts = this.userCountData.map(d => d.count);

      const config: ChartConfiguration<'bar'> = {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Actions',
            data: counts,
            backgroundColor: '#36A2EB'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: 'User Count Chart'
            },
            legend: {
              display: false
            }
          },
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      };

      this.userCountChart = new Chart(this.userCountCanvas.nativeElement, config);
    }

    // 4. Technical Reasons Chart (Pie Chart) - Distribution by technical reasons
    if (this.technicalReasonsCanvas?.nativeElement && this.technicalReasonsData.length > 0) {
      console.log('InventoryReportsComponent: Creating technical reasons chart...');
      const labels = this.technicalReasonsData.map(d => d.reasonName || 'Unknown');
      const counts = this.technicalReasonsData.map(d => d.count);
      const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#C9CBCF', '#FF6384', '#36A2EB'];
      const backgroundColor = labels.map((_, i) => colors[i % colors.length]);

      const config: ChartConfiguration<'pie'> = {
        type: 'pie',
        data: {
          labels: labels,
          datasets: [{
            data: counts,
            backgroundColor: backgroundColor
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: 'Technical Reasons Chart'
            },
            legend: {
              position: 'right'
            }
          }
        }
      };

      this.technicalReasonsChart = new Chart(this.technicalReasonsCanvas.nativeElement, config);
    }

    console.log('InventoryReportsComponent: Chart initialization complete');
  }

  destroyCharts(): void {
    if (this.trendingMovementChart) {
      this.trendingMovementChart.destroy();
      this.trendingMovementChart = null;
    }
    if (this.itemsDistributionChart) {
      this.itemsDistributionChart.destroy();
      this.itemsDistributionChart = null;
    }
    if (this.userCountChart) {
      this.userCountChart.destroy();
      this.userCountChart = null;
    }
    if (this.technicalReasonsChart) {
      this.technicalReasonsChart.destroy();
      this.technicalReasonsChart = null;
    }
  }
}

