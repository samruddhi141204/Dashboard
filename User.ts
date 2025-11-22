import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  role: 'operator' | 'supervisor' | 'manager' | 'admin';
  employeeId?: string;
  department?: string;
  shift?: string;
  workstation?: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    role: {
      type: String,
      enum: ['operator', 'supervisor', 'manager', 'admin'],
      required: true,
    },
    employeeId: { type: String },
    department: { type: String },
    shift: { type: String },
    workstation: { type: String },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', UserSchema);

