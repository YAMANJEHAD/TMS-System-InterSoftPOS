import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/user.service';
import { RolePermissionService } from '../../services/role-permission.service';
import { User } from '../../models/user.model';
import { CreateUserRequest, AssignPermissionToUserRequest, AdminUpdateUserRequest } from '../../models/request.model';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { Permission } from '../../models/filter.model';
import { finalize, forkJoin } from 'rxjs';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css']
})
export class UsersComponent implements OnInit {
  users: User[] = [];
  loading = true;
  error: string | null = null;
  successMessage: string | null = null;

  // Create User Modal
  showCreateModal = false;
  newUser: CreateUserRequest = {
    name: '',
    email: '',
    passwordHash: '',
    roleId: '',
    departmentId: 0,
    phone: 0
  };
  creatingUser = false;

  // Reset Password Modal
  showResetPasswordModal = false;
  resetPasswordEmail = '';
  resetPasswordUserId: number | null = null;
  resettingPassword = false;

  // Permission Modal
  showPermissionModal = false;
  selectedUser: User | null = null;
  availablePermissions: Permission[] = [];
  selectedPermissionIds: number[] = [];
  assigningPermission = false;
  loadingPermissions = false;

  // Check if user is Admin (by role name or permissions)
  private readonly ADMIN_ROLE_NAME = 'Admin';

  constructor(
    private userService: UserService,
    private rolePermissionService: RolePermissionService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Check if user is admin
    const permissions = this.authService.getPermissions();
    console.log('UsersComponent: Current permissions:', permissions);
    console.log('UsersComponent: isAdmin():', this.isAdmin());
    
    if (!this.isAdmin()) {
      const permsStr = permissions.length > 0 ? permissions.join(', ') : 'No permissions found';
      this.error = `Access denied. Admin permissions required. Current permissions: [${permsStr}]. Please ensure your account has admin access.`;
      this.loading = false;
      return;
    }
    this.loadPermissions();
    this.loadUsers();
  }

  isAdminUser(user: User): boolean {
    // Check if user is Admin by role name (case-insensitive)
    return user.roleName?.toLowerCase() === this.ADMIN_ROLE_NAME.toLowerCase();
  }

