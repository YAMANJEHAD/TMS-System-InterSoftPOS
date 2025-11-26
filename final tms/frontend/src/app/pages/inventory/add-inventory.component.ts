import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { InventoryService } from '../../services/inventory.service';
import { FilterService } from '../../services/filter.service';
import { AuthService } from '../../services/auth.service';
import { CreateInventoryRequest } from '../../models/request.model';
import { Inventory } from '../../models/inventory.model';
import { Reason, Technician, User } from '../../models/filter.model';
import { finalize, forkJoin } from 'rxjs';

@Component({
  selector: 'app-add-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './add-inventory.component.html'
})
export class AddInventoryComponent implements OnInit {
  formData: CreateInventoryRequest = {
    terminalNumber: '',
    reasonId: 0,
    altTerminalNumber: '',
    techId: 0,
    serialNumber: '',
    altSerialNumber: ''
  };
  loading = false;
  error: string | null = null;
  successMessage: string | null = null;

  // Filter options
  reasons: Reason[] = [];
  technicians: Technician[] = [];
  users: User[] = [];
  loadingFilters = true;

  // Active filters
  selectedUserName: string | null = null;
  selectedTechId: number | null = null;
  filtersApplied: boolean = false; // Track if filters have been explicitly applied

  // Search filters for dropdowns
  userSearchQuery: string = '';
  technicianSearchQuery: string = '';
  
  // Dropdown visibility states
  userDropdownOpen: boolean = false;
  technicianDropdownOpen: boolean = false;

  // Modal state
  showAddModal: boolean = false;

  // Inventory list
  inventory: Inventory[] = [];
  paginatedInventory: Inventory[] = [];
  loadingInventory = true;
  inventoryError: string | null = null;
  statusId: number = 1; // Default status

  // Pagination
  currentPage: number = 1;
  itemsPerPage: number = 5;
  totalPages: number = 0;

  // User-specific metrics
  totalEntries: number = 0;
  todayEntries: number = 0;
  reasonCounts: Map<string, number> = new Map();
  loadingMetrics = true;
  userId: number | null = null;
  userName: string | null = null;

  // Add Technician
  newTechnicianName: string = '';
  addingTechnician = false;

  // Edit/Delete/Status Update
  showEditModal = false;
  showRejectModal = false;
  editingInventory: Inventory | null = null;
  rejectingInventory: Inventory | null = null;
  rejectReason: string = '';
  editing = false;
  updatingStatus = false;

  // Permissions
  hasUpdateInventoryStatusPermission = false;
  loadingPermissions = false;

  constructor(
    private inventoryService: InventoryService,
    private filterService: FilterService,
    private authService: AuthService,
    public router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Get logged-in user info
    this.userId = this.authService.getUserId();
    this.userName = this.authService.getUserName();
    
    if (!this.userId || !this.userName) {
      console.error('User ID or Name not found. User may not be logged in.');
    }
    
    this.loadPermissions();
    this.loadFilters();
    this.loadInventory();
    this.loadUserMetrics();
  }

