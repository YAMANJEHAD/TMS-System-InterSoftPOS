import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { HttpService } from '../../../services/http.service';
import { SessionService } from '../../../services/session.service';
import { ToastService } from '../../../services/toast.service';
import { API_CONFIG } from '../../../config/api.config';
import { UserAvatarUtil } from '../../../utils/user-avatar.util';
import { BreadcrumbComponent } from '../../components/breadcrumb/breadcrumb';
import { ExcelUtil } from '../../../utils/excel.util';

interface User {
  userId: number;
  name: string;
  email: string;
  roleId?: number;
  roleName: string;
  departmentId?: number;
  departmentName: string;
  isActive: boolean;
  avatarColor: string | null;
  theme: string | null;
}

interface Permission {
  permissionsId: number;
  permissionsName: string;
}

interface UserPermission {
  permissionsId: number;
  permissionsName: string;
  hasPermission: boolean;
}

interface Role {
  roleId: number;
  roleName: string;
}

interface Department {
  departmentId: number;
  departmentName: string;
}

@Component({
  selector: 'app-users-management',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbComponent],
  templateUrl: './users-management.html',
  styleUrl: './users-management.scss'
})
export class UsersManagementComponent implements OnInit {
  users: User[] = [];
  isLoading = false;
  showAddModal = false;
  showEditModal = false;
  showPermissionModal = false;
  
  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;
  totalItems = 0;
  
  // Form data
  formData = {
    name: '',
    email: '',
    passwordHash: '',
    roleId: 0,
    departmentId: 0,
    phone: 0
  };
  
  editFormData = { ...this.formData, userId: 0 };
  selectedUser: User | null = null;
  
  // Permissions
  permissions: Permission[] = [];
  userPermissions: UserPermission[] = []; // User permissions with hasPermission flag
  selectedPermissionId = 0;
  selectedRoleId = 0;
  userPermissionIds: number[] = []; // Track which permissions the selected user has (kept for backward compatibility)
  
  // Roles and Departments
  roles: Role[] = [];
  departments: Department[] = [];

  constructor(
    private httpService: HttpService,
    public sessionService: SessionService, // Made public for template access
    private toastService: ToastService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    if (!this.sessionService.hasPermission('GetUsers')) {
      return;
    }
    this.loadPermissions();
    // Try to load roles and departments from endpoints, with fallback
    this.loadRolesAndDepartments();
  }

  loadRolesAndDepartments(): void {
    // Try to fetch from endpoints first
    forkJoin({
      roles: this.httpService.get<Role[]>(API_CONFIG.ENDPOINTS.FILTERS.ROLES).pipe(
        catchError(() => of([] as Role[]))
      ),
      departments: this.httpService.get<Department[]>(API_CONFIG.ENDPOINTS.FILTERS.DEPARTMENTS).pipe(
        catchError(() => of([] as Department[]))
      )
    }).subscribe({
      next: (data) => {
        this.ngZone.run(() => {
        this.roles = [...data.roles];
        this.departments = [...data.departments];
        
        // If endpoints returned empty, we'll extract from users after loading
        if (this.roles.length === 0 || this.departments.length === 0) {
          // Load users first to extract roles/departments
          this.loadUsersAndExtractRolesDepartments();
        } else {
          // Endpoints worked, load users normally
          this.loadUsers();
        }
          this.cdr.markForCheck();
        this.cdr.detectChanges();
        });
      },
      error: (error) => {
        this.ngZone.run(() => {
        console.warn('Roles/Departments endpoints not available, will extract from users:', error);
        // Endpoints don't exist, extract from users
        this.loadUsersAndExtractRolesDepartments();
        });
      }
    });
  }