  loadPermissions(): void {
    this.loadingPermissions = true;
    this.rolePermissionService.getAllPermissions().pipe(
      finalize(() => {
        this.loadingPermissions = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (permissions) => {
        this.availablePermissions = permissions || [];
        console.log('UsersComponent: Loaded permissions:', this.availablePermissions);
      },
      error: (err) => {
        console.error('Error loading permissions:', err);
        // Fallback: use permissions from current user's session
        const currentPerms = this.authService.getPermissions();
        if (currentPerms && currentPerms.length > 0) {
          this.availablePermissions = currentPerms.map((perm, index) => ({
            permissionId: index + 1,
            permissionName: perm
          }));
          console.log('UsersComponent: Using permissions from session as fallback:', this.availablePermissions);
        } else {
          this.availablePermissions = [];
          this.showError('Failed to load permissions. Please refresh the page.');
        }
      }
    });
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  loadUsers(): void {
    this.loading = true;
    this.error = null;
    this.userService.getAllUsers().pipe(
      finalize(() => this.loading = false)
    ).subscribe({
      next: (users) => {
        this.users = users;
      },
      error: (err) => {
        this.error = 'Failed to load users.';
        console.error('Error:', err);
      }
    });
  }

  // Edit User Modal
  showEditModal = false;
  editingUser: User | null = null;
  editUserForm: AdminUpdateUserRequest = {
    name: '',
    email: '',
    passwordHash: '',
    roleId: '',
    departmentId: 0,
    phone: 0
  };
  updatingUser = false;

  // Roles and Departments (you may need to load these from API)
  roles: Array<{ roleId: string; roleName: string }> = [
    { roleId: '1', roleName: 'Admin' },
    { roleId: '2', roleName: 'User' }
  ];
  departments: Array<{ departmentId: number; departmentName: string }> = [
    { departmentId: 1, departmentName: 'IT' },
    { departmentId: 2, departmentName: 'Operations' }
  ];

  toggleUserStatus(user: User): void {
    // Prevent modifying Admin user's status
    if (this.isAdminUser(user)) {
      this.showError('Admin user status cannot be modified.');
      return;
    }

    this.userService.activateUser(user.userId, !user.isActive).subscribe({
      next: () => {
        user.isActive = !user.isActive;
        this.showSuccess('User status updated successfully.');
      },
      error: (err) => {
        this.showError('Failed to update user status.');
        console.error('Error updating user:', err);
      }
    });
  }

  openEditModal(user: User): void {
    this.editingUser = user;
    this.editUserForm = {
      name: user.name,
      email: user.email,
      roleId: user.roleId || '',
      departmentId: user.departmentId || 0,
      phone: user.phone || 0
    };
    this.showEditModal = true;
    this.error = null;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editingUser = null;
    this.error = null;
  }

  updateUser(): void {
    if (!this.editingUser) {
      return;
    }

    // Prevent modifying Admin user
    if (this.isAdminUser(this.editingUser)) {
      this.showError('Admin user cannot be modified.');
      return;
    }

    this.updatingUser = true;
    this.error = null;

    // Only include fields that have values
    const updateData: AdminUpdateUserRequest = {};
    if (this.editUserForm.name) updateData.name = this.editUserForm.name;
    if (this.editUserForm.email) updateData.email = this.editUserForm.email;
    if (this.editUserForm.passwordHash) updateData.passwordHash = this.editUserForm.passwordHash;
    if (this.editUserForm.roleId) updateData.roleId = this.editUserForm.roleId;
    if (this.editUserForm.departmentId) updateData.departmentId = this.editUserForm.departmentId;
    if (this.editUserForm.phone) updateData.phone = this.editUserForm.phone;

    this.userService.adminUpdateUser(this.editingUser.userId, updateData).subscribe({
      next: () => {
        this.updatingUser = false;
        this.showSuccess('User updated successfully.');
        this.closeEditModal();
        this.loadUsers();
      },
      error: (err) => {
        this.updatingUser = false;
        this.showError(err.error?.message || 'Failed to update user.');
        console.error('Error updating user:', err);
      }
    });
  }

  openCreateModal(): void {
    this.newUser = {
      name: '',
      email: '',
      passwordHash: '',
      roleId: '',
      departmentId: 0,
      phone: 0
    };
    this.showCreateModal = true;
    this.error = null;
    this.successMessage = null;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.newUser = {
      name: '',
      email: '',
      passwordHash: '',
      roleId: '',
      departmentId: 0,
      phone: 0
    };
  }

  createUser(): void {
    if (!this.validateCreateUser()) {
      return;
    }

    this.creatingUser = true;
    this.error = null;
    this.successMessage = null;

    this.userService.createUser(this.newUser).pipe(
      finalize(() => this.creatingUser = false)
    ).subscribe({
      next: () => {
        this.showSuccess('User created successfully.');
        this.closeCreateModal();
        this.loadUsers();
      },
      error: (err) => {
        this.showError(err.error?.message || 'Failed to create user.');
        console.error('Error creating user:', err);
      }
    });
  }

  validateCreateUser(): boolean {
    if (!this.newUser.name || !this.newUser.email || !this.newUser.passwordHash || !this.newUser.roleId) {
      this.showError('Please fill in all required fields.');
      return false;
    }
    if (this.newUser.departmentId <= 0) {
      this.showError('Please select a valid department.');
      return false;
    }
    return true;
  }

  openResetPasswordModal(user: User): void {
    this.resetPasswordEmail = user.email;
    this.resetPasswordUserId = user.userId;
    this.showResetPasswordModal = true;
    this.error = null;
    this.successMessage = null;
  }

  closeResetPasswordModal(): void {
    this.showResetPasswordModal = false;
    this.resetPasswordEmail = '';
    this.resetPasswordUserId = null;
  }

  resetPassword(): void {
    if (!this.resetPasswordEmail && !this.resetPasswordUserId) {
      this.showError('Email or User ID is required.');
      return;
    }

    this.resettingPassword = true;
    this.error = null;
    this.successMessage = null;

    // Use PATCH /api/Users/reset-password
    // The API expects email as a string in the body
    const emailToReset = this.resetPasswordEmail;
    
    this.userService.resetPassword(emailToReset).pipe(
      finalize(() => this.resettingPassword = false)
    ).subscribe({
      next: () => {
        this.showSuccess('Password reset email sent successfully.');
        this.closeResetPasswordModal();
      },
      error: (err) => {
        this.showError(err.error?.message || 'Failed to reset password.');
        console.error('Error resetting password:', err);
      }
    });
  }

  openPermissionModal(user: User): void {
    // Prevent modifying Admin user's permissions
    if (this.isAdminUser(user)) {
      this.showError('Admin user permissions cannot be modified. Admin always has full access.');
      return;
    }

    this.selectedUser = user;
    this.selectedPermissionIds = [];
    this.showPermissionModal = true;
    this.error = null;
    this.successMessage = null;
    
    // Load permissions if not already loaded
    if (this.availablePermissions.length === 0) {
      this.loadPermissions();
    }
  }

  closePermissionModal(): void {
    this.showPermissionModal = false;
    this.selectedUser = null;
    this.selectedPermissionIds = [];
  }

  togglePermissionSelection(permissionId: number): void {
    const index = this.selectedPermissionIds.indexOf(permissionId);
    if (index > -1) {
      this.selectedPermissionIds.splice(index, 1);
    } else {
      this.selectedPermissionIds.push(permissionId);
    }
  }

  isPermissionSelected(permissionId: number): boolean {
    return this.selectedPermissionIds.includes(permissionId);
  }

  assignPermissions(): void {
    if (!this.selectedUser) {
      this.showError('No user selected.');
      return;
    }

    // Prevent modifying Admin user's permissions
    if (this.isAdminUser(this.selectedUser)) {
      this.showError('Admin user permissions cannot be modified. Admin always has full access.');
      return;
    }

    if (this.selectedPermissionIds.length === 0) {
      this.showError('Please select at least one permission.');
      return;
    }

    this.assigningPermission = true;
    this.error = null;
    this.successMessage = null;

    // Assign each selected permission
    const assignRequests = this.selectedPermissionIds.map(permissionId => {
      const request: AssignPermissionToUserRequest = {
        userId: this.selectedUser!.userId,
        permissionId: permissionId
      };
      return this.rolePermissionService.assignPermissionToUser(request);
    });

    // Execute all assignments in parallel
    forkJoin(assignRequests).pipe(
      finalize(() => this.assigningPermission = false)
    ).subscribe({
      next: () => {
        this.showSuccess(`Successfully assigned ${this.selectedPermissionIds.length} permission(s).`);
        this.closePermissionModal();
        this.loadUsers();
      },
      error: (err) => {
        this.showError(err.error?.message || 'Failed to assign permissions.');
        console.error('Error assigning permissions:', err);
      }
    });
  }

  showSuccess(message: string): void {
    this.successMessage = message;
    this.error = null;
    setTimeout(() => {
      this.successMessage = null;
    }, 5000);
  }

  showError(message: string): void {
    this.error = message;
    this.successMessage = null;
  }
}

