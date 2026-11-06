import { Router, Request, Response } from 'express';
import { requireAuth, requireProvider, requireProviderApproval, requireRole } from '../middleware/auth.js';
import { Provider } from '../models/Provider.js';
import { UserMembership } from '../models/UserMembership.js';
import { logAudit } from '../services/auditService.js';
import { sendError } from '../lib/errors.js';
import { isDatabaseConnected } from '../config/database.js';
import { Types } from 'mongoose';

const router = Router();

/**
 * POST /api/providers/register
 * Submit a payment service provider organization application.
 * Authenticated user becomes the Provider Owner.
 */
router.post('/register', requireAuth, async (req: Request, res: Response): Promise<void> => {
  if (!isDatabaseConnected()) {
    sendError(res, 503, 'DATABASE_UNAVAILABLE', 'MongoDB is not connected. Provider registration requires database access.');
    return;
  }

  try {
    const {
      organisationName,
      registeredBusinessName,
      officialEmail,
      contactPerson,
      contactNumber,
      country,
      state,
      city,
      website,
      registrationIdentifier,
      businessDescription,
      verificationDocuments,
    } = req.body;

    // Validate required fields
    if (
      !organisationName ||
      !registeredBusinessName ||
      !officialEmail ||
      !contactPerson ||
      !contactNumber ||
      !country ||
      !state ||
      !city ||
      !businessDescription
    ) {
      sendError(res, 400, 'MISSING_REQUIRED_FIELDS', 'Please provide all mandatory provider registration details.');
      return;
    }

    // Check if user already owns or belongs to a provider organization
    const existingMembership = await UserMembership.findOne({
      firebaseUid: req.user!.uid,
      status: 'active',
    });

    if (existingMembership) {
      sendError(
        res,
        409,
        'ALREADY_MEMBER_OF_PROVIDER',
        'Your user account is already associated with an existing provider organization.'
      );
      return;
    }

    // Create Provider organization with PENDING_APPROVAL status
    const provider = await Provider.create({
      organisationName: organisationName.trim(),
      registeredBusinessName: registeredBusinessName.trim(),
      officialEmail: officialEmail.trim().toLowerCase(),
      contactPerson: contactPerson.trim(),
      contactNumber: contactNumber.trim(),
      country: country.trim(),
      state: state.trim(),
      city: city.trim(),
      website: website?.trim() || '',
      registrationIdentifier: registrationIdentifier?.trim() || '',
      businessDescription: businessDescription.trim(),
      verificationDocuments: Array.isArray(verificationDocuments) ? verificationDocuments : [],
      status: 'PENDING_APPROVAL',
      ownerUserId: req.user!.uid,
    });

    // Create Owner membership record
    const membership = await UserMembership.create({
      firebaseUid: req.user!.uid,
      providerId: provider._id,
      email: req.user!.email || officialEmail.trim().toLowerCase(),
      name: req.user!.displayName || contactPerson.trim(),
      role: 'owner',
      permissions: ['all', 'manage_org', 'upload_datasets', 'manage_merchants', 'view_reports'],
      status: 'active',
    });

    // Audit log
    await logAudit({
      providerId: provider._id as Types.ObjectId,
      userId: req.user!.uid,
      action: 'PROVIDER_REGISTERED',
      resourceType: 'provider',
      resourceId: String(provider._id),
      ipAddress: req.ip,
      metadata: { organisationName, officialEmail },
    });

    res.status(201).json({
      success: true,
      message: 'Provider organization registered successfully and submitted for administrative approval.',
      data: {
        provider,
        membership,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    sendError(res, 500, 'REGISTRATION_FAILED', `Failed to register provider organization: ${msg}`);
  }
});

/**
 * GET /api/providers/me
 * Return the authenticated provider's organization details.
 */
router.get('/me', requireAuth, requireProvider, async (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      provider: req.provider,
      membership: req.membership,
    },
  });
});

/**
 * PATCH /api/providers/me
 * Update permitted organization information.
 * Enforces Provider Owner or Platform Admin permissions.
 */
router.patch(
  '/me',
  requireAuth,
  requireProvider,
  requireRole('owner', 'admin'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const allowedFields = [
        'website',
        'contactPerson',
        'contactNumber',
        'businessDescription',
        'verificationDocuments',
        'city',
        'state',
      ];

      const updates: Record<string, unknown> = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }

      if (Object.keys(updates).length === 0) {
        sendError(res, 400, 'NO_VALID_UPDATES', 'No updatable fields provided');
        return;
      }

      const updatedProvider = await Provider.findByIdAndUpdate(
        req.provider!._id,
        { $set: updates },
        { new: true }
      );

      await logAudit({
        providerId: req.provider!._id as Types.ObjectId,
        userId: req.user!.uid,
        action: 'PROVIDER_UPDATED',
        resourceType: 'provider',
        resourceId: String(req.provider!._id),
        ipAddress: req.ip,
        metadata: { updatedFields: Object.keys(updates) },
      });

      res.json({
        success: true,
        message: 'Provider organization updated successfully',
        data: updatedProvider,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      sendError(res, 500, 'UPDATE_FAILED', `Failed to update provider: ${msg}`);
    }
  }
);

/**
 * GET /api/providers/me/members
 * List all members belonging to this provider organization.
 */
router.get(
  '/me/members',
  requireAuth,
  requireProvider,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const members = await UserMembership.find({
        providerId: req.provider!._id,
      }).sort({ createdAt: -1 });

      res.json({
        success: true,
        count: members.length,
        data: members,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      sendError(res, 500, 'MEMBERS_FETCH_FAILED', `Failed to retrieve members: ${msg}`);
    }
  }
);

/**
 * POST /api/providers/me/members/invite
 * Invite or add an employee (analyst/owner) to the provider organization.
 */
