import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpService } from '../../../services/http.service';
import { SessionService } from '../../../services/session.service';
import { UserService } from '../../../services/user.service';
import { UserColorService } from '../../../services/user-color.service';
import { ToastService } from '../../../services/toast.service';
import { API_CONFIG } from '../../../config/api.config';
import { DateUtil } from '../../../utils/date.util';
import { UserAvatarUtil } from '../../../utils/user-avatar.util';
import { ConfirmationModalComponent } from '../../components/confirmation-modal/confirmation-modal';
import { ExcelUtil } from '../../../utils/excel.util';

interface TransferTicket {
  id: number;
  terminalNumber: string;
  ticketNo: string;
  fromTech: string;
  toTech: string;
  statusName: string;
  createdAt: string;
  userName: string;
  duplicateCount: number;
  rejectReason: string;
}

interface Technician {
  techId: number;
  techName: string;
}

interface Status {
  statusId: number;
  statusName: string;
}

@Component({
  selector: 'app-transfer',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, DatePipe, ConfirmationModalComponent],
  templateUrl: './transfer.html',
  styleUrl: './transfer.scss'
})
export class TransferComponent implements OnInit, OnDestroy {
  transfers: TransferTicket[] = [];
  filteredTransfers: TransferTicket[] = [];
  isLoading = false;
  showAddModal = false;
  showBatchModal = false;
  showRejectModal = false;
  showDeleteModal = false;
  selectedTransferId = 0;
  rejectReason = '';
  deleteTransferId = 0;
  
  // Filters
  fromDate = DateUtil.getTodayISO();
  toDate = DateUtil.getTodayISO();
  ticketNo = '';
  terminalNumber = '';
  duplicateCount = '';
  
  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;
  totalItems = 0;
  
  // Form data
  formData = {
    terminalNumber: '',
    ticketNo: '',
    fromTechId: 0,
    toTechId: 0
  };
  
  batchTransfers: Array<{
    terminalNumber: string;
    ticketNo: string;
    fromTechId: number;
    toTechId: number;
  }> = [];
  
  // Reactive Form for Batch Transfer
  batchTransferForm: FormGroup;
  
  // Options
  technicians: Technician[] = [];
  statuses: Status[] = [];
  
  // Form subscription
  private batchFormSubscription?: Subscription;

