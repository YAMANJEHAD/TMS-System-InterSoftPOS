import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Paper } from '../models/paper.model';
import { CreatePaperRequest, UpdatePaperRequest, PaperQueryParams } from '../models/request.model';

@Injectable({ providedIn: 'root' })
export class PaperService {
  private apiUrl = '/api/Papers';

  constructor(private http: HttpClient) {}

  getAllPapers(params?: PaperQueryParams): Observable<Paper[]> {
    let httpParams = new HttpParams();
    
    if (params) {
      if (params.fromDate) {
        httpParams = httpParams.set('fromDate', params.fromDate);
      }
      if (params.toDate) {
        httpParams = httpParams.set('toDate', params.toDate);
      }
      if (params.entryUser !== undefined && params.entryUser !== null) {
        httpParams = httpParams.set('entryUser', params.entryUser.toString());
      }
    }
    
    return this.http.get<Paper[]>(this.apiUrl, { 
      params: httpParams,
      withCredentials: true 
    });
  }

  createPaper(paper: CreatePaperRequest): Observable<Paper> {
    return this.http.post<Paper>(this.apiUrl, paper, { 
      withCredentials: true
    });
  }

  updatePaper(id: number, paper: UpdatePaperRequest): Observable<Paper> {
    return this.http.put<Paper>(`${this.apiUrl}/${id}`, paper, { 
      withCredentials: true
    });
  }

  deletePaper(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { withCredentials: true });
  }
}

