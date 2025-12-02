import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { API_CONFIG } from '../config/api.config';
import { ToastService } from './toast.service';

@Injectable({
  providedIn: 'root'
})
export class HttpService {
  private baseURL = API_CONFIG.BASE_URL;

  constructor(
    private http: HttpClient,
    private toastService: ToastService
  ) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
    });
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    if (error.status === 401) {
      // Unauthorized - show message instead of logging out
      this.toastService.error('You are unauthorized');
    }
    return throwError(() => error);
  }

  get<T>(endpoint: string, params?: any): Observable<T> {
    return this.http.get<T>(`${this.baseURL}${endpoint}`, {
      headers: this.getHeaders(),
      params: params,
      withCredentials: true, // CRITICAL: Required for session cookies
    }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  post<T>(endpoint: string, body: any): Observable<T> {
    return this.http.post<T>(`${this.baseURL}${endpoint}`, body, {
      headers: this.getHeaders(),
      withCredentials: true,
    }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  put<T>(endpoint: string, body: any): Observable<T> {
    return this.http.put<T>(`${this.baseURL}${endpoint}`, body, {
      headers: this.getHeaders(),
      withCredentials: true,
    }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  patch<T>(endpoint: string, body: any): Observable<T> {
    return this.http.patch<T>(`${this.baseURL}${endpoint}`, body, {
      headers: this.getHeaders(),
      withCredentials: true,
    }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  delete<T>(endpoint: string, body?: any): Observable<T> {
    // If body is provided, use request method to support DELETE with body
    if (body) {
      return this.http.request<T>('DELETE', `${this.baseURL}${endpoint}`, {
        headers: this.getHeaders(),
        withCredentials: true,
        body: body,
        observe: 'body' as const, // Return the body directly, not HttpEvent
        responseType: 'json' as const
      }).pipe(
        catchError(this.handleError.bind(this))
      );
    }
    
    return this.http.delete<T>(`${this.baseURL}${endpoint}`, {
      headers: this.getHeaders(),
      withCredentials: true,
    }).pipe(
      catchError(this.handleError.bind(this))
    );
  }
}

