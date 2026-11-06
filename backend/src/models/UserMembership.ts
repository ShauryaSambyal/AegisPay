import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type UserRole = 'owner' | 'analyst' | 'admin';
export type MembershipStatus = 'active' | 'invited' | 'deactivated';

export interface IUserMembership extends Document {
  firebaseUid: string;
  providerId: Types.ObjectId;
  email: string;
  name?: string;
  role: UserRole;
  permissions: string[];
  status: MembershipStatus;
  invitedBy?: string;
  invitedAt?: Date;
  deactivatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserMembershipSchema = new Schema<IUserMembership>(
  {
    firebaseUid: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    providerId: {
      type: Schema.Types.ObjectId,
      ref: 'Provider',
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      trim: true,
      default: '',
    },
    role: {
      type: String,
      enum: ['owner', 'analyst', 'admin'],
      default: 'analyst',
      index: true,
    },
    permissions: {
      type: [String],
      default: ['view_merchants', 'view_reports'],
    },
    status: {
      type: String,
      enum: ['active', 'invited', 'deactivated'],
      default: 'active',
      index: true,
    },
    invitedBy: {
      type: String,
    },
    invitedAt: {
      type: Date,
    },
    deactivatedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// One active user membership per provider
UserMembershipSchema.index({ firebaseUid: 1, providerId: 1 }, { unique: true });
UserMembershipSchema.index({ email: 1, providerId: 1 });

export const UserMembership: Model<IUserMembership> =
  mongoose.models.UserMembership ||
  mongoose.model<IUserMembership>('UserMembership', UserMembershipSchema);
