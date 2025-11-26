import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { TransferService } from '../../services/transfer.service';
import { Transfer } from '../../models/transfer.model';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-transfer',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './transfer.component.html'
})
export class TransferComponent implements OnInit {
  transfers: Transfer[] = [];
  loading = true;
  error: string | null = null;

  constructor(private transferService: TransferService) {}

  ngOnInit(): void {
    this.loadTransfers();
  }

  loadTransfers(): void {
    this.loading = true;
    this.transferService.getAllTransfers().pipe(
      finalize(() => this.loading = false)
    ).subscribe({
      next: (transfers) => {
        this.transfers = transfers;
      },
      error: (err) => {
        this.error = 'Failed to load transfers.';
        console.error('Error:', err);
      }
    });
  }
}

