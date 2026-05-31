import type { ProductMajor } from './catalog';

export interface ProfileUser {
    id: number;
    username: string;
    email: string;
    fullName?: string | null;
    phone?: string | null;
    address?: string | null;
    role?: string;
    status?: string;
    studentId?: string | null;
    majorId?: number | null;
    avatarUrl?: string | null;
    emailVerifiedAt?: string | null;
    major?: ProductMajor | null;
    points?: number | null;
}

export interface ProfileUpdatePayload {
    fullName?: string;
    phone?: string;
    address?: string;
    otp?: string;
}

export interface ProfileState {
    user: ProfileUser | null;
    isLoading: boolean;
    isUpdating: boolean;
    error: string | null;
    updateSuccess: boolean;
}