  constructor(
    private httpService: HttpService,
    private sessionService: SessionService,
    private userService: UserService,
    private userColorService: UserColorService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private fb: FormBuilder
  ) {
    // Initialize the batch transfer form
    this.batchTransferForm = this.fb.group({
      fromTechId: [0, [Validators.required, Validators.min(1)]],
      toTechId: [0, [Validators.required, Validators.min(1)]],
      terminalNumbers: ['', Validators.required],
      ticketNumbers: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    if (!this.sessionService.hasPermission('GetTransferTickets')) {
      return;
    }
    // Load users for avatar display
    this.userService.loadAllUsers();
    this.loadTechnicians();
    this.loadStatuses();
    this.loadTransfers();
  }

  loadTechnicians(): void {
    this.httpService.get<Technician[]>(API_CONFIG.ENDPOINTS.FILTERS.TECHNICIANS).subscribe({
      next: (data) => {
        this.ngZone.run(() => {
          this.technicians = [...data];
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        });
      }
    });
  }

  loadStatuses(): void {
    this.httpService.get<Status[]>(API_CONFIG.ENDPOINTS.FILTERS.STATUSES).subscribe({
      next: (data) => {
        this.ngZone.run(() => {
          this.statuses = [...data];
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        });
      }
    });
  }

  loadTransfers(): void {
    this.isLoading = true;
    const params: any = {
      fromDate: this.fromDate,
      toDate: this.toDate,
      PageNumber: this.currentPage,
      PageSize: this.pageSize
    };
    
    // Add optional filters
    if (this.ticketNo) params.ticketNo = parseInt(this.ticketNo);
    if (this.terminalNumber) params.terminalNumber = parseInt(this.terminalNumber);
    if (this.duplicateCount) params.duplicateCount = parseInt(this.duplicateCount);

    this.httpService.get<TransferTicket[]>(API_CONFIG.ENDPOINTS.TRANSFER.GET_ALL, params).subscribe({
      next: (data) => {
        this.ngZone.run(() => {
          this.transfers = [...data];
          this.filteredTransfers = [...data];
          
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
          console.error('Error loading transfers:', error);
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
    this.loadTransfers();
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.loadTransfers();
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.loadTransfers();
  }

  openAddModal(): void {
    this.ngZone.run(() => {
      this.showAddModal = true;
      this.formData = {
        terminalNumber: '',
        ticketNo: '',
        fromTechId: 0,
        toTechId: 0
      };
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    });
  }

  closeAddModal(): void {
    this.ngZone.run(() => {
      this.showAddModal = false;
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    });
  }

  duplicateCurrentTransfer(): void {
    // Add current form data as a new row in batch transfers
    this.ngZone.run(() => {
      this.batchTransfers.push({
        terminalNumber: this.formData.terminalNumber,
        ticketNo: this.formData.ticketNo,
        fromTechId: this.formData.fromTechId,
        toTechId: this.formData.toTechId
      });
      this.toastService.info('Transfer data added to batch. You can continue adding more or create all at once.');
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    });
  }

  openBatchModal(): void {
    this.ngZone.run(() => {
      this.showBatchModal = true;
      // Reset form
      this.batchTransferForm.reset({
        fromTechId: 0,
        toTechId: 0,
        terminalNumbers: '',
        ticketNumbers: ''
      });
      this.batchTransfers = [];
      
      // Unsubscribe from previous subscription if exists
      if (this.batchFormSubscription) {
        this.batchFormSubscription.unsubscribe();
      }
      
      // Subscribe to form changes to update preview
      this.batchFormSubscription = this.batchTransferForm.valueChanges.subscribe(() => {
        this.parseBatchData();
      });
      
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    });
  }

  closeBatchModal(): void {
    this.ngZone.run(() => {
      this.showBatchModal = false;
      this.batchTransferForm.reset({
        fromTechId: 0,
        toTechId: 0,
        terminalNumbers: '',
        ticketNumbers: ''
      });
      this.batchTransfers = [];
      
      // Unsubscribe from form changes
      if (this.batchFormSubscription) {
        this.batchFormSubscription.unsubscribe();
        this.batchFormSubscription = undefined;
      }
      
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    });
  }

  parseBatchData(): void {
    // Parse textarea content into batch transfers
    // Terminal Numbers and Ticket Numbers are entered line by line
    // They should match in order (line 1 terminal with line 1 ticket, etc.)
    this.ngZone.run(() => {
      const terminalNumbers = this.batchTransferForm.get('terminalNumbers')?.value || '';
      const ticketNumbers = this.batchTransferForm.get('ticketNumbers')?.value || '';
      const fromTechId = this.batchTransferForm.get('fromTechId')?.value || 0;
      const toTechId = this.batchTransferForm.get('toTechId')?.value || 0;

      const terminalLines = terminalNumbers.split('\n').map((line: string) => line.trim()).filter((line: string) => line);
      const ticketLines = ticketNumbers.split('\n').map((line: string) => line.trim()).filter((line: string) => line);

      // Clear existing batch transfers
      this.batchTransfers = [];

      // Match terminal numbers with ticket numbers by line number
      const maxLines = Math.max(terminalLines.length, ticketLines.length);
      for (let i = 0; i < maxLines; i++) {
        const terminalNumber = terminalLines[i] || '';
        const ticketNo = ticketLines[i] || '';

        if (terminalNumber || ticketNo) {
          this.batchTransfers.push({
            terminalNumber: terminalNumber,
            ticketNo: ticketNo,
            fromTechId: fromTechId,
            toTechId: toTechId
          });
        }
      }

      this.cdr.markForCheck();
      this.cdr.detectChanges();
    });
  }

  createTransfer(): void {
    this.httpService.post(API_CONFIG.ENDPOINTS.TRANSFER.CREATE, this.formData).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.toastService.success('Transfer created successfully');
          this.closeAddModal();
          this.loadTransfers();
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        });
      },
      error: (error) => {
        this.ngZone.run(() => {
          console.error('Error creating transfer:', error);
          this.toastService.error('Failed to create transfer. Please try again.');
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        });
      }
    });
  }

  createBatchTransfers(): void {
    // Validate form
    if (this.batchTransferForm.invalid) {
      this.batchTransferForm.markAllAsTouched();
      const errors: string[] = [];
      
      if (this.batchTransferForm.get('fromTechId')?.invalid) {
        errors.push('From Technician is required');
      }
      if (this.batchTransferForm.get('toTechId')?.invalid) {
        errors.push('To Technician is required');
      }
      if (this.batchTransferForm.get('terminalNumbers')?.invalid) {
        errors.push('Terminal Numbers are required');
      }
      if (this.batchTransferForm.get('ticketNumbers')?.invalid) {
        errors.push('Ticket Numbers are required');
      }
      
      this.toastService.warning(errors.join('. '));
      return;
    }

    // Parse the textarea data into batch transfers
    this.parseBatchData();
    
    // Validate parsed data
    if (this.batchTransfers.length === 0) {
      this.toastService.warning('Please enter at least one terminal number and ticket number');
      return;
    }

    // Check if terminal and ticket counts match
    const terminalNumbersValue = this.batchTransferForm.get('terminalNumbers')?.value || '';
    const ticketNumbersValue = this.batchTransferForm.get('ticketNumbers')?.value || '';
    const terminalCount = terminalNumbersValue.split('\n').filter((l: string) => l.trim()).length;
    const ticketCount = ticketNumbersValue.split('\n').filter((l: string) => l.trim()).length;
    
    if (terminalCount !== ticketCount) {
      this.toastService.warning(`Terminal Numbers (${terminalCount}) and Ticket Numbers (${ticketCount}) count must match`);
      return;
    }

    // Filter valid transfers
    const transfers = this.batchTransfers.filter(t => 
      t.terminalNumber && t.ticketNo && t.fromTechId && t.toTechId
    );
    
    if (transfers.length === 0) {
      this.toastService.warning('Please enter valid transfer data');
      return;
    }
    
    let completed = 0;
    let errors = 0;
    
    transfers.forEach((transfer, index) => {
      this.httpService.post(API_CONFIG.ENDPOINTS.TRANSFER.CREATE, transfer).subscribe({
        next: () => {
          this.ngZone.run(() => {
            completed++;
            if (completed + errors === transfers.length) {
              if (completed > 0) {
                this.toastService.success(`${completed} transfer(s) created successfully`);
              }
              if (errors > 0) {
                this.toastService.warning(`${errors} transfer(s) failed`);
              }
              this.closeBatchModal();
              this.loadTransfers();
              this.cdr.markForCheck();
              this.cdr.detectChanges();
            }
          });
        },
        error: (error) => {
          this.ngZone.run(() => {
            errors++;
            console.error('Error creating transfer:', error);
            if (completed + errors === transfers.length) {
              if (completed > 0) {
                this.toastService.success(`${completed} transfer(s) created successfully`);
              }
              if (errors > 0) {
                this.toastService.error(`${errors} transfer(s) failed`);
              }
              this.closeBatchModal();
              this.loadTransfers();
              this.cdr.markForCheck();
              this.cdr.detectChanges();
            }
          });
        }
      });
    });
  }

  approveTransfer(id: number): void {
    console.log('=== APPROVE TRANSFER START ===');
    console.log('transfer id:', id);
    console.log('Available statuses:', this.statuses);
    
    // Try multiple ways to find approved status
    let approvedStatus = this.statuses.find(s => 
      s.statusName.toLowerCase() === 'approved' || 
      s.statusName.toLowerCase().includes('approved') ||
      s.statusName.toLowerCase() === 'approve'
    );
    
    // If still not found, try statusId 2 (common for approved)
    if (!approvedStatus && this.statuses.length > 0) {
      approvedStatus = this.statuses.find(s => s.statusId === 2);
    }
    
    if (!approvedStatus) {
      console.error('❌ Approved status not found. Available statuses:', this.statuses);
      this.toastService.error('Error: Approved status not found. Available statuses: ' + this.statuses.map(s => `${s.statusName} (${s.statusId})`).join(', '));
      return;
    }
    
    console.log('✅ Using approved status:', approvedStatus);
    const endpoint = API_CONFIG.ENDPOINTS.TRANSFER.UPDATE_STATUS(id);
    const payload = {
      statusId: approvedStatus.statusId,
      rejectReason: ''
    };
    console.log('📡 PATCH endpoint:', endpoint);
    console.log('📦 Payload:', JSON.stringify(payload));
    
    this.isLoading = true;
    this.cdr.detectChanges();
    
    this.httpService.patch(endpoint, payload).subscribe({
      next: (response) => {
        this.ngZone.run(() => {
          console.log('✅ Transfer approved successfully. Response:', response);
          
          // Update local state immediately for instant UI feedback
          const transferIndex = this.transfers.findIndex(t => t.id === id);
          if (transferIndex !== -1) {
            this.transfers[transferIndex].statusName = approvedStatus.statusName;
            this.transfers[transferIndex].rejectReason = '';
            this.filteredTransfers = [...this.transfers]; // Update filtered list
            console.log('✅ Updated local state for transfer id:', id);
          }
          
          this.isLoading = false;
          this.toastService.success('Transfer approved successfully');
          // Reload transfers to refresh the list from server
          console.log('🔄 Reloading transfers...');
          this.loadTransfers();
          this.cdr.markForCheck();
          this.cdr.detectChanges();
          console.log('=== APPROVE TRANSFER SUCCESS ===');
        });
      },
      error: (error) => {
        this.ngZone.run(() => {
          console.error('❌ Error approving transfer:', error);
          console.error('Error status:', error.status);
          console.error('Error message:', error.message);
          console.error('Error details:', error.error);
          this.isLoading = false;
          const errorMsg = error.error?.message || error.error?.title || error.message || 'Unknown error';
          this.toastService.error('Error approving transfer: ' + errorMsg);
          this.cdr.markForCheck();
          this.cdr.detectChanges();
          console.log('=== APPROVE TRANSFER ERROR ===');
        });
      }
    });
  }

  openRejectModal(id: number): void {
    this.ngZone.run(() => {
      this.selectedTransferId = id;
      this.rejectReason = '';
      this.showRejectModal = true;
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    });
  }

  closeRejectModal(): void {
    this.ngZone.run(() => {
      this.showRejectModal = false;
      this.selectedTransferId = 0;
      this.rejectReason = '';
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    });
  }

  rejectTransfer(): void {
    if (!this.rejectReason.trim()) {
      this.toastService.warning('Please provide a reject reason');
      return;
    }
    
    const rejectedStatus = this.statuses.find(s => s.statusName.toLowerCase().includes('rejected'));
    if (!rejectedStatus) {
      // If no rejected status found, use statusId 3 (typically rejected)
      const statusId = 3;
      this.httpService.patch(API_CONFIG.ENDPOINTS.TRANSFER.UPDATE_STATUS(this.selectedTransferId), {
        statusId: statusId,
        rejectReason: this.rejectReason
      }).subscribe({
        next: () => {
          this.ngZone.run(() => {
            this.toastService.success('Transfer rejected successfully');
            this.closeRejectModal();
            this.loadTransfers();
            this.cdr.markForCheck();
            this.cdr.detectChanges();
          });
        },
        error: (error) => {
          this.ngZone.run(() => {
            this.toastService.error('Failed to reject transfer');
            console.error('Error rejecting transfer:', error);
            this.cdr.markForCheck();
            this.cdr.detectChanges();
          });
        }
      });
      return;
    }
    
    this.httpService.patch(API_CONFIG.ENDPOINTS.TRANSFER.UPDATE_STATUS(this.selectedTransferId), {
      statusId: rejectedStatus.statusId,
      rejectReason: this.rejectReason
    }).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.toastService.success('Transfer rejected successfully');
          this.closeRejectModal();
          this.loadTransfers();
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        });
      },
      error: (error) => {
        this.ngZone.run(() => {
          this.toastService.error('Failed to reject transfer');
          console.error('Error rejecting transfer:', error);
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        });
      }
    });
  }

  openDeleteModal(id: number): void {
    this.ngZone.run(() => {
      this.deleteTransferId = id;
      this.showDeleteModal = true;
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    });
  }

  closeDeleteModal(): void {
    this.ngZone.run(() => {
      this.showDeleteModal = false;
      this.deleteTransferId = 0;
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    });
  }

  deleteTransfer(): void {
    if (!this.deleteTransferId) return;
    
    this.httpService.delete(API_CONFIG.ENDPOINTS.TRANSFER.DELETE(this.deleteTransferId)).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.toastService.success('Transfer deleted successfully');
          this.closeDeleteModal();
          this.loadTransfers();
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        });
      },
      error: (error) => {
        this.ngZone.run(() => {
          this.toastService.error('Failed to delete transfer');
          console.error('Error deleting transfer:', error);
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        });
      }
    });
  }

  ngOnDestroy(): void {
    // Clean up form subscription
    if (this.batchFormSubscription) {
      this.batchFormSubscription.unsubscribe();
    }
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

  getStatusClass(statusName: string): string {
    const status = statusName.toLowerCase();
    if (status.includes('approved') || status === 'approve') {
      return 'approved';
    }
    if (status.includes('rejected') || status === 'reject') {
      return 'rejected';
    }
    return 'pending';
  }

  exportToExcel(): void {
    const exportData = this.filteredTransfers.map(item => ({
      'Terminal Number': item.terminalNumber,
      'Ticket No': item.ticketNo,
      'From Tech': item.fromTech,
      'To Tech': item.toTech,
      'Status': item.statusName,
      'Created At': item.createdAt,
      'User Name': item.userName,
      'Duplicate Count': item.duplicateCount,
      'Reject Reason': item.rejectReason || ''
    }));
    
    ExcelUtil.exportToExcel(exportData, `transfers_${new Date().toISOString().split('T')[0]}`);
    this.toastService.success('Transfer data exported successfully');
  }
}