  loadUsersAndExtractRolesDepartments(): void {
    this.isLoading = true;
    const params = {
      PageNumber: this.currentPage,
      PageSize: this.pageSize
    };
    this.httpService.get<User[]>(API_CONFIG.ENDPOINTS.USERS.GET_ALL, params).subscribe({
      next: (data) => {
        this.ngZone.run(() => {
        // Extract unique roles and departments from users
        const uniqueRoles = new Map<string, number>();
        const uniqueDepartments = new Map<string, number>();
        let roleIdCounter = 1;
        let departmentIdCounter = 1;

        data.forEach(user => {
          // Extract roles
          if (user.roleName && !uniqueRoles.has(user.roleName)) {
            uniqueRoles.set(user.roleName, roleIdCounter++);
          }
          // Extract departments
          if (user.departmentName && !uniqueDepartments.has(user.departmentName)) {
            uniqueDepartments.set(user.departmentName, departmentIdCounter++);
          }
        });

        // Convert to arrays
        this.roles = Array.from(uniqueRoles.entries()).map(([name, id]) => ({
          roleId: id,
          roleName: name
        }));

        this.departments = Array.from(uniqueDepartments.entries()).map(([name, id]) => ({
          departmentId: id,
          departmentName: name
        }));

        // Now map users with IDs
        this.users = data.map(user => {
          const role = this.roles.find(r => r.roleName === user.roleName);
          const department = this.departments.find(d => d.departmentName === user.departmentName);
          return {
            ...user,
            roleId: role?.roleId || 0,
            departmentId: department?.departmentId || 0
          };
        });

        // Calculate total pages
        if (data.length < this.pageSize) {
          this.totalPages = this.currentPage;
        } else {
          this.totalPages = this.currentPage + 1;
        }
        
        this.totalItems = (this.currentPage - 1) * this.pageSize + data.length;
        this.isLoading = false;
          this.cdr.markForCheck();
        this.cdr.detectChanges();
        });
      },
      error: (error) => {
        this.ngZone.run(() => {
        console.error('Error loading users:', error);
        this.isLoading = false;
          this.cdr.markForCheck();
        this.cdr.detectChanges();
        });
      }
    });
  }

  loadPermissions(): void {
    this.httpService.get<Permission[]>(API_CONFIG.ENDPOINTS.FILTERS.PERMISSIONS).subscribe({
      next: (data) => {
        this.ngZone.run(() => {
        this.permissions = [...data];
          this.cdr.markForCheck();
        this.cdr.detectChanges();
        });
      }
    });
  }


  loadUsers(): void {
    this.isLoading = true;
    const params = {
      PageNumber: this.currentPage,
      PageSize: this.pageSize
    };
    this.httpService.get<User[]>(API_CONFIG.ENDPOINTS.USERS.GET_ALL, params).subscribe({
      next: (data) => {
        this.ngZone.run(() => {
        // Map roleName and departmentName to IDs using the loaded roles/departments
        this.users = data.map(user => {
          const role = this.roles.find(r => r.roleName === user.roleName);
          const department = this.departments.find(d => d.departmentName === user.departmentName);
          return {
            ...user,
            roleId: role?.roleId || 0,
            departmentId: department?.departmentId || 0
          };
        });
        
        // Calculate total pages
        if (data.length < this.pageSize) {
          this.totalPages = this.currentPage;
        } else {
          this.totalPages = this.currentPage + 1;
        }
        
        this.totalItems = (this.currentPage - 1) * this.pageSize + data.length;
        this.isLoading = false;
          this.cdr.markForCheck();
        this.cdr.detectChanges();
        });
      },
      error: (error) => {
        this.ngZone.run(() => {
        console.error('Error loading users:', error);
        this.isLoading = false;
          this.cdr.markForCheck();
        this.cdr.detectChanges();
        });
      }
    });
  }

  onPageChange(page: number): void {
    if (page < 1 || (this.totalPages > 0 && page > this.totalPages)) return;
    this.currentPage = page;
    this.loadUsers();
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.loadUsers();
  }

  openAddModal(): void {
    this.showAddModal = true;
    this.formData = {
      name: '',
      email: '',
      passwordHash: '',
      roleId: 0,
      departmentId: 0,
      phone: 0
    };
  }

  closeAddModal(): void {
    this.showAddModal = false;
  }

  openEditModal(user: User): void {
    this.showEditModal = true;
    // Map roleName and departmentName to IDs for the form
    const role = this.roles.find(r => r.roleName === user.roleName);
    const department = this.departments.find(d => d.departmentName === user.departmentName);
    
    // Store IDs in editFormData - these will be sent to backend
    this.editFormData = {
      userId: user.userId,
      name: user.name,
      email: user.email,
      passwordHash: '',
      roleId: role?.roleId || user.roleId || 0, // Store numeric ID
      departmentId: department?.departmentId || user.departmentId || 0, // Store numeric ID
      phone: 0
    };
  }

