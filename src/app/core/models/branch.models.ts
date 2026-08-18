export interface Branch {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  address?: string | null;
  phone?: string | null;
  timezone: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  isPrimary?: boolean;
}

export interface CreateBranchDto {
  name: string;
  code: string;
  address?: string;
  phone?: string;
  timezone?: string;
  isActive?: boolean;
}

export interface UpdateBranchDto {
  name?: string;
  code?: string;
  address?: string;
  phone?: string;
  timezone?: string;
  isActive?: boolean;
}

export interface AssignUserBranchDto {
  userId: string;
  branchId?: string;
  isPrimary?: boolean;
}

export interface UserBranchAccess {
  id: string;
  organizationId: string;
  userId: string;
  branchId: string;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    displayName?: string | null;
    email: string;
    role?: string;
  };
  branch?: Branch;
}

export interface BranchStaffAssignmentItem {
  userId: string;
  displayName: string;
  email: string;
  role: string;
  isAssigned: boolean;
  isPrimary: boolean;
  accessId?: string;
}
