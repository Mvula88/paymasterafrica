import { Request, Response, NextFunction } from 'express';
import { Clerk } from '@clerk/backend';
import { PrismaClient, UserRole } from '@prisma/client';

const clerk = new Clerk({ secretKey: process.env.CLERK_SECRET_KEY! });
const prisma = new PrismaClient();

export interface AuthRequest extends Request {
  auth?: {
    userId: string;
    sessionId: string;
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
    const sessionToken = req.headers.authorization?.replace('Bearer ', '');

    if (!sessionToken) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    const session = await clerk.sessions.verifySession({
      sessionId: sessionToken,
      token: sessionToken,
    });

    if (!session) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { clerkUserId: session.userId },
      include: { organization: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    req.auth = {
      userId: session.userId,
      sessionId: session.id,
      orgId: user.organizationId,
      user,
    };

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