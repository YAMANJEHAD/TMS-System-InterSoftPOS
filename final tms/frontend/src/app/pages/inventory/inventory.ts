import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpService } from '../../../services/http.service';
import { SessionService } from '../../../services/session.service';
import { UserService } from '../../../services/user.service';
import { ToastService } from '../../../services/toast.service';
import { API_CONFIG } from '../../../config/api.config';
import { UserAvatarUtil } from '../../../utils/user-avatar.util';
import { BreadcrumbComponent } from '../../components/breadcrumb/breadcrumb';
import { ConfirmationModalComponent } from '../../components/confirmation-modal/confirmation-modal';
import { ExcelUtil } from '../../../utils/excel.util';
import { DateUtil } from '../../../utils/date.util';

interface InventoryItem {
  terminalId: number;
  terminalNumber: string;
  entryDate: string;
  altTerminalNumber: string;
  serialNumber: string;
  altSerialNumber: string;
  rejectReason: string;
  techName: string;
  statusName: string;
  userName: string;
  reasonName: string;
}

interface Reason {
  reasonId: number;
  reasonName: string;
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
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, BreadcrumbComponent, ConfirmationModalComponent],
  templateUrl: './inventory.html',
  styleUrl: './inventory.scss'
})
export class InventoryComponent implements OnInit {
  inventory: InventoryItem[] = [];
  filteredInventory: InventoryItem[] = [];
  isLoading = false;
  showAddModal = false;
  showTechnicianModal = false;
  showRejectModal = false;
  showDeleteModal = false;
  selectedTerminalId = 0;
  rejectReason = '';
  deleteTerminalId = 0;
  
  // Filters
  statusId = 1; // Default to Pending
  userId = -1;
  techId = -1;
  fromDate = DateUtil.getTodayISO();
  toDate = DateUtil.getTodayISO();
  
  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;
  totalItems = 0;
  
  // Form data
  formData = {
    terminalNumber: '',
    reasonId: 0,
    altTerminalNumber: '',
    techId: 0,
    serialNumber: '',
    altSerialNumber: ''
  };
  
  newTechnicianName = '';
  
  // Options
  reasons: Reason[] = [];
  technicians: Technician[] = [];
  statuses: Status[] = [];
  users: Array<{ userId: number; name: string; avatarColor?: string }> = [];
  
  // Stats
  totalEntries = 0;
  todayEntries = 0;
  reasonCounts: Array<{ reasonName: string; count: number }> = [];

  constructor(
    private httpService: HttpService,
    private sessionService: SessionService,
    private userService: UserService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    if (!this.sessionService.hasPermission('GetByStatus')) {
      return;
    }
    // Load filters first
    this.loadFilters();
    // Load inventory with default statusId (will be updated if needed after statuses load)
    // Use a small delay to ensure statusId validation happens
    setTimeout(() => {
      if (this.statusId > 0) {
    this.loadInventory();
      }
    }, 100);
    this.loadStats();
  }

