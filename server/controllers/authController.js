import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import { resolveLocationInput } from '../utils/locationUtils.js';
import axios from 'axios';

function getClientUrl() {
  const raw = (process.env.CLIENT_URL || "").split(",")[0]?.trim();
  return raw || "http://localhost:5173";
}

function getGoogleRedirectUri() {
  return process.env.GOOGLE_REDIRECT_URI || `${(process.env.API_URL || 'http://localhost:5000/api').replace(/\/$/, '')}/auth/google/callback`;
}

async function findOrCreateGoogleUser({ email, name }) {
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      name: name || email.split('@')[0],
      email,
      password: crypto.randomBytes(24).toString('hex'),
      hasPassword: false,
      role: 'requester',
      authProvider: 'google',
      needsOnboarding: true,
    });
  }
  return user;
}

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  try {
    const { name, email, password, role, bloodGroup, pincode, coordinates, city, address, phone, accuracy } = req.body;
    const locale = req.body?.locale || req.headers["accept-language"];

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const location = await resolveLocationInput({
      coordinates,
      pincode,
      city,
      address,
      accuracy,
      locale,
    });

    const safeRole = role === "donor" ? "donor" : "requester";

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      phone,
      role: safeRole,
      authProvider: 'local',
      needsOnboarding: false,
      bloodGroup: safeRole === "donor" ? bloodGroup : undefined,
      location
    });

    sendTokenResponse(user, 201, res);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide an email and password' });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Authenticate with Google
// @route   POST /api/auth/google
// @access  Public
export const googleAuth = async (req, res) => {
  try {
    const { credential, accessToken } = req.body;
    if (!credential && !accessToken) {
      return res.status(400).json({ success: false, message: 'Google credential is required' });
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({ success: false, message: 'Google OAuth is not configured on the server' });
    }

    let data;
    if (credential) {
      const response = await axios.get('https://oauth2.googleapis.com/tokeninfo', {
        params: { id_token: credential },
        timeout: 12000,
      });
      data = response.data;

      if (data.aud !== process.env.GOOGLE_CLIENT_ID) {
        return res.status(401).json({ success: false, message: 'Invalid Google audience' });
      }
    } else {
      const [profileResponse, tokenInfoResponse] = await Promise.all([
        axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` },
          timeout: 12000,
        }),
        axios.get('https://www.googleapis.com/oauth2/v1/tokeninfo', {
          params: { access_token: accessToken },
          timeout: 12000,
        }),
      ]);

      data = {
        ...profileResponse.data,
        aud: tokenInfoResponse.data.audience || tokenInfoResponse.data.issued_to,
        email_verified: String(profileResponse.data.email_verified),
      };

      if (data.aud !== process.env.GOOGLE_CLIENT_ID) {
        return res.status(401).json({ success: false, message: 'Invalid Google audience' });
      }
    }

    if (!data.email || data.email_verified !== 'true') {
      return res.status(400).json({ success: false, message: 'Google account email is not verified' });
    }

    let user = await User.findOne({ email: data.email });
    if (!user) {
      user = await User.create({
        name: data.name || data.email.split('@')[0],
        email: data.email,
        password: crypto.randomBytes(24).toString('hex'),
        role: 'requester',
        authProvider: 'google',
        needsOnboarding: true,
      });
    }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    const message = err?.response?.data?.error_description || err?.message || 'Google authentication failed';
    res.status(401).json({ success: false, message });
  }
};

// @desc    Google OAuth redirect callback
// @route   GET /api/auth/google/callback
// @access  Public
export const googleRedirectCallback = async (req, res) => {
  try {
    const { code, error } = req.query;
    const clientUrl = getClientUrl();

    if (error) {
      return res.redirect(`${clientUrl}/auth/callback?error=${encodeURIComponent(String(error))}`);
    }

    if (!code) {
      return res.redirect(`${clientUrl}/auth/callback?error=${encodeURIComponent('Missing Google authorization code')}`);
    }

    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.redirect(`${clientUrl}/auth/callback?error=${encodeURIComponent('Google OAuth is not configured on the server')}`);
    }

    const tokenResponse = await axios.post(
      'https://oauth2.googleapis.com/token',
      new URLSearchParams({
        code: String(code),
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: getGoogleRedirectUri(),
        grant_type: 'authorization_code',
      }).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 12000,
      }
    );

    const googleAccessToken = tokenResponse.data?.access_token;
    if (!googleAccessToken) {
      return res.redirect(`${clientUrl}/auth/callback?error=${encodeURIComponent('Failed to get Google access token')}`);
    }

    const profileResponse = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${googleAccessToken}` },
      timeout: 12000,
    });

    const profile = profileResponse.data;
    if (!profile?.email || !profile?.email_verified) {
      return res.redirect(`${clientUrl}/auth/callback?error=${encodeURIComponent('Google account email is not verified')}`);
    }

    const user = await findOrCreateGoogleUser({
      email: profile.email,
      name: profile.name,
    });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '30d'
    });

    return res.redirect(`${clientUrl}/auth/callback?token=${encodeURIComponent(token)}`);
  } catch (err) {
    const clientUrl = getClientUrl();
    const message = err?.response?.data?.error_description || err?.message || 'Google authentication failed';
    return res.redirect(`${clientUrl}/auth/callback?error=${encodeURIComponent(message)}`);
  }
};

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });

  const userData = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    authProvider: user.authProvider,
    hasPassword: user.hasPassword,
    needsOnboarding: user.needsOnboarding,
    phone: user.phone,
    bloodGroup: user.bloodGroup,
    availability: user.availability,
    location: user.location,
    settings: user.settings,
  };

  res.status(statusCode).json({
    success: true,
    token,
    user: userData
  });
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Change or set password
// @route   PATCH /api/auth/change-password
// @access  Private
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || String(newPassword).length < 6) {
      return res.status(400).json({ success: false, message: "New password must be at least 6 characters" });
    }

    const user = await User.findById(req.user.id).select("+password");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.authProvider === "local" || user.hasPassword) {
      if (!currentPassword) {
        return res.status(400).json({ success: false, message: "Current password is required" });
      }

      const isMatch = await user.matchPassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: "Current password is incorrect" });
      }
    }

    user.password = newPassword;
    user.hasPassword = true;
    await user.save();

    return res.status(200).json({
      success: true,
      message: user.authProvider === "google" ? "Password added to your account." : "Password updated successfully.",
      data: {
        hasPassword: user.hasPassword,
        authProvider: user.authProvider,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Debug Google OAuth config presence
// @route   GET /api/auth/google/config-check
// @access  Public (development helper)
export const googleConfigCheck = async (req, res) => {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID || "";
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";

    res.status(200).json({
      success: true,
      data: {
        hasGoogleClientId: Boolean(clientId),
        hasGoogleClientSecret: Boolean(clientSecret),
        clientIdPreview: clientId ? `${clientId.slice(0, 12)}...${clientId.slice(-12)}` : "",
        clientSecretPreview: clientSecret ? `${clientSecret.slice(0, 6)}...${clientSecret.slice(-4)}` : "",
        redirectUri: getGoogleRedirectUri(),
        clientUrl: getClientUrl(),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
