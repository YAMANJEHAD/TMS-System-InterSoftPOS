import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Priority, Project, Reason, Status, Technician, User } from '../models/filter.model';

@Injectable({ providedIn: 'root' })
export class FilterService {
  private apiUrl = '/api/Filters';

  constructor(private http: HttpClient) {}

  getPriorities(): Observable<Priority[]> {
    return this.http.get<Priority[]>(`${this.apiUrl}/priorities`, { withCredentials: true });
  }

  getProjects(): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.apiUrl}/projects`, { withCredentials: true });
  }

  getReasons(): Observable<Reason[]> {
    return this.http.get<Reason[]>(`${this.apiUrl}/reasons`, { withCredentials: true });
  }

  getStatuses(): Observable<Status[]> {
    return this.http.get<Status[]>(`${this.apiUrl}/statuses`, { withCredentials: true });
  }

  getTechnicians(): Observable<Technician[]> {
    return this.http.get<Technician[]>(`${this.apiUrl}/technicians`, { withCredentials: true });
  }

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/users`, { withCredentials: true });
  }
}

