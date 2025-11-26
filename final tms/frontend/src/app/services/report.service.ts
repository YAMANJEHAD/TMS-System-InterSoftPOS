import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ReportResponse, ReportQueryParams } from '../models/report.model';

@Injectable({ providedIn: 'root' })
export class ReportService {
  private apiUrl = '/api/Reports';

  constructor(private http: HttpClient) {}

  getAllReports(params?: ReportQueryParams): Observable<ReportResponse> {
    let httpParams = new HttpParams();
    
    if (params) {
      if (params.startDate) {
        httpParams = httpParams.set('startDate', params.startDate);
      }
      if (params.endDate) {
        httpParams = httpParams.set('endDate', params.endDate);
      }
    }
    
    return this.http.get<ReportResponse>(this.apiUrl, { 
      params: httpParams,
      withCredentials: true 
    });
  }
}

