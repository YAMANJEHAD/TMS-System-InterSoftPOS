export const API_CONFIG = {
  BASE_URL: 'https://localhost:49714',
  ENDPOINTS: {
    // Auth
    AUTH: {
      LOGIN: '/api/Auth/login',
      SESSION: '/api/Auth/session',
    },
    // Dashboard
    DASHBOARD: '/api/Dashboard',
    // Tasks
    TASKS: {
      GET_ALL: '/api/Tasks',
      GET_BY_ID: (id: number) => `/api/Tasks/${id}`,
      CREATE: '/api/Tasks/create',
      UPDATE: (id: number) => `/api/Tasks/${id}`,
    },
    // Filters
    FILTERS: {
      PRIORITIES: '/api/Filters/priorities',
      PROJECTS: '/api/Filters/projects',
      STATUSES: '/api/Filters/statuses',
      USERS: '/api/Filters/users',
      PERMISSIONS: '/api/Filters/permissions',
      REASONS: '/api/Filters/reasons',
      TECHNICIANS: '/api/Filters/technicians',
      ROLES: '/api/Filters/roles',
      DEPARTMENTS: '/api/Filters/departments',
    },
    // Transfer
    TRANSFER: {
      GET_ALL: '/api/Transfer',
      CREATE: '/api/Transfer',
      UPDATE: (id: number) => `/api/Transfer/${id}`,
      UPDATE_STATUS: (id: number) => `/api/Transfer/${id}/ticket-status`,
      DELETE: (id: number) => `/api/Transfer/${id}`,
    },
    TRANSFER_CHART: '/api/TransferChart',
    // Inventory
    INVENTORY: {
      GET_BY_STATUS: (statusId: number) => `/api/Inventory/status/${statusId}`,
      CHART: '/api/Inventory/chart',
      CREATE: '/api/Inventory',
      INSERT_TECHNICIAN: '/api/Inventory/InsertTechnician',
      UPDATE: (terminalId: number) => `/api/Inventory/${terminalId}`,
      UPDATE_STATUS: (terminalId: number) => `/api/Inventory/${terminalId}/status`,
      DELETE: (terminalId: number) => `/api/Inventory/${terminalId}`,
    },
    // Papers
    PAPERS: {
      GET_ALL: '/api/Papers',
      CREATE: '/api/Papers',
      UPDATE: (id: number) => `/api/Papers/${id}`,
      DELETE: (id: number) => `/api/Papers/${id}`,
    },
    // Job Orders
    JOB_ORDERS: {
      GET_ALL: '/api/JobOrders',
      CREATE: '/api/JobOrders',
    },
    // Reports
    REPORTS: '/api/Reports',
    // Users
    USERS: {
      GET_ALL: '/api/Users',
      CREATE: '/api/Users',
      UPDATE: (id: number) => `/api/Users/${id}`,
      UPDATE_BY_USER: '/api/Users', // PUT without id for UpdateUserByUser
      SET_ACTIVE: (id: number) => `/api/Users/${id}/active`,
      RESET_PASSWORD: '/api/Users/reset-password',
    },
    // Role Permissions
    ROLE_PERMISSION: {
      ADD_TO_ROLE: '/api/RolePermission/AddPermissionToRole',
      ASSIGN_TO_USER: '/api/RolePermission/AssignPermissionToUser',
      GET_USER_PERMISSIONS: (userId: number) => `/api/RolePermission/user/${userId}`,
      REMOVE_FROM_USER: '/api/RolePermission/remove-from-user',
    },
    // Notifications
    NOTIFICATIONS: {
      GET_BY_USER: (userId: number) => `/api/Notifications/GetNotification?userId=${userId}`,
      MARK_READ: (id: number) => `/api/Notifications/${id}/read`,
      DELETE: (id: number) => `/api/Notifications/${id}`,
      CLEAR_OLD: '/api/Notifications/clear-old',
    },
    // Activity
    ACTIVITY: {
      GET_BY_DATE: '/api/Activity',
    },
  },
};

