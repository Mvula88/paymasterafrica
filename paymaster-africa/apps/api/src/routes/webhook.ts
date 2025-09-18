import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { Webhook } from 'svix';

const router = Router();
const prisma = new PrismaClient();

// Clerk webhook for user sync
router.post('/clerk', async (req, res) => {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error('Missing CLERK_WEBHOOK_SECRET');
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  // Verify the webhook signature
  const svix_id = req.headers['svix-id'] as string;
  const svix_timestamp = req.headers['svix-timestamp'] as string;
  const svix_signature = req.headers['svix-signature'] as string;

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return res.status(400).json({ error: 'Missing svix headers' });
  }

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt;

  try {
    evt = wh.verify(JSON.stringify(req.body), {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    });
  } catch (err) {
    console.error('Webhook verification failed:', err);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const eventType = evt.type;
  const { id, ...data } = evt.data;

  switch (eventType) {
    case 'user.created':
      await handleUserCreated(id, data);
      break;

    case 'user.updated':
      await handleUserUpdated(id, data);
      break;

    case 'user.deleted':
      await handleUserDeleted(id);
      break;

    case 'organization.created':
      await handleOrganizationCreated(id, data);
      break;

    case 'organizationMembership.created':
      await handleMembershipCreated(data);
      break;

    default:
      console.log(`Unhandled webhook event: ${eventType}`);
  }

  res.json({ received: true });
});

async function handleUserCreated(clerkUserId: string, data: any) {
  const { email_addresses, first_name, last_name, organization_memberships } = data;

  const email = email_addresses?.[0]?.email_address;
  const orgMembership = organization_memberships?.[0];

  if (!email || !orgMembership) {
    console.log('User created without email or organization');
    return;
  }

  try {
    // Get or create organization
    let organization = await prisma.organization.findUnique({
      where: { clerkOrgId: orgMembership.organization.id },
    });

    if (!organization) {
      organization = await prisma.organization.create({
        data: {
          clerkOrgId: orgMembership.organization.id,
          name: orgMembership.organization.name,
        },
      });
    }

    // Create user
    await prisma.user.create({
      data: {
        clerkUserId,
        email,
        firstName: first_name,
        lastName: last_name,
        organizationId: organization.id,
        role: orgMembership.role === 'admin' ? 'ADMIN' : 'EMPLOYEE',
      },
    });

    console.log(`User created: ${email}`);
  } catch (error) {
    console.error('Error creating user:', error);
  }
}

async function handleUserUpdated(clerkUserId: string, data: any) {
  const { email_addresses, first_name, last_name } = data;
  const email = email_addresses?.[0]?.email_address;

  try {
    await prisma.user.update({
      where: { clerkUserId },
      data: {
        email,
        firstName: first_name,
        lastName: last_name,
      },
    });

    console.log(`User updated: ${email}`);
  } catch (error) {
    console.error('Error updating user:', error);
  }
}

async function handleUserDeleted(clerkUserId: string) {
  try {
    await prisma.user.delete({
      where: { clerkUserId },
    });

    console.log(`User deleted: ${clerkUserId}`);
  } catch (error) {
    console.error('Error deleting user:', error);
  }
}

async function handleOrganizationCreated(clerkOrgId: string, data: any) {
  const { name } = data;

  try {
    await prisma.organization.create({
      data: {
        clerkOrgId,
        name,
      },
    });

    console.log(`Organization created: ${name}`);
  } catch (error) {
    console.error('Error creating organization:', error);
  }
}

async function handleMembershipCreated(data: any) {
  const { user_id, organization_id, role } = data;

  try {
    // Find user and organization
    const user = await prisma.user.findUnique({
      where: { clerkUserId: user_id },
    });

    const organization = await prisma.organization.findUnique({
      where: { clerkOrgId: organization_id },
    });

    if (user && organization) {
      // Update user's organization and role
      await prisma.user.update({
        where: { id: user.id },
        data: {
          organizationId: organization.id,
          role: role === 'admin' ? 'ADMIN' : 'EMPLOYEE',
        },
      });

      console.log(`Membership created for user ${user.email}`);
    }
  } catch (error) {
    console.error('Error handling membership:', error);
  }
}

export default router;