import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Task } from '../models/task.model';
import { CreateTaskRequest, TaskQueryParams } from '../models/request.model';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private apiUrl = '/api/Tasks';

  constructor(private http: HttpClient) {}

  getAllTasks(params?: TaskQueryParams): Observable<Task[]> {
    let httpParams = new HttpParams();
    
    if (params) {
      if (params.fromDate && params.fromDate.trim()) {
        httpParams = httpParams.set('fromDate', params.fromDate);
      }
      if (params.toDate && params.toDate.trim()) {
        httpParams = httpParams.set('toDate', params.toDate);
      }
      if (params.title && params.title.trim()) {
        httpParams = httpParams.set('title', params.title);
      }
      if (params.statusId !== undefined && params.statusId !== null && params.statusId !== 0) {
        httpParams = httpParams.set('statusId', params.statusId.toString());
      }
      if (params.priorityId !== undefined && params.priorityId !== null && params.priorityId !== 0) {
        httpParams = httpParams.set('priorityId', params.priorityId.toString());
      }
      if (params.projectId !== undefined && params.projectId !== null && params.projectId !== 0) {
        httpParams = httpParams.set('projectId', params.projectId.toString());
      }
      if (params.userId !== undefined && params.userId !== null && params.userId !== 0) {
        httpParams = httpParams.set('userId', params.userId.toString());
      }
    }
    
    return this.http.get<Task[]>(this.apiUrl, { 
      params: httpParams,
      withCredentials: true 
    });
  }

  getMyTasks(userName: string): Observable<Task[]> {
    return this.http.get<Task[]>(this.apiUrl, { withCredentials: true });
  }

  getTaskById(id: number): Observable<Task> {
    return this.http.get<Task>(`${this.apiUrl}/${id}`, { withCredentials: true });
  }

  createTask(task: CreateTaskRequest): Observable<Task> {
    // Use /create endpoint as per API specification
    return this.http.post<Task>(`${this.apiUrl}/create`, task, { withCredentials: true });
  }

  updateTask(id: number, task: Partial<CreateTaskRequest>): Observable<Task> {
    return this.http.put<Task>(`${this.apiUrl}/${id}`, task, { withCredentials: true });
  }
}