  loadFilters(): void {
    // Load Reasons
    this.httpService.get<Reason[]>(API_CONFIG.ENDPOINTS.FILTERS.REASONS).subscribe({
      next: (data) => {
        this.ngZone.run(() => {
          this.reasons = Array.isArray(data) ? [...data] : [];
          console.log('Loaded reasons:', this.reasons.length);
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        });
      },
      error: (error) => {
        this.ngZone.run(() => {
          console.error('Error loading reasons:', error);
          this.reasons = [];
          this.cdr.markForCheck();
        this.cdr.detectChanges();
        });
      }
    });

    // Load Technicians
    this.httpService.get<Technician[]>(API_CONFIG.ENDPOINTS.FILTERS.TECHNICIANS).subscribe({
      next: (data) => {
        this.ngZone.run(() => {
          this.technicians = Array.isArray(data) ? [...data] : [];
          console.log('Loaded technicians:', this.technicians.length, this.technicians);
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        });
      },
      error: (error) => {
        this.ngZone.run(() => {
          console.error('Error loading technicians:', error);
          this.technicians = [];
          this.toastService.error('Failed to load technicians');
          this.cdr.markForCheck();
        this.cdr.detectChanges();
        });
      }
    });

    // Load Statuses
    this.httpService.get<Status[]>(API_CONFIG.ENDPOINTS.FILTERS.STATUSES).subscribe({
      next: (data) => {
        this.ngZone.run(() => {
          if (!Array.isArray(data)) {
            console.error('Statuses API returned non-array:', data);
            this.statuses = [];
            this.cdr.markForCheck();
            this.cdr.detectChanges();
            return;
          }

          console.log('All statuses from API:', data);
          
          // Filter to only show Pending, Approved, and Rejected
          const allowedStatuses = ['pending', 'approved', 'rejected'];
          this.statuses = data.filter(status => {
            if (!status || !status.statusName) return false;
            const statusNameLower = status.statusName.toLowerCase();
            return allowedStatuses.some(allowed => statusNameLower.includes(allowed));
          });
          
          console.log('Filtered statuses:', this.statuses);
          
          // If no statuses match the filter, show all statuses as fallback
          if (this.statuses.length === 0) {
            console.warn('No statuses matched filter criteria, showing all statuses');
            this.statuses = data;
          }
          
          // Set default statusId to Pending if not already set or if current statusId is not in filtered list
          if (this.statuses.length > 0) {
            const pendingStatus = this.statuses.find(s => s.statusName.toLowerCase().includes('pending'));
            let shouldLoadInventory = false;
            
            if (pendingStatus) {
              // Only update if current statusId is not in the filtered list
              const currentStatusExists = this.statuses.find(s => s.statusId === this.statusId);
              if (!currentStatusExists) {
                console.log('Setting statusId to Pending:', pendingStatus.statusId);
                this.statusId = pendingStatus.statusId;
                shouldLoadInventory = true;
              }
            } else {
              // If no pending status found, use first status
              console.log('No pending status found, using first status:', this.statuses[0].statusId);
              this.statusId = this.statuses[0].statusId;
              shouldLoadInventory = true;
            }
            
            // Load inventory after statusId is set (only on initial load)
            if (shouldLoadInventory && this.inventory.length === 0) {
              // Use setTimeout to ensure this runs after the current zone execution
              setTimeout(() => {
                this.ngZone.run(() => {
                  this.loadInventory();
                });
              }, 0);
            }
          } else {
            console.warn('No statuses available, cannot load inventory');
          }
          
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        });
      },
      error: (error) => {
        this.ngZone.run(() => {
          console.error('Error loading statuses:', error);
          this.statuses = [];
          this.toastService.error('Failed to load statuses');
          this.cdr.markForCheck();
        this.cdr.detectChanges();
        });
      }
    });

    // Load Users
    this.httpService.get<Array<{ userId: number; name: string }>>(API_CONFIG.ENDPOINTS.FILTERS.USERS).subscribe({
      next: (data) => {
        this.ngZone.run(() => {
          this.users = Array.isArray(data) ? [...data] : [];
          console.log('Loaded users:', this.users.length, this.users);
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        });
      },
      error: (error) => {
        this.ngZone.run(() => {
          console.error('Error loading users:', error);
          this.users = [];
          this.toastService.error('Failed to load users');
          this.cdr.markForCheck();
        this.cdr.detectChanges();
        });
      }
    });
  }

