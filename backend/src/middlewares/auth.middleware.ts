import { Request, Response, NextFunction } from 'express';
import { AuthService, AuthTokenPayload } from '../services/auth.service.js';
import { UserRole } from '../types/index.js';

export interface AuthenticatedRequest extends Request {
  user?: AuthTokenPayload;
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  // 1. Check for Demo Role header for frictionless multi-role testing in development only
  const isProd = process.env.NODE_ENV === 'production';
  const demoRole = req.header('X-Demo-Role') as UserRole;
  if (demoRole && !isProd) {
    const demo = AuthService.getDemoUserByRole(demoRole);
    if (demo) {
      req.user = {
        userId: demo.user.id,
        email: demo.user.email,
        role: demoRole,
        clinicId: demo.clinicId,
        isPlatformAdmin: demoRole === 'platform_owner'
      };
      return next();
    }
  }

  // 2. Check for Authorization header
  const authHeader = req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Missing Bearer token.' });
    return;
  }

  const token = authHeader.substring(7);
  const payload = AuthService.verifyToken(token);

  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired authentication token.' });
    return;
  }

  req.user = payload;
  next();
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    if (req.user.isPlatformAdmin || allowedRoles.includes(req.user.role)) {
      return next();
    }

    res.status(403).json({
      error: `Access denied. Requires one of roles: [${allowedRoles.join(', ')}]`,
      userRole: req.user.role
    });
  };
}

export function requireTenant(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  const requestedClinicId = req.params.clinicId || req.body.clinicId || (req.query.clinicId as string);

  // Platform admin can inspect any tenant
  if (req.user.isPlatformAdmin) {
    return next();
  }

  if (requestedClinicId && req.user.clinicId && requestedClinicId !== req.user.clinicId) {
    res.status(403).json({ error: 'Tenant isolation violation: Access denied to foreign clinic tenant.' });
    return;
  }

  next();
}