  closeEditModal(): void {
    this.showEditModal = false;
  }

  openPermissionModal(user: User): void {
    this.showPermissionModal = true;
    this.selectedUser = user;
    this.userPermissionIds = [];
    this.userPermissions = [];
    // Load user's current permissions
    this.loadUserPermissions(user.userId);
  }

  loadUserPermissions(userId: number): void {
    this.httpService.get<UserPermission[]>(`${API_CONFIG.ENDPOINTS.FILTERS.PERMISSIONS}?userId=${userId}`).subscribe({
      next: (data) => {
        this.ngZone.run(() => {
        this.userPermissions = [...data];
        // Update userPermissionIds for backward compatibility
        this.userPermissionIds = data
          .filter(p => p.hasPermission)
          .map(p => p.permissionsId);
          this.cdr.markForCheck();
        this.cdr.detectChanges();
        });
      },
      error: (error) => {
        this.ngZone.run(() => {
        console.error('Error loading user permissions:', error);
        this.userPermissions = [];
        this.userPermissionIds = [];
          this.cdr.markForCheck();
        this.cdr.detectChanges();
        });
      }
    });
  }

  isPermissionChecked(permissionId: number): boolean {
    // First check userPermissions array (new method)
    const userPermission = this.userPermissions.find(p => p.permissionsId === permissionId);
    if (userPermission) {
      return userPermission.hasPermission;
    }
    // Fallback to userPermissionIds for backward compatibility
    return this.userPermissionIds.includes(permissionId);
  }

  togglePermission(permission: Permission | UserPermission): void {
    if (!this.selectedUser) return;

    const permissionId = permission.permissionsId;
    const isChecked = this.isPermissionChecked(permissionId);

    if (isChecked) {
      // Remove permission
      this.removePermissionFromUser(permissionId);
    } else {
      // Add permission
      this.assignPermissionToUser(permissionId);
    }
  }

  closePermissionModal(): void {
    this.showPermissionModal = false;
  }

  createUser(): void {
    if (!this.formData.name || !this.formData.email || !this.formData.passwordHash) {
      this.toastService.warning('Name, Email, and Password are required');
      return;
    }

    if (this.formData.roleId === 0) {
      this.toastService.warning('Please select a role');
      return;
    }

    // Ensure roleId and departmentId are numbers - these are sent to backend
    const payload = {
      name: this.formData.name,
      email: this.formData.email,
      passwordHash: this.formData.passwordHash,
      roleId: Number(this.formData.roleId),
      departmentId: Number(this.formData.departmentId) || 0,
      phone: this.formData.phone || 0
    };
    
    this.httpService.post(API_CONFIG.ENDPOINTS.USERS.CREATE, payload).subscribe({
      next: () => {
        this.toastService.success('User created successfully');
        this.closeAddModal();
        // Reload roles/departments in case new ones were added
        this.loadRolesAndDepartments();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error creating user:', error);
        this.toastService.error('Failed to create user. Please check the console for details.');
        this.cdr.detectChanges();
      }
    });
  }

  updateUser(): void {
    if (!this.editFormData.name || !this.editFormData.email) {
      this.toastService.warning('Name and Email are required');
      return;
    }

    if (this.editFormData.roleId === 0) {
      this.toastService.warning('Please select a role');
      return;
    }

    // Ensure roleId and departmentId are numbers - these are sent to backend
    const payload = {
      name: this.editFormData.name,
      email: this.editFormData.email,
      passwordHash: this.editFormData.passwordHash || '',
      roleId: Number(this.editFormData.roleId), // Send numeric ID to backend
      departmentId: Number(this.editFormData.departmentId) || 0, // Send numeric ID to backend
      phone: this.editFormData.phone || 0
    };
    
    this.httpService.put(API_CONFIG.ENDPOINTS.USERS.UPDATE(this.editFormData.userId), payload).subscribe({
      next: () => {
        this.toastService.success('User updated successfully');
        this.closeEditModal();
        // Reload to get updated data
        this.loadUsers();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error updating user:', error);
        this.toastService.error('Failed to update user. Please check the console for details.');
        this.cdr.detectChanges();
      }
    });
  }

