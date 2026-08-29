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
  workdayStartHour?: number | null;
  workdayEndHour?: number | null;
  businessHours?: {
    startHour: number;
    endHour: number;
  } | null;
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
    name?: string | null;
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

export interface ScheduleSlot {
  id?: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  durationSlotMinutes?: number;
  isActive?: boolean;
}

export interface AssignProfessionalBranchDto {
  userId: string;
  isPrimary?: boolean;
  schedules?: ScheduleSlot[];
}

export interface UpdateProfessionalScheduleDto {
  schedules: ScheduleSlot[];
}

export interface BranchProfessionalScheduleItem {
  id: string;
  organizationId: string;
  branchId: string;
  userId: string;
  isPrimary: boolean;
  createdAt?: string;
  updatedAt?: string;
  user?: {
    id: string;
    name?: string | null;
    displayName?: string | null;
    email: string;
    role?: string;
  };
  schedules: ScheduleSlot[];
}
