import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpService } from '../../../services/http.service';
import { SessionService } from '../../../services/session.service';
import { UserService } from '../../../services/user.service';
import { ToastService } from '../../../services/toast.service';
import { API_CONFIG } from '../../../config/api.config';
import { DateUtil } from '../../../utils/date.util';
import { UserAvatarUtil } from '../../../utils/user-avatar.util';
import { BreadcrumbComponent } from '../../components/breadcrumb/breadcrumb';
import { ConfirmationModalComponent } from '../../components/confirmation-modal/confirmation-modal';
import { ExcelUtil } from '../../../utils/excel.util';

interface Paper {
  id: number;
  cancelledTerminalNo: string;
  deliveredTerminalNo: string;
  cancelledTicketNo: string;
  deliveredTicketNo: string;
  entryUser: string;
}

@Component({
  selector: 'app-paper-requests',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, BreadcrumbComponent, ConfirmationModalComponent],
  templateUrl: './paper-requests.html',
  styleUrl: './paper-requests.scss'
})
export class PaperRequestsComponent implements OnInit {
  papers: Paper[] = [];
  isLoading = false;
  showDeleteModal = false;
  deletePaperId = 0;
  showAddModal = false;
  
  // Filters
  fromDate = DateUtil.getTodayISO();
  toDate = DateUtil.getTodayISO();
  entryUser = -1;
  
  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;
  totalItems = 0;
  
  // Form data
  formData = {
    cancelledTerminalNo: '',
    deliveredTerminalNo: '',
    cancelledTicketNo: '',
    deliveredTicketNo: ''
  };
  
  editFormData = { ...this.formData, id: 0 };
  showEditModal = false;
  
  // Options
  users: Array<{ userId: number; name: string; avatarColor?: string }> = [];

  constructor(
    private httpService: HttpService,
    private sessionService: SessionService,
    private userService: UserService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    if (!this.sessionService.hasPermission('GetPapers')) {
      return;
    }
    // Load users for avatar display
    this.userService.loadAllUsers();
    this.loadUsers();
    this.loadPapers();
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

  loadPapers(): void {
    this.isLoading = true;
    const params: any = {
      fromDate: this.fromDate,
      toDate: this.toDate,
      PageNumber: this.currentPage,
      PageSize: this.pageSize
    };
    if (this.entryUser !== -1) params.entryUser = this.entryUser;

    this.httpService.get<Paper[]>(API_CONFIG.ENDPOINTS.PAPERS.GET_ALL, params).subscribe({
      next: (data) => {
        this.ngZone.run(() => {
        this.papers = [...data];
        
        // Calculate total pages
        if (data.length < this.pageSize) {
          this.totalPages = this.currentPage;
        } else {
          this.totalPages = this.currentPage + 1;
        }
        
        this.totalItems = (this.currentPage - 1) * this.pageSize + data.length;
        this.isLoading = false;
          this.cdr.markForCheck();
        this.cdr.detectChanges();
        });
      },
      error: (error) => {
        this.ngZone.run(() => {
        console.error('Error loading papers:', error);
        this.isLoading = false;
          this.cdr.markForCheck();
        this.cdr.detectChanges();
        });
      }
    });
  }

  onPageChange(page: number): void {
    if (page < 1 || (this.totalPages > 0 && page > this.totalPages)) return;
    this.currentPage = page;
    this.loadPapers();
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.loadPapers();
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.loadPapers();
  }

  resetFilters(): void {
    this.fromDate = DateUtil.getTodayISO();
    this.toDate = DateUtil.getTodayISO();
    this.entryUser = -1;
    this.currentPage = 1;
    this.loadPapers();
  }

  openAddModal(): void {
    this.showAddModal = true;
    this.formData = {
      cancelledTerminalNo: '',
      deliveredTerminalNo: '',
      cancelledTicketNo: '',
      deliveredTicketNo: ''
    };
  }

  closeAddModal(): void {
    this.showAddModal = false;
  }

  openEditModal(paper: Paper): void {
    this.showEditModal = true;
    this.editFormData = {
      id: paper.id,
      cancelledTerminalNo: paper.cancelledTerminalNo,
      deliveredTerminalNo: paper.deliveredTerminalNo,
      cancelledTicketNo: paper.cancelledTicketNo,
      deliveredTicketNo: paper.deliveredTicketNo
    };
  }

  closeEditModal(): void {
    this.showEditModal = false;
  }

  createPaper(): void {
    this.httpService.post(API_CONFIG.ENDPOINTS.PAPERS.CREATE, this.formData).subscribe({
      next: () => {
        this.toastService.success('Paper request created successfully');
        this.closeAddModal();
        this.loadPapers();
      },
      error: (error) => {
        this.toastService.error('Failed to create paper request');
        console.error('Error creating paper request:', error);
      }
    });
  }

  updatePaper(): void {
    this.httpService.put(API_CONFIG.ENDPOINTS.PAPERS.UPDATE(this.editFormData.id), this.editFormData).subscribe({
      next: () => {
        this.toastService.success('Paper request updated successfully');
        this.closeEditModal();
        this.loadPapers();
      },
      error: (error) => {
        this.toastService.error('Failed to update paper request');
        console.error('Error updating paper request:', error);
      }
    });
  }

  openDeleteModal(id: number): void {
    this.deletePaperId = id;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.deletePaperId = 0;
  }

  deletePaper(): void {
    if (!this.deletePaperId) return;
    
    this.httpService.delete(API_CONFIG.ENDPOINTS.PAPERS.DELETE(this.deletePaperId)).subscribe({
      next: () => {
        this.toastService.success('Paper request deleted successfully');
        this.closeDeleteModal();
        this.loadPapers();
      },
      error: (error) => {
        this.toastService.error('Failed to delete paper request');
        console.error('Error deleting paper request:', error);
      }
    });
  }

  exportToExcel(): void {
    const exportData = this.papers.map(paper => ({
      'Cancelled Terminal No': paper.cancelledTerminalNo,
      'Delivered Terminal No': paper.deliveredTerminalNo,
      'Cancelled Ticket No': paper.cancelledTicketNo,
      'Delivered Ticket No': paper.deliveredTicketNo,
      'Entry User': paper.entryUser
    }));
    
    ExcelUtil.exportToExcel(exportData, `paper_requests_${new Date().toISOString().split('T')[0]}`);
    this.toastService.success('Paper requests data exported successfully');
  }

  getUserAvatarColor(userName: string): string {
    // Use centralized method that checks session first for current user
    return UserAvatarUtil.getUserAvatarColorByName(userName, this.sessionService, this.userService);
  }

  getUserInitials(userName: string): string {
    return UserAvatarUtil.getInitials(userName);
  }
}
