import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { ENV } from '../config/env.js';
import { setAuthCookie, clearAuthCookie } from '../middleware/auth.js';
import { registerSchema, loginSchema, changePasswordSchema } from '../validators/schemas.js';

export async function getAuthStatus(req, res, next) {
  try {
    const userCount = await User.countDocuments();
    const hasOwner = userCount > 0;
    const canRegister = !hasOwner || ENV.ALLOW_REGISTRATION;

    return res.json({
      success: true,
      hasOwner,
      canRegister,
    });
  } catch (error) {
    next(error);
  }
}

export async function registerOwner(req, res, next) {
  try {
    const data = registerSchema.parse(req.body);
    const userCount = await User.countDocuments();

    // Lock registration if owner already exists and registration not explicitly enabled
    if (userCount > 0 && !ENV.ALLOW_REGISTRATION) {
      return res.status(403).json({
        success: false,
        message: 'Registration is locked. This companion app is configured for a single owner.',
      });
    }

    const existing = await User.findOne({ email: data.email });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    const user = new User({
      name: data.name,
      email: data.email,
      password: data.password,
      role: 'owner',
    });
    await user.save();

    const token = jwt.sign({ id: user._id, role: user.role }, ENV.JWT_SECRET, {
      expiresIn: ENV.JWT_EXPIRES_IN,
    });

    setAuthCookie(res, token);

    return res.status(201).json({
      success: true,
      message: 'Owner account successfully created.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        primaryVehicle: user.primaryVehicle,
      },
      token,
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const data = loginSchema.parse(req.body);
    const user = await User.findOne({ email: data.email });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const isMatch = await user.comparePassword(data.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, ENV.JWT_SECRET, {
      expiresIn: ENV.JWT_EXPIRES_IN,
    });

    setAuthCookie(res, token);

    return res.json({
      success: true,
      message: 'Logged in successfully.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        primaryVehicle: user.primaryVehicle,
      },
      token,
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(req, res) {
  clearAuthCookie(res);
  return res.json({
    success: true,
    message: 'Logged out successfully.',
  });
}

export async function getMe(req, res, next) {
  try {
    const user = await User.findById(req.user._id).select('-password').populate('primaryVehicle');
    return res.json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
}

export async function changePassword(req, res, next) {
  try {
    const data = changePasswordSchema.parse(req.body);
    const user = await User.findById(req.user._id);

    const isMatch = await user.comparePassword(data.currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect current password.',
      });
    }

    user.password = data.newPassword;
    await user.save();

    return res.json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (error) {
    next(error);
  }
}
