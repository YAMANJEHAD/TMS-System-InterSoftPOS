import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpService } from '../../../services/http.service';
import { SessionService } from '../../../services/session.service';
import { UserService } from '../../../services/user.service';
import { UserColorService } from '../../../services/user-color.service';
import { ToastService } from '../../../services/toast.service';
import { API_CONFIG } from '../../../config/api.config';
import { FileUtil } from '../../../utils/file.util';
import { UserAvatarUtil } from '../../../utils/user-avatar.util';
import { BreadcrumbComponent } from '../../components/breadcrumb/breadcrumb';
import { ExcelUtil } from '../../../utils/excel.util';

interface JobOrder {
  taskId: number;
  fullTitle: string;
  title: string;
  description: string;
  dueDate: string;
  createdAt: string;
  createdById: number;
  userName: string;
  statusName: string;
  projectName: string;
  fileName: string;
  filePath: string;
}

@Component({
  selector: 'app-job-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, BreadcrumbComponent],
  templateUrl: './job-orders.html',
  styleUrl: './job-orders.scss'
})
export class JobOrdersComponent implements OnInit {
  jobOrders: JobOrder[] = [];
  isLoading = false;
  showAddModal = false;
  
  // Filters
  month = 0;
  year = 0;
  
  // Month options for dropdown
  monthOptions = [
    { value: 1, name: 'January' },
    { value: 2, name: 'February' },
    { value: 3, name: 'March' },
    { value: 4, name: 'April' },
    { value: 5, name: 'May' },
    { value: 6, name: 'June' },
    { value: 7, name: 'July' },
    { value: 8, name: 'August' },
    { value: 9, name: 'September' },
    { value: 10, name: 'October' },
    { value: 11, name: 'November' },
    { value: 12, name: 'December' }
  ];
  
  // Year options for dropdown (current year ± 5 years)
  yearOptions: number[] = [];
  
  // Form data
  formData = {
    dueDate: '',
    title: '',
    description: '',
    ids: '',
    fileName: '',
    fileBase64String: ''
  };
  
  selectedFile: File | null = null;

  constructor(
    private httpService: HttpService,
    private sessionService: SessionService,
    private userService: UserService,
    private userColorService: UserColorService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    if (!this.sessionService.hasPermission('GetJobOrders')) {
      return;
    }
    // Load users for avatar display
    this.userService.loadAllUsers();
    this.initializeYearOptions();
    this.loadJobOrders();
  }

  initializeYearOptions(): void {
    const currentYear = new Date().getFullYear();
    // Generate years from 5 years ago to 5 years in the future
    for (let i = currentYear - 5; i <= currentYear + 5; i++) {
      this.yearOptions.push(i);
    }
    // Sort in descending order (newest first)
    this.yearOptions.sort((a, b) => b - a);
  }

  loadJobOrders(): void {
    this.isLoading = true;
    const params: any = {};
    if (this.month) params.month = this.month;
    if (this.year) params.year = this.year;

    this.httpService.get<JobOrder[]>(API_CONFIG.ENDPOINTS.JOB_ORDERS.GET_ALL, params).subscribe({
      next: (data) => {
        this.ngZone.run(() => {
        this.jobOrders = [...data];
        this.isLoading = false;
          this.cdr.markForCheck();
        this.cdr.detectChanges();
        });
      },
      error: (error) => {
        this.ngZone.run(() => {
        console.error('Error loading job orders:', error);
        this.isLoading = false;
          this.cdr.markForCheck();
        this.cdr.detectChanges();
        });
      }
    });
  }

  applyFilters(): void {
    this.loadJobOrders();
  }

  resetFilters(): void {
    this.month = 0;
    this.year = 0;
    this.loadJobOrders();
  }

  openAddModal(): void {
    this.showAddModal = true;
    this.formData = {
      dueDate: '',
      title: '',
      description: '',
      ids: '',
      fileName: '',
      fileBase64String: ''
    };
    this.selectedFile = null;
  }

  closeAddModal(): void {
    this.showAddModal = false;
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.formData.fileName = file.name;
      FileUtil.handleFileUpload(file).then(result => {
        this.formData.fileBase64String = result.fileBase64String;
      });
    }
  }

  createJobOrder(): void {
    this.httpService.post(API_CONFIG.ENDPOINTS.JOB_ORDERS.CREATE, this.formData).subscribe({
      next: () => {
        this.toastService.success('Job order created successfully');
        this.closeAddModal();
        this.loadJobOrders();
      },
      error: (error) => {
        this.toastService.error('Failed to create job order');
        console.error('Error creating job order:', error);
      }
    });
  }

  getUserAvatarColor(userName: string): string {
    // Get color from service (fixed, non-reactive)
    const user = this.userService.getUserByName(userName);
    if (user) {
      return this.userColorService.getColor(user.userId);
    }
    return '#0A1A3A'; // Default
  }

  getUserInitials(userName: string): string {
    return UserAvatarUtil.getInitials(userName);
  }

  exportToExcel(): void {
    const exportData = this.jobOrders.map(order => ({
      'Task ID': order.taskId,
      'Title': order.title,
      'Description': order.description || '',
      'Due Date': order.dueDate,
      'Created At': order.createdAt,
      'User': order.userName,
      'Status': order.statusName,
      'Project': order.projectName,
      'File': order.fileName || ''
    }));
    
    ExcelUtil.exportToExcel(exportData, `job_orders_${new Date().toISOString().split('T')[0]}`);
    this.toastService.success('Job orders data exported successfully');
  }
}
