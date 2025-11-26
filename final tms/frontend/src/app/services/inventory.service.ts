import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Inventory, InventoryChartData } from '../models/inventory.model';
import { CreateInventoryRequest } from '../models/request.model';

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private apiUrl = '/api/Inventory';

  constructor(private http: HttpClient) {}

  getInventoryByStatus(statusId: number): Observable<Inventory[]> {
    return this.http.get<Inventory[]>(`${this.apiUrl}/status/${statusId}`, { withCredentials: true });
  }

  addInventory(inventory: CreateInventoryRequest): Observable<Inventory> {
    return this.http.post<Inventory>(this.apiUrl, inventory, { withCredentials: true });
  }

  insertTechnician(technicianName: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/InsertTechnician`, `"${technicianName}"`, { 
      withCredentials: true,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  getChartData(): Observable<InventoryChartData[]> {
    return this.http.get<InventoryChartData[]>(`${this.apiUrl}/chart`, { withCredentials: true });
  }

  updateInventory(terminalId: string, inventory: CreateInventoryRequest): Observable<Inventory> {
    return this.http.put<Inventory>(`${this.apiUrl}/${terminalId}`, inventory, { withCredentials: true });
  }

  deleteInventory(terminalId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${terminalId}`, { withCredentials: true });
  }

  updateInventoryStatus(terminalId: string, statusId: number, rejectReason?: string): Observable<Inventory> {
    const body: any = { statusId };
    if (rejectReason) {
      body.rejectReason = rejectReason;
    }
    return this.http.patch<Inventory>(`${this.apiUrl}/${terminalId}/status`, body, { withCredentials: true });
  }
}

