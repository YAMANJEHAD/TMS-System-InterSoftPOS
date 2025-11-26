import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JobOrderService } from '../../services/job-order.service';
import { JobOrder } from '../../models/job-order.model';
import { CreateJobOrderRequest, JobOrderQueryParams } from '../../models/request.model';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-job-orders',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule],
  templateUrl: './job-orders.component.html',
  styleUrls: ['./job-orders.component.css']
})
export class JobOrdersComponent implements OnInit {
  jobOrders: JobOrder[] = [];
  loading = true;
  error: string | null = null;
  successMessage: string | null = null;

  // Filter parameters
  filters: JobOrderQueryParams = {
    month: 0,
    year: 0
  };

  // Current date for default values
  currentDate = new Date();
  currentYear = this.currentDate.getFullYear();
  currentMonth = this.currentDate.getMonth() + 1; // JavaScript months are 0-indexed

  // Create Job Order Modal
  showCreateModal = false;
  newJobOrder: CreateJobOrderRequest = {
    dueDate: '',
    title: '',
    description: '',
    ids: '',
    fileName: '',
    filePath: ''
  };
  creatingJobOrder = false;

  constructor(private jobOrderService: JobOrderService) {}

  ngOnInit(): void {
    // Set default filters to current month/year
    this.filters.month = this.currentMonth;
    this.filters.year = this.currentYear;
    this.loadJobOrders();
  }

  loadJobOrders(): void {
    this.loading = true;
    this.error = null;
    
    // Build query params (only include non-zero values)
    const params: JobOrderQueryParams = {};
    if (this.filters.month && this.filters.month > 0) {
      params.month = this.filters.month;
    }
    if (this.filters.year && this.filters.year > 0) {
      params.year = this.filters.year;
    }

    this.jobOrderService.getAllJobOrders(Object.keys(params).length > 0 ? params : undefined).pipe(
      finalize(() => this.loading = false)
    ).subscribe({
      next: (orders) => {
        this.jobOrders = orders;
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to load job orders.';
        console.error('Error:', err);
      }
    });
  }

  applyFilters(): void {
    this.loadJobOrders();
  }

  clearFilters(): void {
    this.filters = {
      month: 0,
      year: 0
    };
    this.loadJobOrders();
  }

  openCreateModal(): void {
    // Set default due date to today (format for datetime-local input)
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const hours = String(today.getHours()).padStart(2, '0');
    const minutes = String(today.getMinutes()).padStart(2, '0');
    const datetimeLocal = `${year}-${month}-${day}T${hours}:${minutes}`;
    
    this.newJobOrder = {
      dueDate: datetimeLocal,
      title: '',
      description: '',
      ids: '',
      fileName: '',
      filePath: ''
    };
    this.showCreateModal = true;
    this.error = null;
    this.successMessage = null;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.newJobOrder = {
      dueDate: '',
      title: '',
      description: '',
      ids: '',
      fileName: '',
      filePath: ''
    };
  }

  createJobOrder(): void {
    if (!this.validateCreateJobOrder()) {
      return;
    }

    this.creatingJobOrder = true;
    this.error = null;
    this.successMessage = null;

    // Convert datetime-local format to ISO string
    const jobOrderToSend: CreateJobOrderRequest = {
      ...this.newJobOrder,
      dueDate: new Date(this.newJobOrder.dueDate).toISOString()
    };

    this.jobOrderService.createJobOrder(jobOrderToSend).pipe(
      finalize(() => this.creatingJobOrder = false)
    ).subscribe({
      next: () => {
        this.successMessage = 'Job order created successfully.';
        this.closeCreateModal();
        this.loadJobOrders();
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to create job order.';
        console.error('Error creating job order:', err);
      }
    });
  }

  validateCreateJobOrder(): boolean {
    if (!this.newJobOrder.title || !this.newJobOrder.description || !this.newJobOrder.dueDate) {
      this.error = 'Please fill in all required fields (Title, Description, Due Date).';
      return false;
    }
    return true;
  }

  dismissError(): void {
    this.error = null;
  }

  dismissSuccess(): void {
    this.successMessage = null;
  }

  // Helper to get month names
  getMonthName(month: number): string {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1] || '';
  }

  // Generate years array (current year ± 5 years)
  getYears(): number[] {
    const years: number[] = [];
    for (let i = this.currentYear - 5; i <= this.currentYear + 5; i++) {
      years.push(i);
    }
    return years;
  }
}

