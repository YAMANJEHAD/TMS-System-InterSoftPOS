import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AddPermissionToRoleRequest, AssignPermissionToUserRequest } from '../models/request.model';
import { Permission } from '../models/filter.model';

@Injectable({ providedIn: 'root' })
export class RolePermissionService {
  private apiUrl = '/api/RolePermission';

  constructor(private http: HttpClient) {}

  addPermissionToRole(request: AddPermissionToRoleRequest): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/AddPermissionToRole`, request, { withCredentials: true });
  }

  assignPermissionToUser(request: AssignPermissionToUserRequest): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/AssignPermissionToUser`, request, { withCredentials: true });
  }

  // Get all available permissions
  // Note: This endpoint may need to be adjusted based on your actual API
  getAllPermissions(): Observable<Permission[]> {
    // Try /api/Filters/permissions first, fallback to /api/RolePermission/permissions
    return this.http.get<Permission[]>(`/api/Filters/permissions`, { withCredentials: true });
  }
}

