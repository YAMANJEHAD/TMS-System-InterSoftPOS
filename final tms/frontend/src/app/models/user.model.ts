export interface User {
  userId: number;
  name: string;
  email: string;
  roleName: string;
  roleId?: string;
  departmentName: string;
  departmentId?: number;
  phone?: number;
  isActive: boolean;
  avatar_color?: string;
  theme?: string;
  passwordHash?: string;
  permissions?: string[]; // User's current permissions
}

