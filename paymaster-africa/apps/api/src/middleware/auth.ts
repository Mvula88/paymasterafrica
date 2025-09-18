import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export interface AuthRequest extends Request {
  auth?: {
    userId: string;
    email: string;
    orgId?: string;
    user?: any;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    // Verify the JWT token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get user from database
    const dbUser = await prisma.user.findUnique({
      where: { clerk_user_id: user.id }, // Using clerk_user_id field to store Supabase user ID
      include: { organization: true },
    });

    if (!dbUser) {
      // Create user if doesn't exist (first time login)
      const org = await prisma.organization.findFirst() ||
        await prisma.organization.create({
          data: {
            name: 'Default Organization',
            clerkOrgId: `org_${user.id}`,
          }
        });

      const newUser = await prisma.user.create({
        data: {
          clerkUserId: user.id,
          email: user.email!,
          firstName: user.user_metadata?.first_name || '',
          lastName: user.user_metadata?.last_name || '',
          organizationId: org.id,
          role: UserRole.EMPLOYEE,
        },
        include: { organization: true }
      });

      req.auth = {
        userId: user.id,
        email: user.email!,
        orgId: newUser.organizationId,
        user: newUser,
      };
    } else {
      req.auth = {
        userId: user.id,
        email: user.email!,
        orgId: dbUser.organizationId,
        user: dbUser,
      };
    }

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

export const requireRole = (roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.auth?.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!roles.includes(req.auth.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

export const requireOwnership = (
  getResourceOrgId: (req: AuthRequest) => Promise<string | null>
) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.auth?.orgId) {
      return res.status(401).json({ error: 'No organization context' });
    }

    const resourceOrgId = await getResourceOrgId(req);

    if (!resourceOrgId) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    if (resourceOrgId !== req.auth.orgId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    next();
  };
};