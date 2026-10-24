import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { StorageService } from './storage.service.js';
import { UserRole } from '../types/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'mediflow_super_secure_jwt_secret_dev_key_2026';

export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  clinicId?: string;
  isPlatformAdmin: boolean;
}

export class AuthService {
  public static generateToken(payload: AuthTokenPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  }

  public static verifyToken(token: string): AuthTokenPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
    } catch {
      return null;
    }
  }

  public static async login(email: string, password: string): Promise<{ token: string; user: any; role: UserRole; clinicId?: string }> {
    const storage = StorageService.getInstance();
    const user = storage.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user || !user.passwordHash) {
      throw new Error('Invalid email or password.');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new Error('Invalid email or password.');
    }

    const membership = storage.memberships.find(m => m.user_id === user.id && m.is_active);
    const role: UserRole = user.is_platform_admin ? 'platform_owner' : (membership?.role || 'patient');
    const clinicId = membership?.clinic_id || 'clinic-st-jude';

    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      role,
      clinicId,
      isPlatformAdmin: Boolean(user.is_platform_admin)
    });

    const { passwordHash: _hash, ...safeUser } = user;

    return { token, user: safeUser, role, clinicId };
  }

  public static async register(data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone: string;
    clinic_id?: string;
    role?: UserRole;
  }): Promise<{ token: string; user: any; role: UserRole; clinicId?: string }> {
    const storage = StorageService.getInstance();
    const existing = storage.users.find(u => u.email.toLowerCase() === data.email.toLowerCase());
    if (existing) {
      throw new Error('User with this email already exists.');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const userId = `user-${uuidv4().substring(0, 8)}`;
    const clinicId = data.clinic_id || 'clinic-st-jude';
    const role: UserRole = data.role || 'patient';

    const newUser = {
      id: userId,
      email: data.email.toLowerCase(),
      first_name: data.first_name,
      last_name: data.last_name,
      phone: data.phone,
      is_platform_admin: false,
      passwordHash,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    storage.users.push(newUser);

    // Create membership
    storage.memberships.push({
      id: `m-${uuidv4().substring(0, 8)}`,
      clinic_id: clinicId,
      user_id: userId,
      role,
      department: role === 'patient' ? 'Patient Portal' : 'Clinical Operations',
      is_active: true,
      joined_at: new Date().toISOString()
    });

    // If patient, also create patient entity
    if (role === 'patient') {
      storage.patients.push({
        id: `pat-${uuidv4().substring(0, 8)}`,
        clinic_id: clinicId,
        user_id: userId,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email.toLowerCase(),
        phone: data.phone,
        nhs_number: '',
        date_of_birth: '1990-01-01',
        gender: 'Prefer not to say',
        address_line1: '',
        city: 'London',
        postal_code: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        emergency_contact_relationship: '',
        medical_allergies: 'None recorded',
        is_active: true,
        created_at: new Date().toISOString()
      });
    }

    const token = this.generateToken({
      userId,
      email: newUser.email,
      role,
      clinicId,
      isPlatformAdmin: false
    });

    const { passwordHash: _hash, ...safeUser } = newUser;

    return { token, user: safeUser, role, clinicId };
  }

  public static getDemoUserByRole(role: UserRole): { token: string; user: any; clinicId: string } | null {
    const storage = StorageService.getInstance();
    
    // Find matching membership or platform admin
    if (role === 'platform_owner') {
      const user = storage.users.find(u => u.is_platform_admin);
      if (!user) return null;
      const token = this.generateToken({
        userId: user.id,
        email: user.email,
        role: 'platform_owner',
        isPlatformAdmin: true
      });
      return { token, user, clinicId: 'clinic-st-jude' };
    }

    if (role === 'patient') {
      const user = storage.users.find(u => u.id === 'user-patient-1');
      const patient = storage.patients.find(p => p.user_id === user?.id);
      if (!user) return null;
      const token = this.generateToken({
        userId: user.id,
        email: user.email,
        role: 'patient',
        clinicId: 'clinic-st-jude',
        isPlatformAdmin: false
      });
      return { token, user: { ...user, patientId: patient?.id }, clinicId: 'clinic-st-jude' };
    }

    const membership = storage.memberships.find(m => m.role === role && m.clinic_id === 'clinic-st-jude');
    if (!membership) return null;

    const user = storage.users.find(u => u.id === membership.user_id);
    if (!user) return null;

    const doctor = role === 'doctor' ? storage.doctors.find(d => d.user_id === user.id) : undefined;

    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      role: membership.role,
      clinicId: membership.clinic_id,
      isPlatformAdmin: false
    });

    return {
      token,
      user: { ...user, doctorId: doctor?.id },
      clinicId: membership.clinic_id
    };
  }
}
