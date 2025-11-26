import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryService } from '../../services/inventory.service';
import { Inventory } from '../../models/inventory.model';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule],
  templateUrl: './inventory.component.html',
  styleUrls: ['./inventory.component.css']
})
export class InventoryComponent implements OnInit {
  inventory: Inventory[] = [];
  loading = true;
  error: string | null = null;
  statusId: number = 1; // Default status

  constructor(private inventoryService: InventoryService) {}

  ngOnInit(): void {
    this.loadInventory();
  }

  loadInventory(): void {
    this.loading = true;
    this.error = null;
    
    this.inventoryService.getInventoryByStatus(this.statusId).pipe(
      finalize(() => this.loading = false)
    ).subscribe({
      next: (items) => {
        this.inventory = items;
      },
      error: (err) => {
        this.error = 'Failed to load inventory. Please try again.';
        console.error('Error loading inventory:', err);
      }
    });
  }

  onStatusChange(): void {
    this.loadInventory();
  }
}

