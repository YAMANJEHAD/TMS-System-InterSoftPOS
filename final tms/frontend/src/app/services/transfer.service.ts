import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Transfer, TransferChartResponse } from '../models/transfer.model';
import { CreateTransferRequest, UpdateTransferRequest, TransferQueryParams } from '../models/request.model';

@Injectable({ providedIn: 'root' })
export class TransferService {
  private apiUrl = '/api/Transfer';

  constructor(private http: HttpClient) {}

  getAllTransfers(params?: TransferQueryParams): Observable<Transfer[]> {
    let httpParams = new HttpParams();
    
    if (params) {
      if (params.fromDate && params.fromDate.trim()) {
        httpParams = httpParams.set('fromDate', params.fromDate);
      }
      if (params.toDate && params.toDate.trim()) {
        httpParams = httpParams.set('toDate', params.toDate);
      }
      if (params.ticketNo !== undefined && params.ticketNo !== null && params.ticketNo !== 0) {
        httpParams = httpParams.set('ticketNo', params.ticketNo.toString());
      }
      if (params.duplicateCount !== undefined && params.duplicateCount !== null && params.duplicateCount !== 0) {
        httpParams = httpParams.set('duplicateCount', params.duplicateCount.toString());
      }
      if (params.terminalNumber !== undefined && params.terminalNumber !== null && params.terminalNumber !== 0) {
        httpParams = httpParams.set('terminalNumber', params.terminalNumber.toString());
      }
    }
    
    return this.http.get<Transfer[]>(this.apiUrl, { 
      params: httpParams,
      withCredentials: true 
    });
  }

  addTransfer(transfer: CreateTransferRequest): Observable<Transfer> {
    return this.http.post<Transfer>(this.apiUrl, transfer, { withCredentials: true });
  }

  addBatchTransfers(transfers: CreateTransferRequest[]): Observable<Transfer[]> {
    return this.http.post<Transfer[]>(this.apiUrl + '/batch', transfers, { withCredentials: true });
  }

  updateTransfer(id: number, transfer: UpdateTransferRequest): Observable<Transfer> {
    return this.http.put<Transfer>(`${this.apiUrl}/${id}`, transfer, { withCredentials: true });
  }

  deleteTransfer(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { withCredentials: true });
  }

  updateTicketStatus(id: number, statusId: number, rejectReason?: string): Observable<Transfer> {
    const body: any = { statusId };
    if (rejectReason) {
      body.rejectReason = rejectReason;
    }
    return this.http.patch<Transfer>(`${this.apiUrl}/${id}/ticket-status`, body, { withCredentials: true });
  }

  getTransferChart(): Observable<TransferChartResponse> {
    return this.http.get<TransferChartResponse>('/api/TransferChart', { withCredentials: true });
  }
}

