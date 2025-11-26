import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { JobOrder } from '../models/job-order.model';
import { CreateJobOrderRequest, JobOrderQueryParams } from '../models/request.model';

@Injectable({ providedIn: 'root' })
export class JobOrderService {
  private apiUrl = '/api/JobOrders';

  constructor(private http: HttpClient) {}

  getAllJobOrders(params?: JobOrderQueryParams): Observable<JobOrder[]> {
    let httpParams = new HttpParams();
    
    if (params) {
      if (params.month !== undefined && params.month !== null && params.month > 0) {
        httpParams = httpParams.set('month', params.month.toString());
      }
      if (params.year !== undefined && params.year !== null && params.year > 0) {
        httpParams = httpParams.set('year', params.year.toString());
      }
    }
    
    return this.http.get<JobOrder[]>(this.apiUrl, { 
      params: httpParams,
      withCredentials: true 
    });
  }

  createJobOrder(jobOrder: CreateJobOrderRequest): Observable<JobOrder> {
    return this.http.post<JobOrder>(this.apiUrl, jobOrder, { withCredentials: true });
  }
}

