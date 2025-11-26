import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TransferService } from '../../services/transfer.service';
import { FilterService } from '../../services/filter.service';
import { AuthService } from '../../services/auth.service';
import { CreateTransferRequest, UpdateTransferRequest, TransferQueryParams } from '../../models/request.model';
import { Transfer } from '../../models/transfer.model';
import { Technician, Status } from '../../models/filter.model';
import { finalize, forkJoin } from 'rxjs';

@Component({
  selector: 'app-add-transfer',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './add-transfer.component.html'
})
export class AddTransferComponent implements OnInit {
  formData: CreateTransferRequest = {
    terminalNumber: '',
    ticketNo: '',
    rejectReason: '',
    fromTechId: 0,
    toTechId: 0,
    statusId: 0
  };
  loading = false;
  error: string | null = null;
  successMessage: string | null = null;

  // Add Transfer Modal
  showAddModal = false;

  // Batch Transfer Modal
  showBatchModal = false;
  batchTerminalNumbers: string = '';
  batchTicketNumbers: string = '';
  addingBatch = false;

  // Filter options
  technicians: Technician[] = [];
  statuses: Status[] = [];
  loadingFilters = true;

  // Transfer list
  transfers: Transfer[] = [];
  filteredTransfers: Transfer[] = [];
  paginatedTransfers: Transfer[] = [];
  loadingTransfers = true;
  transferError: string | null = null;

  // Filters
  fromDate: string = '';
  toDate: string = '';
  ticketNo: number | null = null;
  duplicateCount: number | null = null;
  terminalNumber: number | null = null;

  // Pagination
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalPages: number = 0;

  // Sorting
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'desc';

  // Edit modal
  showEditModal = false;
  editFormData: UpdateTransferRequest = {
    id: 0,
    terminalNumber: '',
    ticketNo: '',
    rejectReason: '',
    fromTechId: 0,
    toTechId: 0,
    statusId: 0
  };
  editingTransfer: Transfer | null = null;
  editing = false;

  // Delete confirmation
  showDeleteModal = false;
  deletingTransfer: Transfer | null = null;
  deleting = false;

  // Role and Permissions
  roleId: number | null = null;
  loadingRoleId = false;
  isAdmin = false; // RoleId === 1 means admin

  // Approve/Reject actions
  showRejectModal = false;
  rejectingTransfer: Transfer | null = null;
  rejectReasonText: string = '';
  updatingStatus = false;

  constructor(
    private transferService: TransferService,
    private filterService: FilterService,
    private authService: AuthService,
    public router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadRoleId();
    this.loadFilters();
    this.loadTransfers();
  }