router.post(
  '/me/members/invite',
  requireAuth,
  requireProvider,
  requireProviderApproval,
  requireRole('owner', 'admin'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, name, role = 'analyst', permissions } = req.body;

      if (!email || !email.includes('@')) {
        sendError(res, 400, 'INVALID_EMAIL', 'A valid email is required to invite a member');
        return;
      }

      const validRoles = ['analyst', 'owner'];
      const chosenRole = validRoles.includes(role) ? role : 'analyst';

      // Check if user is already a member
      const existing = await UserMembership.findOne({
        providerId: req.provider!._id,
        email: email.trim().toLowerCase(),
      });

      if (existing && existing.status === 'active') {
        sendError(res, 409, 'ALREADY_A_MEMBER', 'This user is already an active member of your organization');
        return;
      }

      const membership = await UserMembership.create({
        firebaseUid: `invited_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        providerId: req.provider!._id,
        email: email.trim().toLowerCase(),
        name: name?.trim() || '',
        role: chosenRole,
        permissions: Array.isArray(permissions)
          ? permissions
          : chosenRole === 'owner'
          ? ['all', 'manage_org', 'upload_datasets', 'manage_merchants', 'view_reports']
          : ['upload_datasets', 'manage_merchants', 'view_reports'],
        status: 'active',
        invitedBy: req.user!.uid,
        invitedAt: new Date(),
      });

      await logAudit({
        providerId: req.provider!._id as Types.ObjectId,
        userId: req.user!.uid,
        action: 'MEMBER_INVITED',
        resourceType: 'member',
        resourceId: String(membership._id),
        ipAddress: req.ip,
        metadata: { email, role: chosenRole },
      });

      res.status(201).json({
        success: true,
        message: `Member ${email} added successfully with role '${chosenRole}'`,
        data: membership,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      sendError(res, 500, 'INVITE_FAILED', `Failed to invite member: ${msg}`);
    }
  }
);

/**
 * PATCH /api/providers/me/members/:memberId
 * Update a member's role or permissions.
 */
router.patch(
  '/me/members/:memberId',
  requireAuth,
  requireProvider,
  requireRole('owner', 'admin'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { memberId } = req.params;
      const { role, permissions, status } = req.body;

      if (!Types.ObjectId.isValid(memberId)) {
        sendError(res, 400, 'INVALID_MEMBER_ID', 'Invalid member ID format');
        return;
      }

      const member = await UserMembership.findOne({
        _id: new Types.ObjectId(memberId),
        providerId: req.provider!._id,
      });

      if (!member) {
        sendError(res, 404, 'MEMBER_NOT_FOUND', 'Member not found in your organization');
        return;
      }

      // Prevent demoting the last owner
      if (member.role === 'owner' && role && role !== 'owner') {
        const ownerCount = await UserMembership.countDocuments({
          providerId: req.provider!._id,
          role: 'owner',
          status: 'active',
        });
        if (ownerCount <= 1) {
          sendError(res, 400, 'CANNOT_DEMOTE_LAST_OWNER', 'An organization must have at least one active owner');
          return;
        }
      }

      if (role && ['owner', 'analyst'].includes(role)) {
        member.role = role;
      }
      if (Array.isArray(permissions)) {
        member.permissions = permissions;
      }
      if (status && ['active', 'invited', 'deactivated'].includes(status)) {
        member.status = status;
      }

      await member.save();

      await logAudit({
        providerId: req.provider!._id as Types.ObjectId,
        userId: req.user!.uid,
        action: 'MEMBER_UPDATED',
        resourceType: 'member',
        resourceId: String(member._id),
        ipAddress: req.ip,
        metadata: { role, permissions, status },
      });

      res.json({
        success: true,
        message: 'Member updated successfully',
        data: member,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      sendError(res, 500, 'UPDATE_MEMBER_FAILED', `Failed to update member: ${msg}`);
    }
  }
);

/**
 * DELETE /api/providers/me/members/:memberId
 * Deactivate a member from the organization.
 */
router.delete(
  '/me/members/:memberId',
  requireAuth,
  requireProvider,
  requireRole('owner', 'admin'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { memberId } = req.params;

      if (!Types.ObjectId.isValid(memberId)) {
        sendError(res, 400, 'INVALID_MEMBER_ID', 'Invalid member ID format');
        return;
      }

      const member = await UserMembership.findOne({
        _id: new Types.ObjectId(memberId),
        providerId: req.provider!._id,
      });

      if (!member) {
        sendError(res, 404, 'MEMBER_NOT_FOUND', 'Member not found in your organization');
        return;
      }

      // Prevent deactivating oneself if sole owner
      if (member.firebaseUid === req.user!.uid && member.role === 'owner') {
        const ownerCount = await UserMembership.countDocuments({
          providerId: req.provider!._id,
          role: 'owner',
          status: 'active',
        });
        if (ownerCount <= 1) {
          sendError(res, 400, 'CANNOT_REMOVE_SOLE_OWNER', 'You cannot deactivate the sole owner of the organization');
          return;
        }
      }

      member.status = 'deactivated';
      member.deactivatedAt = new Date();
      await member.save();

      await logAudit({
        providerId: req.provider!._id as Types.ObjectId,
        userId: req.user!.uid,
        action: 'MEMBER_DEACTIVATED',
        resourceType: 'member',
        resourceId: String(member._id),
        ipAddress: req.ip,
        metadata: { memberEmail: member.email },
      });

      res.json({
        success: true,
        message: `Member ${member.email} has been deactivated`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      sendError(res, 500, 'DEACTIVATE_MEMBER_FAILED', `Failed to deactivate member: ${msg}`);
    }
  }
);

export default router;