  loadInventory(): void {
    // Validate statusId before making API call
    if (!this.statusId || this.statusId <= 0) {
      console.warn('Invalid statusId:', this.statusId, 'Using default statusId = 1');
      this.statusId = 1;
    }

    console.log('Loading inventory with statusId:', this.statusId, 'params:', {
      fromDate: this.fromDate,
      toDate: this.toDate,
      userId: this.userId,
      currentPage: this.currentPage,
      pageSize: this.pageSize
    });

    this.isLoading = true;
    const params: any = {
      PageNumber: this.currentPage,
      PageSize: this.pageSize
    };
    
    // Add optional filters
    if (this.fromDate) params.fromDate = this.fromDate;
    if (this.toDate) params.toDate = this.toDate;
    if (this.userId !== -1 && this.userId > 0) params.entryUser = this.userId;

    const endpoint = API_CONFIG.ENDPOINTS.INVENTORY.GET_BY_STATUS(this.statusId);
    console.log('Calling endpoint:', endpoint, 'with params:', params);

    this.httpService.get<InventoryItem[]>(endpoint, params).subscribe({
      next: (data) => {
        this.ngZone.run(() => {
          console.log('Inventory data received:', data?.length || 0, 'items');
          this.inventory = Array.isArray(data) ? [...data] : [];
        
        // Apply client-side filtering for techId (not supported by API)
        this.applyClientFilters();
        
        // Calculate total pages
          if (this.inventory.length < this.pageSize) {
          this.totalPages = this.currentPage;
        } else {
          this.totalPages = this.currentPage + 1;
        }
        
          this.totalItems = (this.currentPage - 1) * this.pageSize + this.inventory.length;
        this.isLoading = false;
          console.log('Inventory loaded. Total items:', this.totalItems, 'Filtered items:', this.filteredInventory.length);
          this.cdr.markForCheck();
        this.cdr.detectChanges();
        });
      },
      error: (error) => {
        this.ngZone.run(() => {
        console.error('Error loading inventory:', error);
          console.error('Error details:', {
            status: error.status,
            message: error.message,
            error: error.error
          });
          this.inventory = [];
          this.filteredInventory = [];
        this.isLoading = false;
          this.toastService.error('Failed to load inventory. Please check console for details.');
          this.cdr.markForCheck();
        this.cdr.detectChanges();
        });
      }
    });
  }

  applyClientFilters(): void {
    // Client-side filtering for techId (since it's not in API)
    let filtered = Array.isArray(this.inventory) ? [...this.inventory] : [];
    
    if (this.techId !== -1 && this.techId > 0) {
        const tech = this.technicians.find(t => t.techId === this.techId);
      if (tech) {
        filtered = filtered.filter(item => item.techName === tech.techName);
        console.log('Applied tech filter. Tech:', tech.techName, 'Filtered count:', filtered.length);
      } else {
        console.warn('Tech not found for techId:', this.techId);
      }
    }
    
    this.filteredInventory = [...filtered];
    console.log('Client filters applied. Total inventory:', this.inventory.length, 'Filtered:', this.filteredInventory.length);
    
    // Ensure change detection
    this.ngZone.run(() => {
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    });
  }

  onPageChange(page: number): void {
    if (page < 1 || (this.totalPages > 0 && page > this.totalPages)) return;
    this.currentPage = page;
    this.loadInventory();
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.loadInventory();
  }

  loadStats(): void {
    // Load inventory chart data for stats
    this.httpService.get<any[]>(API_CONFIG.ENDPOINTS.INVENTORY.CHART).subscribe({
      next: (data) => {
        this.ngZone.run(() => {
        // Calculate stats from chart data
        const sessionData = this.sessionService.getSessionData();
        if (sessionData) {
          // Total entries for current user
          const userData = data.filter(d => d.userId === sessionData.userId);
          this.totalEntries = userData.length > 0 ? userData[0].count : 0;
          
          // Today's entries - filter by entryDate matching today
          const today = new Date().toISOString().split('T')[0];
          const todayData = data.filter(d => {
            if (!d.entryDate) return false;
            const entryDateStr = new Date(d.entryDate).toISOString().split('T')[0];
            return entryDateStr === today && d.userId === sessionData.userId;
          });
          this.todayEntries = todayData.reduce((sum, d) => sum + (d.count || 0), 0);
          
          // Reason counts - filter by reasonName and userId
          const reasonData = data.filter(d => d.reasonName && d.userId === sessionData.userId);
          const reasonMap = new Map<string, number>();
          reasonData.forEach(d => {
            const count = reasonMap.get(d.reasonName) || 0;
            reasonMap.set(d.reasonName, count + (d.count || 0));
          });
          this.reasonCounts = [...Array.from(reasonMap.entries())
            .map(([name, count]) => ({ reasonName: name, count }))
            .sort((a, b) => b.count - a.count)];
        }
          this.cdr.markForCheck();
        this.cdr.detectChanges();
        });
      },
      error: (error) => {
        this.ngZone.run(() => {
        console.error('Error loading inventory stats:', error);
          this.cdr.markForCheck();
        this.cdr.detectChanges();
        });
      }
    });
  }


  openAddModal(): void {
    this.showAddModal = true;
    this.formData = {
      terminalNumber: '',
      reasonId: 0,
      altTerminalNumber: '',
      techId: 0,
      serialNumber: '',
      altSerialNumber: ''
    };
  }