  loadPermissions(): void {
    this.loadingPermissions = true;
    
    // Call /api/Auth/session with datatype="string" & key="Permissions"
    this.authService.getSession('string', 'Permissions').subscribe({
      next: (response) => {
        try {
          // The response has a "value" field containing a JSON string array
          const permissionsJson = response.value || response.Value || '';
          if (permissionsJson) {
            const permissions: string[] = JSON.parse(permissionsJson);
            // Check if 'UpdateInventoryStatus' is in the permissions array
            this.hasUpdateInventoryStatusPermission = permissions.includes('UpdateInventoryStatus');
            console.log('AddInventoryComponent: Permissions loaded:', permissions);
            console.log('AddInventoryComponent: Has UpdateInventoryStatus permission:', this.hasUpdateInventoryStatusPermission);
          } else {
            console.warn('AddInventoryComponent: No permissions value found in session response');
            this.hasUpdateInventoryStatusPermission = false;
          }
        } catch (error) {
          console.error('AddInventoryComponent: Error parsing permissions:', error);
          this.hasUpdateInventoryStatusPermission = false;
        }
        this.loadingPermissions = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('AddInventoryComponent: Error loading permissions:', err);
        // Fallback: try to get permissions from sessionStorage
        const storedPermissions = this.authService.getPermissions();
        this.hasUpdateInventoryStatusPermission = storedPermissions.includes('UpdateInventoryStatus');
        this.loadingPermissions = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadFilters(): void {
    this.loadingFilters = true;
    forkJoin({
      reasons: this.filterService.getReasons(),
      technicians: this.filterService.getTechnicians(),
      users: this.filterService.getUsers()
    }).pipe(
      finalize(() => this.loadingFilters = false)
    ).subscribe({
      next: (filters) => {
        this.reasons = filters.reasons;
        this.technicians = filters.technicians;
        this.users = filters.users;
      },
      error: (err) => {
        console.error('Error loading filters:', err);
      }
    });
  }

  loadInventory(): void {
    this.loadingInventory = true;
    this.inventoryError = null;
    
    this.inventoryService.getInventoryByStatus(this.statusId).pipe(
      finalize(() => {
        this.loadingInventory = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (items) => {
        let filteredItems = items || [];
        
        // Apply filters
        if (this.selectedUserName) {
          filteredItems = filteredItems.filter(item => 
            item.userName?.toLowerCase() === this.selectedUserName?.toLowerCase()
          );
        }
        
        if (this.selectedTechId !== null && this.selectedTechId !== 0) {
          // Find technician name by techId
          const selectedTech = this.technicians.find(t => t.techId === this.selectedTechId);
          if (selectedTech) {
            filteredItems = filteredItems.filter(item => 
              item.techName?.toLowerCase() === selectedTech.techName.toLowerCase()
            );
          }
        }
        
        // Sort: Today's entries first, then by date descending
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        filteredItems.sort((a, b) => {
          const dateA = new Date(a.entryDate);
          dateA.setHours(0, 0, 0, 0);
          const dateB = new Date(b.entryDate);
          dateB.setHours(0, 0, 0, 0);
          
          const isTodayA = dateA.getTime() === today.getTime();
          const isTodayB = dateB.getTime() === today.getTime();
          
          // Today's entries first
          if (isTodayA && !isTodayB) return -1;
          if (!isTodayA && isTodayB) return 1;
          
          // Then sort by date descending (newest first)
          return dateB.getTime() - dateA.getTime();
        });
        
        this.inventory = filteredItems;
        this.updatePagination();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.inventoryError = 'Failed to load inventory. Please try again.';
        console.error('Error loading inventory:', err);
        this.cdr.detectChanges();
      }
    });
  }

  onStatusChange(): void {
    this.filtersApplied = true;
    this.currentPage = 1; // Reset to first page
    this.loadInventory();
    this.loadUserMetrics();
  }

  onFilterChange(): void {
    // Mark that filters have been applied
    this.filtersApplied = true;
    this.currentPage = 1; // Reset to first page
    // Reload both inventory list and metrics when filters change
    this.loadInventory();
    this.loadUserMetrics();
  }

  clearFilters(): void {
    this.selectedUserName = null;
    this.selectedTechId = null;
    this.statusId = 1; // Reset to default status
    this.userSearchQuery = '';
    this.technicianSearchQuery = '';
    this.filtersApplied = false;
    this.onFilterChange();
  }

  loadUserMetrics(): void {
    this.loadingMetrics = true;
    
    // Load inventory from all statuses to calculate user metrics
    forkJoin({
      status1: this.inventoryService.getInventoryByStatus(1),
      status2: this.inventoryService.getInventoryByStatus(2),
      status3: this.inventoryService.getInventoryByStatus(3)
    }).pipe(
      finalize(() => {
        this.loadingMetrics = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (results) => {
        // Combine all inventory items
        let allItems: Inventory[] = [
          ...(results.status1 || []),
          ...(results.status2 || []),
          ...(results.status3 || [])
        ];

        // Apply filters
        // If a specific user is selected, filter by that user
        if (this.selectedUserName) {
          allItems = allItems.filter(item => 
            item.userName?.toLowerCase() === this.selectedUserName?.toLowerCase()
          );
        }
        // If no user filter is selected and filters haven't been applied yet, default to logged-in user
        // This maintains the original "user-specific" behavior when page first loads
        else if (this.userName && !this.filtersApplied) {
          allItems = allItems.filter(item => 
            item.userName?.toLowerCase() === this.userName?.toLowerCase()
          );
        }
        // If "All Users" is explicitly selected (filtersApplied = true and selectedUserName = null), show all users' data
        
        if (this.selectedTechId !== null && this.selectedTechId !== 0) {
          // Find technician name by techId
          const selectedTech = this.technicians.find(t => t.techId === this.selectedTechId);
          if (selectedTech) {
            allItems = allItems.filter(item => 
              item.techName?.toLowerCase() === selectedTech.techName.toLowerCase()
            );
          }
        }

        // Calculate Total Entries
        this.totalEntries = allItems.length;

        // Calculate Today's Entries
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        this.todayEntries = allItems.filter(item => {
          const itemDate = new Date(item.entryDate);
          itemDate.setHours(0, 0, 0, 0);
          return itemDate.getTime() === today.getTime();
        }).length;

        // Calculate Reason Counts
        this.reasonCounts.clear();
        allItems.forEach(item => {
          if (item.reasonName) {
            const currentCount = this.reasonCounts.get(item.reasonName) || 0;
            this.reasonCounts.set(item.reasonName, currentCount + 1);
          }
        });

        console.log('AddInventoryComponent: User metrics calculated:', {
          totalEntries: this.totalEntries,
          todayEntries: this.todayEntries,
          reasonCounts: Array.from(this.reasonCounts.entries()),
          filters: {
            selectedUserName: this.selectedUserName,
            selectedTechId: this.selectedTechId
          }
        });
      },
      error: (err) => {
        console.error('Error loading user metrics:', err);
        // Try loading from status 1 only as fallback
        this.inventoryService.getInventoryByStatus(1).subscribe({
          next: (items) => {
            let filteredItems = items || [];
            
            // Apply filters
            if (this.selectedUserName) {
              filteredItems = filteredItems.filter(item => 
                item.userName?.toLowerCase() === this.selectedUserName?.toLowerCase()
              );
            } else if (this.userName) {
              filteredItems = filteredItems.filter(item => 
                item.userName?.toLowerCase() === this.userName?.toLowerCase()
              );
            }
            
            if (this.selectedTechId !== null && this.selectedTechId !== 0) {
              const selectedTech = this.technicians.find(t => t.techId === this.selectedTechId);
              if (selectedTech) {
                filteredItems = filteredItems.filter(item => 
                  item.techName?.toLowerCase() === selectedTech.techName.toLowerCase()
                );
              }
            }
            
            this.totalEntries = filteredItems.length;
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            this.todayEntries = filteredItems.filter(item => {
              const itemDate = new Date(item.entryDate);
              itemDate.setHours(0, 0, 0, 0);
              return itemDate.getTime() === today.getTime();
            }).length;

            this.reasonCounts.clear();
            filteredItems.forEach(item => {
              if (item.reasonName) {
                const currentCount = this.reasonCounts.get(item.reasonName) || 0;
                this.reasonCounts.set(item.reasonName, currentCount + 1);
              }
            });
            
            this.loadingMetrics = false;
            this.cdr.detectChanges();
          },
          error: () => {
            this.loadingMetrics = false;
            this.cdr.detectChanges();
          }
        });
      }
    });
  }

  getReasonCountsArray(): Array<{reason: string, count: number}> {
    return Array.from(this.reasonCounts.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);
  }

  getFilteredUsers(): User[] {
    if (!this.userSearchQuery.trim()) {
      return this.users;
    }
    const query = this.userSearchQuery.toLowerCase();
    return this.users.filter(user => 
      user.name.toLowerCase().includes(query)
    );
  }

  getFilteredTechnicians(): Technician[] {
    if (!this.technicianSearchQuery.trim()) {
      return this.technicians;
    }
    const query = this.technicianSearchQuery.toLowerCase();
    return this.technicians.filter(tech => 
      tech.techName.toLowerCase().includes(query)
    );
  }

  toggleUserDropdown(): void {
    this.userDropdownOpen = !this.userDropdownOpen;
    if (!this.userDropdownOpen) {
      this.userSearchQuery = '';
    }
  }

  toggleTechnicianDropdown(): void {
    this.technicianDropdownOpen = !this.technicianDropdownOpen;
    if (!this.technicianDropdownOpen) {
      this.technicianSearchQuery = '';
    }
  }

  selectUser(user: User): void {
    this.selectedUserName = user.name;
    this.userSearchQuery = '';
    this.userDropdownOpen = false;
    this.onFilterChange();
  }

  selectTechnician(tech: Technician): void {
    this.selectedTechId = tech.techId;
    this.technicianSearchQuery = '';
    this.technicianDropdownOpen = false;
    this.onFilterChange();
  }

  clearUserFilter(): void {
    this.selectedUserName = null;
    this.userSearchQuery = '';
    this.userDropdownOpen = false;
    this.onFilterChange();
  }

  clearTechnicianFilter(): void {
    this.selectedTechId = null;
    this.technicianSearchQuery = '';
    this.technicianDropdownOpen = false;
    this.onFilterChange();
  }

  closeDropdowns(): void {
    this.userDropdownOpen = false;
    this.technicianDropdownOpen = false;
  }

  getSelectedTechnicianName(): string | null {
    if (!this.selectedTechId) {
      return null;
    }
    const tech = this.technicians.find(t => t.techId === this.selectedTechId);
    return tech ? tech.techName : null;
  }

  updatePagination(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedInventory = this.inventory.slice(startIndex, endIndex);
    this.totalPages = Math.ceil(this.inventory.length / this.itemsPerPage);
    
    // Reset to page 1 if current page is out of bounds
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = 1;
      this.updatePagination();
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
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

  isToday(dateString: string): boolean {
    if (!dateString) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const itemDate = new Date(dateString);
    itemDate.setHours(0, 0, 0, 0);
    return itemDate.getTime() === today.getTime();
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getPageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  getStartIndex(): number {
    return this.inventory.length === 0 ? 0 : (this.currentPage - 1) * this.itemsPerPage + 1;
  }

  getEndIndex(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.inventory.length);
  }

  isCurrentPage(page: number | string): boolean {
    return typeof page === 'number' && page === this.currentPage;
  }

  handlePageClick(page: number | string): void {
    if (typeof page === 'number') {
      this.goToPage(page);
    }
  }

  getVisiblePageNumbers(): (number | string)[] {
    const total = this.totalPages;
    const current = this.currentPage;

    // If 6 or fewer pages, show all
    if (total <= 6) {
      return this.getPageNumbers();
    }

    const pages: (number | string)[] = [];

    // Always show first 3 pages
    pages.push(1);
    pages.push(2);
    pages.push(3);

    // Determine if we need ellipsis and what to show in the middle
    const showFirstEllipsis = current > 4;
    const showLastEllipsis = current < total - 3;

    if (showFirstEllipsis && showLastEllipsis) {
      // In the middle: 1 2 3 ... (current-1) current (current+1) ... (total-2) (total-1) total
      pages.push('...');
      pages.push(current - 1);
      pages.push(current);
      pages.push(current + 1);
      pages.push('...');
    } else if (showFirstEllipsis) {
      // Near the end: 1 2 3 ... (total-3) (total-2) (total-1) total
      pages.push('...');
      pages.push(total - 2);
      pages.push(total - 1);
      pages.push(total);
    } else {
      // Near the beginning: 1 2 3 4 ... (total-2) (total-1) total
      if (current === 4) {
        pages.push(4);
      }
      pages.push('...');
      pages.push(total - 2);
      pages.push(total - 1);
      pages.push(total);
    }

    // Remove duplicates while preserving order
    const result: (number | string)[] = [];
    const seen = new Set<number | string>();
    
    for (const page of pages) {
      if (!seen.has(page)) {
        seen.add(page);
        result.push(page);
      }
    }

    return result;
  }

  openAddModal(): void {
    this.showAddModal = true;
    this.error = null;
    this.successMessage = null;
    // Reset form when opening modal
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
    this.error = null;
    this.successMessage = null;
    // Reset form when closing modal
    this.formData = {
      terminalNumber: '',
      reasonId: 0,
      altTerminalNumber: '',
      techId: 0,
      serialNumber: '',
      altSerialNumber: ''
    };
  }

  onSubmit(): void {
    if (!this.validateForm()) {
      return;
    }

    this.loading = true;
    this.error = null;
    this.successMessage = null;

    this.inventoryService.addInventory(this.formData).subscribe({
      next: () => {
        this.successMessage = 'Inventory item added successfully.';
        this.loading = false;
        // Reset form
        this.formData = {
          terminalNumber: '',
          reasonId: 0,
          altTerminalNumber: '',
          techId: 0,
          serialNumber: '',
          altSerialNumber: ''
        };
        // Reload inventory list and user metrics
        this.loadInventory();
        this.loadUserMetrics();
        // Close modal after a short delay to show success message
        setTimeout(() => {
          this.closeAddModal();
        }, 1500);
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to add inventory item. Please try again.';
        this.loading = false;
        console.error('Error adding inventory:', err);
      }
    });
  }

  validateForm(): boolean {
    if (!this.formData.terminalNumber) {
      this.error = 'Terminal Number is required.';
      return false;
    }
    if (this.formData.reasonId <= 0) {
      this.error = 'Please select a reason.';
      return false;
    }
    if (this.formData.techId <= 0) {
      this.error = 'Please select a technician.';
      return false;
    }
    return true;
  }

  // Add Technician
  addTechnician(): void {
    if (!this.newTechnicianName.trim()) {
      this.error = 'Please enter a technician name.';
      return;
    }

    this.addingTechnician = true;
    this.error = null;

    this.inventoryService.insertTechnician(this.newTechnicianName.trim()).subscribe({
      next: (response) => {
        this.addingTechnician = false;
        this.successMessage = 'Technician added successfully.';
        this.newTechnicianName = '';
        // Reload technicians list
        this.filterService.getTechnicians().subscribe({
          next: (technicians) => {
            this.technicians = technicians;
            this.cdr.detectChanges();
          }
        });
        setTimeout(() => {
          this.successMessage = null;
        }, 3000);
      },
      error: (err) => {
        this.addingTechnician = false;
        this.error = err.error?.message || 'Failed to add technician.';
        console.error('Error adding technician:', err);
      }
    });
  }

  // Edit Inventory
  openEditModal(item: Inventory): void {
    this.editingInventory = item;
    this.formData = {
      terminalNumber: item.terminalNumber,
      reasonId: this.reasons.find(r => r.reasonName === item.reasonName)?.reasonId || 0,
      altTerminalNumber: item.altTerminalNumber || '',
      techId: this.technicians.find(t => t.techName === item.techName)?.techId || 0,
      serialNumber: item.serialNumber || '',
      altSerialNumber: item.altSerialNumber || ''
    };
    this.showEditModal = true;
    this.error = null;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editingInventory = null;
    this.error = null;
  }

  onUpdate(): void {
    if (!this.validateForm() || !this.editingInventory) {
      return;
    }

    this.editing = true;
    this.error = null;

    this.inventoryService.updateInventory(
      this.editingInventory.terminalId.toString(),
      this.formData
    ).subscribe({
      next: () => {
        this.editing = false;
        this.closeEditModal();
        this.successMessage = 'Inventory updated successfully.';
        this.loadInventory();
        this.loadUserMetrics();
        setTimeout(() => {
          this.successMessage = null;
        }, 3000);
      },
      error: (err) => {
        this.editing = false;
        this.error = err.error?.message || 'Failed to update inventory.';
        console.error('Error updating inventory:', err);
      }
    });
  }

  // Delete Inventory
  deleteInventory(item: Inventory): void {
    if (!confirm(`Are you sure you want to delete inventory item ${item.terminalNumber}?`)) {
      return;
    }

    this.inventoryService.deleteInventory(item.terminalId.toString()).subscribe({
      next: () => {
        this.successMessage = 'Inventory deleted successfully.';
        this.loadInventory();
        this.loadUserMetrics();
        setTimeout(() => {
          this.successMessage = null;
        }, 3000);
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to delete inventory.';
        console.error('Error deleting inventory:', err);
      }
    });
  }

  // Status Update
  openRejectModal(item: Inventory): void {
    this.rejectingInventory = item;
    this.rejectReason = '';
    this.showRejectModal = true;
    this.error = null;
  }

  closeRejectModal(): void {
    this.showRejectModal = false;
    this.rejectingInventory = null;
    this.rejectReason = '';
    this.error = null;
  }

  approveInventory(item: Inventory): void {
    if (!confirm(`Approve inventory item ${item.terminalNumber}?`)) {
      return;
    }

    this.updatingStatus = true;
    this.error = null;

    this.inventoryService.updateInventoryStatus(item.terminalId.toString(), 2).subscribe({
      next: () => {
        this.updatingStatus = false;
        this.successMessage = 'Inventory approved successfully.';
        this.loadInventory();
        this.loadUserMetrics();
        setTimeout(() => {
          this.successMessage = null;
        }, 3000);
      },
      error: (err) => {
        this.updatingStatus = false;
        this.error = err.error?.message || 'Failed to approve inventory.';
        console.error('Error approving inventory:', err);
      }
    });
  }

  submitReject(): void {
    if (!this.rejectingInventory) {
      return;
    }

    if (!this.rejectReason.trim()) {
      this.error = 'Please enter a reject reason.';
      return;
    }

    this.updatingStatus = true;
    this.error = null;

    this.inventoryService.updateInventoryStatus(
      this.rejectingInventory.terminalId.toString(),
      3,
      this.rejectReason.trim()
    ).subscribe({
      next: () => {
        this.updatingStatus = false;
        this.closeRejectModal();
        this.successMessage = 'Inventory rejected successfully.';
        this.loadInventory();
        this.loadUserMetrics();
        setTimeout(() => {
          this.successMessage = null;
        }, 3000);
      },
      error: (err) => {
        this.updatingStatus = false;
        this.error = err.error?.message || 'Failed to reject inventory.';
        console.error('Error rejecting inventory:', err);
      }
    });
  }
}

