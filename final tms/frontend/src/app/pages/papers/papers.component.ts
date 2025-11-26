import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaperService } from '../../services/paper.service';
import { FilterService } from '../../services/filter.service';
import { Paper } from '../../models/paper.model';
import { CreatePaperRequest, UpdatePaperRequest, PaperQueryParams } from '../../models/request.model';
import { User } from '../../models/filter.model';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-papers',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './papers.component.html',
  styleUrls: ['./papers.component.css']
})
export class PapersComponent implements OnInit {
  papers: Paper[] = [];
  loading = true;
  error: string | null = null;
  successMessage: string | null = null;

  // Filter parameters
  filters: PaperQueryParams = {
    fromDate: '',
    toDate: '',
    entryUser: undefined
  };

  // Create Paper Modal
  showCreateModal = false;
  newPaper: CreatePaperRequest = {
    cancelledTerminalNo: '',
    deliveredTerminalNo: '',
    cancelledTicketNo: '',
    deliveredTicketNo: ''
  };
  creatingPaper = false;

  // Edit Paper Modal
  showEditModal = false;
  editingPaper: Paper | null = null;
  editPaper: UpdatePaperRequest = {
    cancelledTerminalNo: '',
    deliveredTerminalNo: '',
    cancelledTicketNo: '',
    deliveredTicketNo: ''
  };
  updatingPaper = false;

  // Users for filter dropdown
  users: User[] = [];
  loadingFilters = false;

  constructor(
    private paperService: PaperService,
    private filterService: FilterService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
    this.loadPapers();
  }

  loadUsers(): void {
    this.loadingFilters = true;
    this.filterService.getUsers().pipe(
      finalize(() => this.loadingFilters = false)
    ).subscribe({
      next: (users) => {
        this.users = users;
      },
      error: (err) => {
        console.error('Error loading users:', err);
      }
    });
  }

  loadPapers(): void {
    this.loading = true;
    this.error = null;
    
    // Build query params (only include non-empty values)
    const params: PaperQueryParams = {};
    if (this.filters.fromDate) {
      params.fromDate = this.filters.fromDate;
    }
    if (this.filters.toDate) {
      params.toDate = this.filters.toDate;
    }
    if (this.filters.entryUser !== undefined && this.filters.entryUser !== null) {
      params.entryUser = this.filters.entryUser;
    }

    this.paperService.getAllPapers(Object.keys(params).length > 0 ? params : undefined).pipe(
      finalize(() => this.loading = false)
    ).subscribe({
      next: (papers) => {
        this.papers = papers;
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to load papers.';
        console.error('Error:', err);
      }
    });
  }

  applyFilters(): void {
    this.loadPapers();
  }

  clearFilters(): void {
    this.filters = {
      fromDate: '',
      toDate: '',
      entryUser: undefined
    };
    this.loadPapers();
  }

  openCreateModal(): void {
    this.newPaper = {
      cancelledTerminalNo: '',
      deliveredTerminalNo: '',
      cancelledTicketNo: '',
      deliveredTicketNo: ''
    };
    this.showCreateModal = true;
    this.error = null;
    this.successMessage = null;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.newPaper = {
      cancelledTerminalNo: '',
      deliveredTerminalNo: '',
      cancelledTicketNo: '',
      deliveredTicketNo: ''
    };
  }

  createPaper(): void {
    if (!this.validateCreatePaper()) {
      return;
    }

    this.creatingPaper = true;
    this.error = null;
    this.successMessage = null;

    this.paperService.createPaper(this.newPaper).pipe(
      finalize(() => this.creatingPaper = false)
    ).subscribe({
      next: () => {
        this.successMessage = 'Paper created successfully.';
        this.closeCreateModal();
        this.loadPapers();
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to create paper.';
        console.error('Error creating paper:', err);
      }
    });
  }

  validateCreatePaper(): boolean {
    if (!this.newPaper.cancelledTerminalNo || !this.newPaper.deliveredTerminalNo ||
        !this.newPaper.cancelledTicketNo || !this.newPaper.deliveredTicketNo) {
      this.error = 'Please fill in all required fields.';
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

  openEditModal(paper: Paper): void {
    this.editingPaper = paper;
    this.editPaper = {
      cancelledTerminalNo: paper.cancelledTerminalNo,
      deliveredTerminalNo: paper.deliveredTerminalNo,
      cancelledTicketNo: paper.cancelledTicketNo,
      deliveredTicketNo: paper.deliveredTicketNo
    };
    this.showEditModal = true;
    this.error = null;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editingPaper = null;
    this.error = null;
  }

  updatePaper(): void {
    if (!this.validateUpdatePaper() || !this.editingPaper || !this.editingPaper.id) {
      return;
    }

    this.updatingPaper = true;
    this.error = null;
    this.successMessage = null;

    this.paperService.updatePaper(this.editingPaper.id, this.editPaper).pipe(
      finalize(() => this.updatingPaper = false)
    ).subscribe({
      next: () => {
        this.successMessage = 'Paper updated successfully.';
        this.closeEditModal();
        this.loadPapers();
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to update paper.';
        console.error('Error updating paper:', err);
      }
    });
  }

  validateUpdatePaper(): boolean {
    if (!this.editPaper.cancelledTerminalNo || !this.editPaper.deliveredTerminalNo ||
        !this.editPaper.cancelledTicketNo || !this.editPaper.deliveredTicketNo) {
      this.error = 'Please fill in all required fields.';
      return false;
    }
    return true;
  }

  deletePaper(paper: Paper): void {
    if (!paper.id) {
      this.error = 'Cannot delete paper: ID is missing.';
      return;
    }

    if (!confirm(`Are you sure you want to delete this paper (Cancelled Terminal: ${paper.cancelledTerminalNo})?`)) {
      return;
    }

    this.error = null;
    this.successMessage = null;

    this.paperService.deletePaper(paper.id).subscribe({
      next: () => {
        this.successMessage = 'Paper deleted successfully.';
        this.loadPapers();
        setTimeout(() => {
          this.successMessage = null;
        }, 3000);
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to delete paper.';
        console.error('Error deleting paper:', err);
      }
    });
  }
}