  closeAddModal(): void {
    this.showAddModal = false;
  }

  openTechnicianModal(): void {
    this.showTechnicianModal = true;
    this.newTechnicianName = '';
  }

  closeTechnicianModal(): void {
    this.showTechnicianModal = false;
    this.newTechnicianName = '';
  }

  addTechnicianFromModal(): void {
    if (!this.newTechnicianName || !this.newTechnicianName.trim()) {
      this.toastService.warning('Please enter a technician name');
      return;
    }
    this.createTechnician();
  }

  createInventory(): void {
    this.httpService.post(API_CONFIG.ENDPOINTS.INVENTORY.CREATE, this.formData).subscribe({
      next: () => {
        this.toastService.success('Inventory item created successfully');
        this.closeAddModal();
        this.loadInventory();
        this.loadStats();
      },
      error: (error) => {
        this.toastService.error('Failed to create inventory item');
        console.error('Error creating inventory:', error);
      }
    });
  }

  createTechnician(): void {
    this.httpService.post(API_CONFIG.ENDPOINTS.INVENTORY.INSERT_TECHNICIAN, this.newTechnicianName).subscribe({
      next: () => {
        this.toastService.success('Technician created successfully');
        this.closeTechnicianModal();
        this.loadFilters();
      },
      error: (error) => {
        this.toastService.error('Failed to create technician');
        console.error('Error creating technician:', error);
      }
    });
  }