  toggleUserActive(user: User): void {
    const params = { isActive: !user.isActive };
    this.httpService.put(API_CONFIG.ENDPOINTS.USERS.SET_ACTIVE(user.userId) + `?isActive=${!user.isActive}`, {}).subscribe({
      next: () => {
        this.toastService.success(`User ${!user.isActive ? 'activated' : 'deactivated'} successfully`);
        this.loadUsers();
      },
      error: (error) => {
        this.toastService.error(`Failed to ${!user.isActive ? 'activate' : 'deactivate'} user`);
        console.error('Error toggling user active status:', error);
      }
    });
  }

  assignPermissionToUser(permissionId: number): void {
    if (!this.selectedUser) return;
    
    this.httpService.post(API_CONFIG.ENDPOINTS.ROLE_PERMISSION.ASSIGN_TO_USER, {
      userId: this.selectedUser.userId,
      permissionId: permissionId
    }).subscribe({
      next: () => {
        this.toastService.success('Permission assigned successfully');
        // Update userPermissions array for instant UI update
        const permission = this.userPermissions.find(p => p.permissionsId === permissionId);
        if (permission) {
          permission.hasPermission = true;
        } else {
          // If permission not in userPermissions, find it in permissions and add it
          const perm = this.permissions.find(p => p.permissionsId === permissionId);
          if (perm) {
            this.userPermissions.push({
              permissionsId: perm.permissionsId,
              permissionsName: perm.permissionsName,
              hasPermission: true
            });
          }
        }
        // Also update userPermissionIds for backward compatibility
        if (!this.userPermissionIds.includes(permissionId)) {
          this.userPermissionIds = [...this.userPermissionIds, permissionId];
        }
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error assigning permission:', error);
        this.toastService.error('Failed to assign permission');
        this.cdr.detectChanges();
      }
    });
  }

  removePermissionFromUser(permissionId: number): void {
    if (!this.selectedUser) return;
    
    this.httpService.delete(API_CONFIG.ENDPOINTS.ROLE_PERMISSION.REMOVE_FROM_USER, {
      userId: this.selectedUser.userId,
      permissionId: permissionId
    }).subscribe({
      next: () => {
        this.toastService.success('Permission removed successfully');
        // Update userPermissions array for instant UI update
        const permission = this.userPermissions.find(p => p.permissionsId === permissionId);
        if (permission) {
          permission.hasPermission = false;
        }
        // Also update userPermissionIds for backward compatibility
        this.userPermissionIds = this.userPermissionIds.filter(id => id !== permissionId);
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error removing permission:', error);
        this.toastService.error('Failed to remove permission');
        this.cdr.detectChanges();
      }
    });
  }

  addPermissionToRole(): void {
    if (!this.selectedRoleId || !this.selectedPermissionId) return;
    
    this.httpService.post(API_CONFIG.ENDPOINTS.ROLE_PERMISSION.ADD_TO_ROLE, {
      roleId: this.selectedRoleId,
      permissionId: this.selectedPermissionId
    }).subscribe({
      next: () => {
        this.toastService.success('Permission added to role successfully');
      }
    });
  }

  getUserAvatarColor(user: User): string {
    // Check if this is the current logged-in user
    const sessionData = this.sessionService.getSessionData();
    if (sessionData && sessionData.userId === user.userId) {
      // Use session data for current user (always up-to-date)
      if (sessionData.avatarColor) {
        return UserAvatarUtil.getAvatarColor(sessionData.avatarColor);
      }
      return UserAvatarUtil.generateColorFromId(sessionData.userId);
    }
    // For other users, use their stored avatar color
    return user.avatarColor ? UserAvatarUtil.getAvatarColor(user.avatarColor) : UserAvatarUtil.generateColorFromId(user.userId);
  }

  getUserInitials(user: User): string {
    return UserAvatarUtil.getInitials(user.name);
  }

  exportToExcel(): void {
    const exportData = this.users.map(user => ({
      'User ID': user.userId,
      'Name': user.name,
      'Email': user.email,
      'Role': user.roleName,
      'Department': user.departmentName || '',
      'Status': user.isActive ? 'Active' : 'Inactive',
      'Avatar Color': user.avatarColor || '',
      'Theme': user.theme || ''
    }));
    
    ExcelUtil.exportToExcel(exportData, `users_${new Date().toISOString().split('T')[0]}`);
    this.toastService.success('Users data exported successfully');
  }
}
