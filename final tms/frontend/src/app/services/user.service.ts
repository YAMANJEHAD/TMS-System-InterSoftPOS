import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from '../models/user.model';
import { CreateUserRequest, SelfUpdateUserRequest, AdminUpdateUserRequest } from '../models/request.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private apiUrl = '/api/Users';

  constructor(private http: HttpClient) {}

  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.apiUrl, { withCredentials: true });
  }

  createUser(user: CreateUserRequest): Observable<User> {
    return this.http.post<User>(this.apiUrl, user, { withCredentials: true });
  }

  updateUser(userId: number, user: Partial<User>): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/${userId}`, user, { withCredentials: true });
  }

  selfUpdate(user: SelfUpdateUserRequest): Observable<User> {
    return this.http.put<User>(this.apiUrl, user, { withCredentials: true });
  }

  adminUpdateUser(userId: number, user: AdminUpdateUserRequest): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/${userId}`, user, { withCredentials: true });
  }

  activateUser(userId: number, isActive: boolean): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/${userId}/active`, { isActive }, { withCredentials: true });
  }

  resetPassword(email: string): Observable<any> {
    // PATCH /api/Users/reset-password expects email as JSON string
    return this.http.patch<any>(`${this.apiUrl}/reset-password`, `"${email}"`, { 
      withCredentials: true,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