  approveInventory(terminalId: number): void {
    console.log('=== APPROVE INVENTORY START ===');
    console.log('terminalId:', terminalId);
    console.log('Available statuses:', this.statuses);
    console.log('Current statusId filter:', this.statusId);
    
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
    const endpoint = API_CONFIG.ENDPOINTS.INVENTORY.UPDATE_STATUS(terminalId);
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
        console.log('✅ Inventory approved successfully. Response:', response);
        
        // Update local state immediately for instant UI feedback
        const itemIndex = this.inventory.findIndex(item => item.terminalId === terminalId);
        if (itemIndex !== -1) {
          this.inventory[itemIndex].statusName = approvedStatus.statusName;
          this.inventory[itemIndex].rejectReason = '';
          this.applyFilters(); // Re-apply filters to update filteredInventory
          console.log('✅ Updated local state for terminalId:', terminalId);
        }
        
        this.isLoading = false;
        this.toastService.success('Inventory item approved successfully');
        // Reload inventory with current filter to refresh the list from server
        console.log('🔄 Reloading inventory with statusId:', this.statusId);
        this.loadInventory();
        this.loadStats();
        this.cdr.detectChanges();
        console.log('=== APPROVE INVENTORY SUCCESS ===');
      },
      error: (error) => {
        console.error('❌ Error approving inventory:', error);
        console.error('Error status:', error.status);
        console.error('Error message:', error.message);
        console.error('Error details:', error.error);
        this.isLoading = false;
        const errorMsg = error.error?.message || error.error?.title || error.message || 'Unknown error';
        this.toastService.error('Error approving inventory: ' + errorMsg);
        this.cdr.detectChanges();
        console.log('=== APPROVE INVENTORY ERROR ===');
      }
    });
  }

  openRejectModal(terminalId: number): void {
    this.selectedTerminalId = terminalId;
    this.rejectReason = '';
    this.showRejectModal = true;
  }

  closeRejectModal(): void {
    this.showRejectModal = false;
    this.selectedTerminalId = 0;
    this.rejectReason = '';
  }

  rejectInventory(): void {
    if (!this.rejectReason.trim()) {
      this.toastService.warning('Please provide a reject reason');
      return;
    }
    
    const rejectedStatus = this.statuses.find(s => s.statusName.toLowerCase().includes('rejected'));
    if (!rejectedStatus) {
      // If no rejected status found, use statusId 3 (typically rejected)
      const statusId = 3;
      this.httpService.patch(API_CONFIG.ENDPOINTS.INVENTORY.UPDATE_STATUS(this.selectedTerminalId), {
        statusId: statusId,
        rejectReason: this.rejectReason
      }).subscribe({
        next: () => {
          this.toastService.success('Inventory item rejected successfully');
          this.closeRejectModal();
          this.loadInventory();
        },
        error: (error) => {
          this.toastService.error('Failed to reject inventory item');
          console.error('Error rejecting inventory:', error);
        }
      });
      return;
    }
    
    this.httpService.patch(API_CONFIG.ENDPOINTS.INVENTORY.UPDATE_STATUS(this.selectedTerminalId), {
      statusId: rejectedStatus.statusId,
      rejectReason: this.rejectReason
    }).subscribe({
      next: () => {
        this.toastService.success('Inventory item rejected successfully');
        this.closeRejectModal();
        this.loadInventory();
      },
      error: (error) => {
        this.toastService.error('Failed to reject inventory item');
        console.error('Error rejecting inventory:', error);
      }
    });
  }

  openDeleteModal(terminalId: number): void {
    this.deleteTerminalId = terminalId;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.deleteTerminalId = 0;
  }

  deleteInventory(): void {
    if (!this.deleteTerminalId) return;
    
    this.httpService.delete(API_CONFIG.ENDPOINTS.INVENTORY.DELETE(this.deleteTerminalId)).subscribe({
      next: () => {
        this.toastService.success('Inventory item deleted successfully');
        this.closeDeleteModal();
        this.loadInventory();
        this.loadStats();
      },
      error: (error) => {
        this.toastService.error('Failed to delete inventory item');
        console.error('Error deleting inventory:', error);
      }
    });
  }

  onStatusFilterChange(): void {
    console.log('Status filter changed to:', this.statusId);
    this.ngZone.run(() => {
      this.currentPage = 1;
      this.loadInventory();
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    });
  }

  onDateFilterChange(): void {
    console.log('Date filter changed. From:', this.fromDate, 'To:', this.toDate);
    this.ngZone.run(() => {
      this.currentPage = 1;
      this.loadInventory();
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    });
  }

  onUserFilterChange(): void {
    console.log('User filter changed to:', this.userId);
    this.ngZone.run(() => {
    this.currentPage = 1;
    this.loadInventory();
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    });
  }

  applyFilters(): void {
    this.ngZone.run(() => {
    this.currentPage = 1;
    this.loadInventory();
    });
  }

  onTechFilterChange(): void {
    // Only apply client-side filter for techId
    this.ngZone.run(() => {
    this.applyClientFilters();
      this.cdr.markForCheck();
    this.cdr.detectChanges();
    });
  }

  resetFilters(): void {
    this.ngZone.run(() => {
      // Reset statusId to Pending (first status in filtered list)
      const pendingStatus = this.statuses.find(s => s.statusName.toLowerCase().includes('pending'));
      if (pendingStatus) {
        this.statusId = pendingStatus.statusId;
      } else if (this.statuses.length > 0) {
        this.statusId = this.statuses[0].statusId;
      }
      this.fromDate = DateUtil.getTodayISO();
      this.toDate = DateUtil.getTodayISO();
    this.userId = -1;
    this.techId = -1;
    this.currentPage = 1;
    this.loadInventory();
    });
  }

  getUserAvatarColor(userName: string): string {
    // Use centralized method that checks session first for current user
    return UserAvatarUtil.getUserAvatarColorByName(userName, this.sessionService, this.userService);
  }

  getUserInitials(userName: string): string {
    return UserAvatarUtil.getInitials(userName);
  }

  getStatusClass(statusName: string): string {
    if (!statusName) return '';
    const status = statusName.toLowerCase();
    if (status.includes('pending')) return 'pending';
    if (status.includes('completed') || status.includes('delivered')) return 'completed';
    if (status.includes('rejected') || status.includes('cancelled')) return 'rejected';
    if (status.includes('process') || status.includes('in progress')) return 'under-process';
    return '';
  }

  exportToExcel(): void {
    const exportData = this.filteredInventory.map(item => ({
      'Terminal Number': item.terminalNumber,
      'Alt Terminal': item.altTerminalNumber,
      'Serial Number': item.serialNumber,
      'Tech Name': item.techName,
      'Reason': item.reasonName,
      'Status': item.statusName,
      'User': item.userName,
      'Entry Date': item.entryDate,
      'Reject Reason': item.rejectReason || ''
    }));
    
    ExcelUtil.exportToExcel(exportData, `inventory_${new Date().toISOString().split('T')[0]}`);
    this.toastService.success('Inventory data exported successfully');
  }
}