  loadRoleId(): void {
    this.loadingRoleId = true;
    
    // Call /api/Auth/session with datatype="int" & key="RoleId"
    this.authService.getSession('int', 'RoleId').subscribe({
      next: (response) => {
        try {
          // The response has a "value" field containing the RoleId as string
          const roleIdStr = response.value || response.Value || '';
          if (roleIdStr) {
            this.roleId = parseInt(roleIdStr, 10);
            this.isAdmin = this.roleId === 1;
            console.log('AddTransferComponent: RoleId loaded:', this.roleId);
            console.log('AddTransferComponent: Is Admin (RoleId === 1):', this.isAdmin);
          } else {
            console.warn('AddTransferComponent: No RoleId value found in session response');
            this.roleId = null;
            this.isAdmin = false;
          }
        } catch (error) {
          console.error('AddTransferComponent: Error parsing RoleId:', error);
          this.roleId = null;
          this.isAdmin = false;
        }
        this.loadingRoleId = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('AddTransferComponent: Error loading RoleId:', err);
        this.roleId = null;
        this.isAdmin = false;
        this.loadingRoleId = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadFilters(): void {
    this.loadingFilters = true;
    this.filterService.getTechnicians().pipe(
      finalize(() => this.loadingFilters = false)
    ).subscribe({
      next: (technicians) => {
        this.technicians = technicians;
      },
      error: (err) => {
        console.error('Error loading technicians:', err);
      }
    });

    this.filterService.getStatuses().pipe(
      finalize(() => {})
    ).subscribe({
      next: (statuses) => {
        this.statuses = statuses;
      },
      error: (err) => {
        console.error('Error loading statuses:', err);
      }
    });
  }

  loadTransfers(): void {
    this.loadingTransfers = true;
    this.transferError = null;
    
    const params: TransferQueryParams = {};
    
    if (this.fromDate && this.fromDate.trim()) {
      params.fromDate = this.fromDate.trim();
    }
    if (this.toDate && this.toDate.trim()) {
      params.toDate = this.toDate.trim();
    }
    if (this.ticketNo !== null && this.ticketNo !== undefined && this.ticketNo !== 0) {
      params.ticketNo = this.ticketNo;
    }
    if (this.duplicateCount !== null && this.duplicateCount !== undefined && this.duplicateCount !== 0) {
      params.duplicateCount = this.duplicateCount;
    }
    if (this.terminalNumber !== null && this.terminalNumber !== undefined && this.terminalNumber !== 0) {
      params.terminalNumber = this.terminalNumber;
    }
    
    this.transferService.getAllTransfers(params).pipe(
      finalize(() => {
        this.loadingTransfers = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (transfers) => {
        this.transfers = transfers || [];
        this.applySorting();
        this.updatePagination();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.transferError = 'Failed to load transfers.';
        console.error('Error loading transfers:', err);
        this.cdr.detectChanges();
      }
    });
  }

  applySorting(): void {
    if (!this.sortColumn) {
      this.filteredTransfers = [...this.transfers];
      return;
    }

    this.filteredTransfers = [...this.transfers].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (this.sortColumn) {
        case 'terminalNumber':
          aValue = a.terminalNumber || '';
          bValue = b.terminalNumber || '';
          break;
        case 'ticketNo':
          aValue = a.ticketNo || '';
          bValue = b.ticketNo || '';
          break;
        case 'fromTech':
          aValue = a.fromTech || '';
          bValue = b.fromTech || '';
          break;
        case 'toTech':
          aValue = a.toTech || '';
          bValue = b.toTech || '';
          break;
        case 'statusName':
          aValue = a.statusName || '';
          bValue = b.statusName || '';
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'userName':
          aValue = a.userName || '';
          bValue = b.userName || '';
          break;
        case 'duplicateCount':
          aValue = a.duplicateCount || 0;
          bValue = b.duplicateCount || 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) {
        return this.sortDirection === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return this.sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  sort(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.applySorting();
    this.updatePagination();
    this.currentPage = 1;
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredTransfers.length / this.itemsPerPage);
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedTransfers = this.filteredTransfers.slice(startIndex, endIndex);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  handlePageClick(page: number | string): void {
    if (typeof page === 'number') {
      this.goToPage(page);
    }
  }

  clearFilters(): void {
    this.fromDate = '';
    this.toDate = '';
    this.ticketNo = null;
    this.duplicateCount = null;
    this.terminalNumber = null;
    this.currentPage = 1;
    this.loadTransfers();
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
    }
  }

  getPageNumbers(): (number | string)[] {
    const pages: (number | string)[] = [];
    const total = this.totalPages;
    const current = this.currentPage;

    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (current > 3) {
        pages.push('...');
      }
      for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
        pages.push(i);
      }
      if (current < total - 2) {
        pages.push('...');
      }
      pages.push(total);
    }

    return pages;
  }

  openAddModal(): void {
    this.showAddModal = true;
    this.error = null;
    this.successMessage = null;
    // Reset form - default status to Pending (1) if admin, otherwise 0 (will be set to 1 on submit)
    this.formData = {
      terminalNumber: '',
      ticketNo: '',
      rejectReason: '',
      fromTechId: 0,
      toTechId: 0,
      statusId: this.isAdmin ? 1 : 0
    };
  }

  closeAddModal(): void {
    this.showAddModal = false;
    this.error = null;
    this.successMessage = null;
    // Reset form - default status to Pending (1) if admin
    this.formData = {
      terminalNumber: '',
      ticketNo: '',
      rejectReason: '',
      fromTechId: 0,
      toTechId: 0,
      statusId: this.isAdmin ? 1 : 0
    };
  }

  onSubmit(): void {
    if (!this.validateForm()) {
      return;
    }

    this.loading = true;
    this.error = null;
    this.successMessage = null;

    // Prepare request data
    // If admin, use selected statusId, otherwise default to Pending (1)
    // Reject Reason only included if status is Rejected (3)
    const requestData: CreateTransferRequest = {
      terminalNumber: this.formData.terminalNumber,
      ticketNo: this.formData.ticketNo,
      fromTechId: this.formData.fromTechId,
      toTechId: this.formData.toTechId,
      statusId: this.isAdmin ? (this.formData.statusId || 1) : 1
    };

    // Only include rejectReason if status is Rejected (3)
    if (this.isAdmin && this.formData.statusId === 3 && this.formData.rejectReason) {
      (requestData as any).rejectReason = this.formData.rejectReason;
    }

    this.transferService.addTransfer(requestData).subscribe({
      next: () => {
        this.successMessage = 'Transfer added successfully.';
        this.loading = false;
        // Close modal after a short delay
        setTimeout(() => {
          this.closeAddModal();
          this.loadTransfers();
        }, 1000);
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to add transfer.';
        this.loading = false;
        console.error('Error adding transfer:', err);
      }
    });
  }

  openBatchModal(): void {
    this.showBatchModal = true;
    this.error = null;
    this.successMessage = null;
    // Reset textareas
    this.batchTerminalNumbers = '';
    this.batchTicketNumbers = '';
  }

  closeBatchModal(): void {
    this.showBatchModal = false;
    this.error = null;
    this.successMessage = null;
    this.batchTerminalNumbers = '';
    this.batchTicketNumbers = '';
  }

  onSubmitBatch(): void {
    // Parse terminal numbers (one per line)
    const terminalLines = this.batchTerminalNumbers
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    // Parse ticket numbers (one per line)
    const ticketLines = this.batchTicketNumbers
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    // Validate that we have at least one entry
    if (terminalLines.length === 0 || ticketLines.length === 0) {
      this.error = 'Please enter at least one Terminal Number and one Ticket Number.';
      return;
    }

    // Validate that counts match
    if (terminalLines.length !== ticketLines.length) {
      this.error = `Terminal Numbers count (${terminalLines.length}) must match Ticket Numbers count (${ticketLines.length}).`;
      return;
    }

    // Check if we have fromTechId and toTechId
    if (!this.formData.fromTechId || !this.formData.toTechId) {
      this.error = 'Please select From and To Technicians.';
      return;
    }

    this.addingBatch = true;
    this.error = null;
    this.successMessage = null;

    // Create array of transfer requests by matching terminal and ticket by line index
    const batchRequests: CreateTransferRequest[] = terminalLines.map((terminalNumber, index) => ({
      terminalNumber: terminalNumber.trim(),
      ticketNo: ticketLines[index].trim(),
      fromTechId: this.formData.fromTechId!,
      toTechId: this.formData.toTechId!,
      statusId: 1 // Default to Pending
    }));

    // Try batch endpoint first, fallback to individual requests if not available
    this.transferService.addBatchTransfers(batchRequests).subscribe({
      next: () => {
        this.addingBatch = false;
        this.successMessage = `${batchRequests.length} transfer(s) added successfully.`;
        setTimeout(() => {
          this.closeBatchModal();
          this.loadTransfers();
        }, 1500);
      },
      error: (err) => {
        // If batch endpoint doesn't exist (404), fallback to forkJoin
        if (err.status === 404) {
          console.log('Batch endpoint not available, using individual requests...');
          const requests = batchRequests.map(req => 
            this.transferService.addTransfer(req)
          );
          
          forkJoin(requests).subscribe({
            next: () => {
              this.addingBatch = false;
              this.successMessage = `${batchRequests.length} transfer(s) added successfully.`;
              setTimeout(() => {
                this.closeBatchModal();
                this.loadTransfers();
              }, 1500);
            },
            error: (forkErr) => {
              this.addingBatch = false;
              this.error = forkErr.error?.message || 'Failed to add batch transfers.';
              console.error('Error adding batch transfers:', forkErr);
            }
          });
        } else {
          this.addingBatch = false;
          this.error = err.error?.message || 'Failed to add batch transfers.';
          console.error('Error adding batch transfers:', err);
        }
      }
    });
  }

  openEditModal(transfer: Transfer): void {
    this.editingTransfer = transfer;
    const statusId = transfer.statusId || this.getStatusIdByName(transfer.statusName) || 1;
    this.editFormData = {
      id: transfer.id,
      terminalNumber: transfer.terminalNumber,
      ticketNo: transfer.ticketNo,
      rejectReason: transfer.rejectReason || '',
      fromTechId: transfer.fromTechId || this.getTechIdByName(transfer.fromTech),
      toTechId: transfer.toTechId || this.getTechIdByName(transfer.toTech),
      statusId: statusId
    };
    this.showEditModal = true;
  }

  onStatusChange(): void {
    // Clear reject reason if status is not Rejected (3)
    if (this.editFormData.statusId !== 3) {
      this.editFormData.rejectReason = '';
    }
  }

  onAddStatusChange(): void {
    // Clear reject reason if status is not Rejected (3)
    if (this.formData.statusId !== 3) {
      this.formData.rejectReason = '';
    }
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editingTransfer = null;
    this.error = null;
  }

  onUpdate(): void {
    if (!this.validateEditForm()) {
      return;
    }

    this.editing = true;
    this.error = null;

    this.transferService.updateTransfer(this.editFormData.id, this.editFormData).subscribe({
      next: () => {
        this.editing = false;
        this.closeEditModal();
        this.successMessage = 'Transfer updated successfully.';
        this.loadTransfers();
        setTimeout(() => {
          this.successMessage = null;
        }, 3000);
      },
      error: (err) => {
        this.editing = false;
        this.error = err.error?.message || 'Failed to update transfer.';
        console.error('Error updating transfer:', err);
      }
    });
  }

  openDeleteModal(transfer: Transfer): void {
    this.deletingTransfer = transfer;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.deletingTransfer = null;
  }

  onDelete(): void {
    if (!this.deletingTransfer) {
      return;
    }

    this.deleting = true;
    this.transferService.deleteTransfer(this.deletingTransfer.id).subscribe({
      next: () => {
        this.deleting = false;
        this.closeDeleteModal();
        this.successMessage = 'Transfer deleted successfully.';
        this.loadTransfers();
        setTimeout(() => {
          this.successMessage = null;
        }, 3000);
      },
      error: (err) => {
        this.deleting = false;
        this.error = err.error?.message || 'Failed to delete transfer.';
        console.error('Error deleting transfer:', err);
      }
    });
  }

  validateForm(): boolean {
    if (!this.formData.terminalNumber) {
      this.error = 'Terminal Number is required.';
      return false;
    }
    if (!this.formData.ticketNo) {
      this.error = 'Ticket No is required.';
      return false;
    }
    if (this.formData.fromTechId <= 0) {
      this.error = 'Please select From Technician.';
      return false;
    }
    if (this.formData.toTechId <= 0) {
      this.error = 'Please select To Technician.';
      return false;
    }
    if (this.formData.fromTechId === this.formData.toTechId) {
      this.error = 'From and To technicians cannot be the same.';
      return false;
    }
    return true;
  }

  validateEditForm(): boolean {
    if (!this.editFormData.terminalNumber) {
      this.error = 'Terminal Number is required.';
      return false;
    }
    if (!this.editFormData.ticketNo) {
      this.error = 'Ticket No is required.';
      return false;
    }
    if (this.editFormData.fromTechId <= 0) {
      this.error = 'Please select From Technician.';
      return false;
    }
    if (this.editFormData.toTechId <= 0) {
      this.error = 'Please select To Technician.';
      return false;
    }
    if (this.editFormData.fromTechId === this.editFormData.toTechId) {
      this.error = 'From and To technicians cannot be the same.';
      return false;
    }
    if (this.editFormData.statusId <= 0) {
      this.error = 'Please select Status.';
      return false;
    }
    return true;
  }

  getTechIdByName(name: string): number {
    const tech = this.technicians.find(t => t.techName === name);
    return tech ? tech.techId : 0;
  }

  getStatusIdByName(name: string): number {
    const status = this.statuses.find(s => s.statusName === name);
    return status ? status.statusId : 0;
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString();
  }

  getStartIndex(): number {
    return (this.currentPage - 1) * this.itemsPerPage + 1;
  }

  getEndIndex(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.filteredTransfers.length);
  }

  // Approve Transfer
  approveTransfer(transfer: Transfer): void {
    if (!confirm(`Approve transfer ${transfer.terminalNumber} (Ticket: ${transfer.ticketNo})?`)) {
      return;
    }

    this.updatingStatus = true;
    this.error = null;

    // Call PATCH /api/Transfer/{id}/ticket-status with statusId = 1 (Approved per user requirement)
    this.transferService.updateTicketStatus(transfer.id, 1).subscribe({
      next: () => {
        this.updatingStatus = false;
        this.successMessage = 'Transfer approved successfully.';
        this.loadTransfers();
        setTimeout(() => {
          this.successMessage = null;
        }, 3000);
      },
      error: (err) => {
        this.updatingStatus = false;
        this.error = err.error?.message || 'Failed to approve transfer.';
        console.error('Error approving transfer:', err);
      }
    });
  }

  // Open Reject Modal
  openRejectModal(transfer: Transfer): void {
    this.rejectingTransfer = transfer;
    this.rejectReasonText = '';
    this.showRejectModal = true;
    this.error = null;
  }

  closeRejectModal(): void {
    this.showRejectModal = false;
    this.rejectingTransfer = null;
    this.rejectReasonText = '';
    this.error = null;
  }

  // Reject Transfer
  rejectTransfer(): void {
    if (!this.rejectingTransfer) {
      return;
    }

    if (!this.rejectReasonText.trim()) {
      this.error = 'Please enter a reject reason.';
      return;
    }

    this.updatingStatus = true;
    this.error = null;

    // Call PATCH /api/Transfer/{id}/ticket-status with statusId = 2 (Rejected per user requirement) and rejectReason
    this.transferService.updateTicketStatus(this.rejectingTransfer.id, 2, this.rejectReasonText.trim()).subscribe({
      next: () => {
        this.updatingStatus = false;
        this.closeRejectModal();
        this.successMessage = 'Transfer rejected successfully.';
        this.loadTransfers();
        setTimeout(() => {
          this.successMessage = null;
        }, 3000);
      },
      error: (err) => {
        this.updatingStatus = false;
        this.error = err.error?.message || 'Failed to reject transfer.';
        console.error('Error rejecting transfer:', err);
      }
    });
  }
}
