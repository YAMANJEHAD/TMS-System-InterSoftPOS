import { Component, OnInit, ChangeDetectorRef, AfterViewInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { DashboardService, DashboardData } from '../services/dashboard.service';
import { TaskService } from '../services/task.service';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { finalize, forkJoin } from 'rxjs';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { Task } from '../models/task.model';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  data: DashboardData | null = null;
  loading = true;
  error: string | null = null;
  userName: string | null = null;
  hasProjectStatusData = false;
  hasComboChartData = false;

  // Chart instances
  private projectDistributionChart: Chart<'pie'> | null = null;
  private taskStatusChart: Chart<'bar'> | null = null;
  private dailyActivityChart: Chart<'line'> | null = null;
  private projectTaskDistributionChart: Chart<'bar'> | null = null;
  private projectStatusBreakdownChart: Chart<'bar'> | null = null;
  private comboChart: Chart | null = null;
  private completionRateChart: Chart<'doughnut'> | null = null;

  // Canvas element references
  @ViewChild('projectDistributionCanvas', { static: false }) projectDistributionCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('taskStatusCanvas', { static: false }) taskStatusCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('dailyActivityCanvas', { static: false }) dailyActivityCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('projectTaskDistributionCanvas', { static: false }) projectTaskDistributionCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('projectStatusBreakdownCanvas', { static: false }) projectStatusBreakdownCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('comboChartCanvas', { static: false }) comboChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('completionRateCanvas', { static: false }) completionRateCanvas!: ElementRef<HTMLCanvasElement>;

  constructor(
    private dashboardService: DashboardService,
    private taskService: TaskService,
    private authService: AuthService,
    public router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.userName = this.authService.getUserName();
    if (!this.userName) {
      this.loading = false;
      this.router.navigate(['/login']);
      return;
    }
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.error = null;
    this.data = null;

    // Load dashboard data and tasks in parallel
    forkJoin({
      dashboard: this.dashboardService.getDashboard(),
      tasks: this.taskService.getAllTasks()
    }).pipe(
      finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (results) => {
        this.loading = false;
        if (results.dashboard) {
          this.data = results.dashboard;
          this.cdr.detectChanges();
          // Initialize charts after view is ready and canvas elements are available
          setTimeout(() => {
            console.log('DashboardComponent: Initializing charts with', results.tasks?.length || 0, 'tasks');
            this.cdr.detectChanges();
            setTimeout(() => {
              this.initializeCharts(results.dashboard, results.tasks || []);
            }, 200);
          }, 300);
        } else {
          this.error = 'Dashboard data is empty.';
        }
      },
      error: (err) => {
        this.loading = false;
        this.data = null;
        this.cdr.detectChanges();
        if (err.status === 401 || err.status === 403) {
          this.error = 'Unauthorized: Please log in again.';
          setTimeout(() => this.router.navigate(['/login']), 2000);
        } else {
          this.error = err.message || 'Failed to load dashboard data.';
        }
      }
    });
  }

  ngAfterViewInit(): void {
    this.cdr.detectChanges();
    // If data is already loaded, retry chart initialization
    if (this.data) {
      // Reload to get tasks data for the status breakdown chart
      this.loadData();
    }
  }

  initializeCharts(data: DashboardData, tasks: Task[] = []): void {
    // Destroy existing charts
    this.destroyCharts();
    // Reset project status data flag
    this.hasProjectStatusData = false;
    // Reset combo chart data flag
    this.hasComboChartData = false;

    // Project Distribution Chart (Pie)
    if (this.projectDistributionCanvas && data.projectCounts && Array.isArray(data.projectCounts) && data.projectCounts.length > 0) {
      const projectLabels = data.projectCounts.map(p => p.name || p.Name || 'Unknown');
      const projectData = data.projectCounts.map(p => Number(p.count || p.Count || 0));
      const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#C9CBCF'];
      const backgroundColor = projectLabels.map((_, i) => colors[i % colors.length]);

      const config: ChartConfiguration<'pie'> = {
        type: 'pie',
        data: {
          labels: projectLabels,
          datasets: [{
            data: projectData,
            backgroundColor: backgroundColor
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'right' }
          }
        }
      };

      this.projectDistributionChart = new Chart(this.projectDistributionCanvas.nativeElement, config);
    }

    // Task Status Chart (Bar)
    if (this.taskStatusCanvas) {
      const statusData = [
        Number(data.completedTasks || 0),
        Number(data.underProcessTasks || 0),
        Number(data.onHoldTasks || 0),
        Number(data.unassignedTasks || 0),
        Number(data.overdueTasks || 0)
      ];

      const config: ChartConfiguration<'bar'> = {
        type: 'bar',
        data: {
          labels: ['Completed', 'In Progress', 'On Hold', 'Unassigned', 'Overdue'],
          datasets: [{
            label: 'Tasks',
            data: statusData,
            backgroundColor: ['#36A2EB', '#FFCE56', '#FF6384', '#4BC0C0', '#FF9F40']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: { beginAtZero: true }
          }
        }
      };

      this.taskStatusChart = new Chart(this.taskStatusCanvas.nativeElement, config);
    }

    // Daily Activity Chart (Line)
    if (this.dailyActivityCanvas && data.taskCountsByDate && Array.isArray(data.taskCountsByDate) && data.taskCountsByDate.length > 0) {
      const sortedDates = [...data.taskCountsByDate].sort((a, b) => {
        const dateA = new Date(a.dueDate || a.DueDate || a.due_date || '').getTime();
        const dateB = new Date(b.dueDate || b.DueDate || b.due_date || '').getTime();
        return dateA - dateB;
      });

      const labels = sortedDates.map(t => {
        const date = new Date(t.dueDate || t.DueDate || t.due_date || '');
        return date.toLocaleDateString();
      });
      const chartData = sortedDates.map(t => Number(t.taskCount || t.TaskCount || 0));

      const config: ChartConfiguration<'line'> = {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Tasks Created',
            data: chartData,
            borderColor: '#36A2EB',
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            tension: 0.4,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: true }
          },
          scales: {
            y: { beginAtZero: true }
          }
        }
      };

      this.dailyActivityChart = new Chart(this.dailyActivityCanvas.nativeElement, config);
    }

    // Project Task Distribution Chart (Bar)
    if (this.projectTaskDistributionCanvas && data.projectCounts && Array.isArray(data.projectCounts) && data.projectCounts.length > 0) {
      const projectLabels = data.projectCounts.map(p => p.name || p.Name || 'Unknown');
      const projectData = data.projectCounts.map(p => Number(p.count || p.Count || 0));

      const config: ChartConfiguration<'bar'> = {
        type: 'bar',
        data: {
          labels: projectLabels,
          datasets: [{
            label: 'Tasks by Project',
            data: projectData,
            backgroundColor: '#36A2EB'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: true }
          },
          scales: {
            y: { beginAtZero: true }
          }
        }
      };

      this.projectTaskDistributionChart = new Chart(this.projectTaskDistributionCanvas.nativeElement, config);
    }

    // Project Status Breakdown Chart (Stacked Bar)
    console.log('DashboardComponent: Initializing Project Status Breakdown Chart');
    console.log('DashboardComponent: Canvas available?', !!this.projectStatusBreakdownCanvas);
    console.log('DashboardComponent: Tasks count:', tasks?.length || 0);
    
    if (!tasks || tasks.length === 0) {
      this.hasProjectStatusData = false;
      this.cdr.detectChanges();
      return;
    }
    
    if (this.projectStatusBreakdownCanvas?.nativeElement) {
      // Group tasks by project and status
      const projectStatusMap = new Map<string, { completed: number; onHold: number; inProcess: number }>();
      
      tasks.forEach(task => {
        const projectName = task.projectName || 'Unknown';
        const statusName = (task.statusName || '').toLowerCase().trim();
        
        if (!projectStatusMap.has(projectName)) {
          projectStatusMap.set(projectName, { completed: 0, onHold: 0, inProcess: 0 });
        }
        
        const projectData = projectStatusMap.get(projectName)!;
        
        if (statusName === 'completed' || statusName.includes('complete')) {
          projectData.completed++;
        } else if (statusName === 'on hold' || statusName.includes('hold')) {
          projectData.onHold++;
        } else if (statusName === 'in process' || statusName === 'in progress' || 
                   statusName === 'under process' || statusName.includes('process') || 
                   statusName.includes('progress')) {
          projectData.inProcess++;
        }
      });

      // Convert to arrays for chart
      const projectLabels = Array.from(projectStatusMap.keys());
      const completedData = projectLabels.map(project => projectStatusMap.get(project)!.completed);
      const onHoldData = projectLabels.map(project => projectStatusMap.get(project)!.onHold);
      const inProcessData = projectLabels.map(project => projectStatusMap.get(project)!.inProcess);

      console.log('DashboardComponent: Project labels:', projectLabels);
      console.log('DashboardComponent: Completed data:', completedData);
      console.log('DashboardComponent: In Process data:', inProcessData);
      console.log('DashboardComponent: On Hold data:', onHoldData);

      // Create chart if we have projects (even if some have zero tasks)
      if (projectLabels.length > 0) {
        this.hasProjectStatusData = true;
        const config: ChartConfiguration<'bar'> = {
          type: 'bar',
          data: {
            labels: projectLabels,
            datasets: [
              {
                label: 'Completed',
                data: completedData,
                backgroundColor: '#28a745' // Green
              },
              {
                label: 'In Process',
                data: inProcessData,
                backgroundColor: '#17a2b8' // Info/Blue
              },
              {
                label: 'On Hold',
                data: onHoldData,
                backgroundColor: '#ffc107' // Warning/Yellow
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: true,
                position: 'top'
              },
              tooltip: {
                mode: 'index',
                intersect: false
              }
            },
            scales: {
              x: {
                stacked: true
              },
              y: {
                stacked: true,
                beginAtZero: true
              }
            }
          }
        };

        // Destroy existing chart if it exists
        if (this.projectStatusBreakdownChart) {
          this.projectStatusBreakdownChart.destroy();
        }
        
        this.projectStatusBreakdownChart = new Chart(this.projectStatusBreakdownCanvas.nativeElement, config);
        console.log('DashboardComponent: Project Status Breakdown Chart created successfully');
        this.cdr.detectChanges();
      } else {
        this.hasProjectStatusData = false;
        console.log('DashboardComponent: No projects found to display');
        this.cdr.detectChanges();
      }
    } else {
      console.log('DashboardComponent: Canvas element not available, retrying in 500ms...');
      // Retry initialization after a short delay
      setTimeout(() => {
        this.cdr.detectChanges();
        if (this.projectStatusBreakdownCanvas?.nativeElement && tasks && tasks.length > 0) {
          console.log('DashboardComponent: Retrying chart initialization');
          this.initializeProjectStatusChart(tasks);
        } else {
          this.hasProjectStatusData = false;
          this.cdr.detectChanges();
        }
      }, 500);
    }

    // Combo chart initialization removed - section hidden from UI
  }

  private initializeProjectStatusChart(tasks: Task[]): void {
    // Group tasks by project and status
    const projectStatusMap = new Map<string, { completed: number; onHold: number; inProcess: number }>();
    
    tasks.forEach(task => {
      const projectName = task.projectName || 'Unknown';
      const statusName = (task.statusName || '').toLowerCase().trim();
      
      if (!projectStatusMap.has(projectName)) {
        projectStatusMap.set(projectName, { completed: 0, onHold: 0, inProcess: 0 });
      }
      
      const projectData = projectStatusMap.get(projectName)!;
      
      // Match status names more flexibly
      if (statusName === 'completed' || statusName.includes('complete')) {
        projectData.completed++;
      } else if (statusName === 'on hold' || statusName.includes('hold')) {
        projectData.onHold++;
      } else if (statusName === 'in process' || statusName === 'in progress' || 
                 statusName === 'under process' || statusName.includes('process') || 
                 statusName.includes('progress')) {
        projectData.inProcess++;
      }
    });

    // Convert to arrays for chart
    const projectLabels = Array.from(projectStatusMap.keys());
    const completedData = projectLabels.map(project => projectStatusMap.get(project)!.completed);
    const onHoldData = projectLabels.map(project => projectStatusMap.get(project)!.onHold);
    const inProcessData = projectLabels.map(project => projectStatusMap.get(project)!.inProcess);

    if (projectLabels.length > 0 && this.projectStatusBreakdownCanvas?.nativeElement) {
      this.hasProjectStatusData = true;
      const config: ChartConfiguration<'bar'> = {
        type: 'bar',
        data: {
          labels: projectLabels,
          datasets: [
            {
              label: 'Completed',
              data: completedData,
              backgroundColor: '#28a745'
            },
            {
              label: 'In Process',
              data: inProcessData,
              backgroundColor: '#17a2b8'
            },
            {
              label: 'On Hold',
              data: onHoldData,
              backgroundColor: '#ffc107'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'top'
            },
            tooltip: {
              mode: 'index',
              intersect: false
            }
          },
          scales: {
            x: {
              stacked: true
            },
            y: {
              stacked: true,
              beginAtZero: true
            }
          }
        }
      };

      if (this.projectStatusBreakdownChart) {
        this.projectStatusBreakdownChart.destroy();
      }
      
      this.projectStatusBreakdownChart = new Chart(this.projectStatusBreakdownCanvas.nativeElement, config);
      this.cdr.detectChanges();
    } else {
      this.hasProjectStatusData = false;
      this.cdr.detectChanges();
    }
  }

  private initializeComboChart(data: DashboardData, tasks: Task[] = []): void {
    console.log('DashboardComponent: Initializing Combo Chart');
    console.log('DashboardComponent: Canvas available?', !!this.comboChartCanvas?.nativeElement);
    console.log('DashboardComponent: Tasks count:', tasks?.length || 0);
    console.log('DashboardComponent: High priority tasks from API:', data.highPriorityTasks);
    
    if (!this.comboChartCanvas?.nativeElement) {
      console.log('DashboardComponent: Canvas not available, retrying in 500ms...');
      setTimeout(() => {
        this.cdr.detectChanges();
        if (this.comboChartCanvas?.nativeElement) {
          this.initializeComboChart(data, tasks);
        }
      }, 500);
      return;
    }

    // Use taskCountsByDate for dates, or create dates from high priority tasks
    let dates: string[] = [];
    if (data.taskCountsByDate && data.taskCountsByDate.length > 0) {
      dates = data.taskCountsByDate.map(t => {
        const dateStr = t.dueDate || t.DueDate || t.due_date || '';
        return dateStr ? new Date(dateStr).toISOString().split('T')[0] : '';
      }).filter(d => d).sort();
    }

    // Filter high priority tasks and group by project
    const highPriorityTasks = tasks && tasks.length > 0 ? tasks.filter(task => {
      const priorityName = (task.priorityName || '').toLowerCase().trim();
      return priorityName.includes('high') || priorityName === 'high';
    }) : [];

    console.log('DashboardComponent: High priority tasks found:', highPriorityTasks.length);
    if (tasks.length > 0) {
      console.log('DashboardComponent: Sample priority names:', tasks.slice(0, 10).map(t => ({ priority: t.priorityName, project: t.projectName })));
    }

    // Group high priority tasks by project
    const projectCountMap = new Map<string, number>();
    highPriorityTasks.forEach(task => {
      const projectName = task.projectName || 'Unknown';
      projectCountMap.set(projectName, (projectCountMap.get(projectName) || 0) + 1);
    });

    // If no dates from taskCountsByDate, create a single date entry or use today
    if (dates.length === 0) {
      const today = new Date().toISOString().split('T')[0];
      dates = [today];
    }

    // Get projects from high priority tasks or use projectCounts as fallback
    const projects = Array.from(projectCountMap.keys());
    const projectCounts = data.projectCounts || [];

    console.log('DashboardComponent: Dates found:', dates.length);
    console.log('DashboardComponent: Projects from high priority tasks:', projects.length);
    console.log('DashboardComponent: Project counts from API:', projectCounts.length);

    // If we have high priority tasks count from API but no tasks array, use projectCounts
    if (highPriorityTasks.length === 0 && data.highPriorityTasks > 0 && projectCounts.length > 0) {
      // Distribute high priority tasks across projects proportionally
      const totalTasks = projectCounts.reduce((sum, p) => sum + (p.count || p.Count || 0), 0);
      const highPriorityCount = data.highPriorityTasks;
      
      projectCounts.forEach(project => {
        const projectName = project.name || project.Name || 'Unknown';
        const projectTaskCount = project.count || project.Count || 0;
        const proportion = totalTasks > 0 ? projectTaskCount / totalTasks : 0;
        const estimatedHighPriority = Math.round(highPriorityCount * proportion);
        if (estimatedHighPriority > 0) {
          projectCountMap.set(projectName, estimatedHighPriority);
        }
      });
    }

    // If we have highPriorityTasks from API but no project breakdown, create a single "All Projects" entry
    if (projectCountMap.size === 0 && data.highPriorityTasks > 0) {
      projectCountMap.set('All Projects', data.highPriorityTasks);
    }

    // If still no data, we can't create the chart
    if (dates.length === 0 && projectCountMap.size === 0) {
      console.log('DashboardComponent: No data available for combo chart');
      this.hasComboChartData = false;
      this.cdr.detectChanges();
      return;
    }

    // Ensure we have at least one date
    if (dates.length === 0) {
      dates = [new Date().toISOString().split('T')[0]];
    }

    // Prepare labels - use dates or project names
    let labels: string[];
    let useProjectLabels = false;
    
    if (dates.length > 0) {
      labels = dates.map(date => {
        const d = new Date(date);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      });
    } else if (projectCountMap.size > 0) {
      // Use project names as labels if no dates
      labels = Array.from(projectCountMap.keys());
      useProjectLabels = true;
    } else {
      labels = ['All Projects'];
    }

    // Create datasets for each project (stacked bars)
    // If we have actual high priority tasks, group them by date and project
    const dateProjectDataMap = new Map<string, Map<string, number>>();
    
    if (highPriorityTasks.length > 0) {
      highPriorityTasks.forEach(task => {
        const projectName = task.projectName || 'Unknown';
        // Use dueDate if available, otherwise use first date from dates array
        const dateKey = task.dueDate 
          ? new Date(task.dueDate).toISOString().split('T')[0]
          : (dates.length > 0 ? dates[0] : new Date().toISOString().split('T')[0]);
        
        if (!dateProjectDataMap.has(dateKey)) {
          dateProjectDataMap.set(dateKey, new Map<string, number>());
        }
        const projectMap = dateProjectDataMap.get(dateKey)!;
        projectMap.set(projectName, (projectMap.get(projectName) || 0) + 1);
      });
    }

    // Get all projects (from tasks or from projectCountMap)
    const allProjects = Array.from(new Set([
      ...Array.from(projectCountMap.keys()),
      ...(highPriorityTasks.length > 0 ? highPriorityTasks.map(t => t.projectName || 'Unknown') : [])
    ]));

    const projectDatasets = allProjects.map((projectName, index) => {
      const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#C9CBCF'];
      const count = projectCountMap.get(projectName) || 0;
      
      return {
        label: projectName || 'Unknown',
        type: 'bar' as const,
        data: dates.map(date => {
          // Get count for this project on this date
          const projectMap = dateProjectDataMap.get(date);
          if (projectMap) {
            return projectMap.get(projectName) || 0;
          }
          // If no date mapping but we have a count, distribute it
          if (count > 0 && dates.length === 1) {
            return count;
          }
          return 0;
        }),
        backgroundColor: colors[index % colors.length],
        order: 1
      };
    }).filter(dataset => {
      // Only include datasets that have at least one non-zero value
      return dataset.data.some(val => val > 0);
    });

    // Completion trend line - use completionTrend as percentage change
    // Show trend as a line indicating completion rate trend over time
    const completionTrend = data.completionTrend || 0;
    const completionRate = data.completionRate || 0;
    
    // Create trend data: start from completionRate and adjust by trend
    const trendData = labels.map((_, index) => {
      // Apply trend percentage change over the period
      const trendAdjustment = (completionTrend / 100) * (index / Math.max(labels.length - 1, 1));
      return completionRate + (trendAdjustment * completionRate);
    });

    // Ensure we have at least the completion trend line
    const datasets = [
      {
        label: `Completion Trend (${completionTrend > 0 ? '+' : ''}${completionTrend}%)`,
        type: 'line' as const,
        data: trendData,
        borderColor: '#28a745',
        backgroundColor: 'rgba(40, 167, 69, 0.1)',
        borderWidth: 3,
        fill: false,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        yAxisID: 'y1',
        order: 0
      },
      ...projectDatasets
    ];

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: labels,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top'
          },
          tooltip: {
            mode: 'index',
            intersect: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            position: 'left' as const,
            title: {
              display: true,
              text: 'High Priority Tasks Count'
            },
            stacked: true
          },
          y1: {
            type: 'linear' as const,
            display: true,
            position: 'right' as const,
            min: 0,
            max: 100,
            title: {
              display: true,
              text: 'Completion Rate (%)'
            },
            grid: {
              drawOnChartArea: false
            }
          },
          x: {
            stacked: true
          }
        }
      }
    };

    if (this.comboChart) {
      this.comboChart.destroy();
    }

    this.comboChart = new Chart(this.comboChartCanvas.nativeElement, config);
    this.hasComboChartData = true;
    console.log('DashboardComponent: Combo chart created successfully');
    console.log('DashboardComponent: Labels:', labels);
    console.log('DashboardComponent: Datasets count:', datasets.length);
    console.log('DashboardComponent: Project datasets:', projectDatasets.length);
    this.cdr.detectChanges();
  }

  private initializeCompletionRateChart(data: DashboardData): void {
    if (!this.completionRateCanvas?.nativeElement) {
      return;
    }

    const completionRate = data.completionRate || 0;
    const remainingRate = Math.max(0, 100 - completionRate);

    // Create a custom plugin for center text
    const centerTextPlugin = {
      id: 'centerText',
      beforeDraw: (chart: Chart<'doughnut'>) => {
        const ctx = chart.ctx;
        const centerX = chart.chartArea.left + (chart.chartArea.right - chart.chartArea.left) / 2;
        const centerY = chart.chartArea.top + (chart.chartArea.bottom - chart.chartArea.top) / 2;
        
        ctx.save();
        ctx.font = 'bold 20px Arial';
        ctx.fillStyle = '#28a745';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${completionRate.toFixed(1)}%`, centerX, centerY - 8);
        
        ctx.font = '12px Arial';
        ctx.fillStyle = '#6c757d';
        ctx.fillText('Rate', centerX, centerY + 12);
        ctx.restore();
      }
    };

    const config: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        labels: ['Completed', 'Remaining'],
        datasets: [{
          data: [completionRate, remainingRate],
          backgroundColor: ['#28a745', '#e9ecef'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '75%',
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                return `${context.label}: ${context.parsed}%`;
              }
            }
          }
        }
      },
      plugins: [centerTextPlugin]
    };

    if (this.completionRateChart) {
      this.completionRateChart.destroy();
    }

    this.completionRateChart = new Chart(this.completionRateCanvas.nativeElement, config);
  }

  private destroyCharts(): void {
    if (this.projectDistributionChart) {
      this.projectDistributionChart.destroy();
      this.projectDistributionChart = null;
    }
    if (this.taskStatusChart) {
      this.taskStatusChart.destroy();
      this.taskStatusChart = null;
    }
    if (this.dailyActivityChart) {
      this.dailyActivityChart.destroy();
      this.dailyActivityChart = null;
    }
    if (this.projectTaskDistributionChart) {
      this.projectTaskDistributionChart.destroy();
      this.projectTaskDistributionChart = null;
    }
    if (this.projectStatusBreakdownChart) {
      this.projectStatusBreakdownChart.destroy();
      this.projectStatusBreakdownChart = null;
    }
    if (this.comboChart) {
      this.comboChart.destroy();
      this.comboChart = null;
    }
    if (this.completionRateChart) {
      this.completionRateChart.destroy();
      this.completionRateChart = null;
    }
  }

  ngOnDestroy(): void {
    this.destroyCharts();
  }
}
