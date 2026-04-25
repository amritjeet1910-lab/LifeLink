import User from "../models/User.js";
import BloodRequest from "../models/BloodRequest.js";
import { resolveLocationInput } from "../utils/locationUtils.js";

// @desc    Update my availability (donors)
// @route   PATCH /api/users/me/availability
// @access  Private
export const updateMyAvailability = async (req, res) => {
  try {
    const availability = Boolean(req.body.availability);
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { availability },
      { new: true, runValidators: true }
    );
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Update my location (explicit opt-in)
// @route   PATCH /api/users/me/location
// @access  Private
export const updateMyLocation = async (req, res) => {
  try {
    const { coordinates, pincode, city, address, accuracy } = req.body;
    const locale = req.body?.locale || req.headers["accept-language"];

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    user.location = await resolveLocationInput({
      coordinates,
      pincode: pincode ?? user.location?.pincode,
      city: city ?? user.location?.city,
      address: address ?? user.location?.address,
      accuracy,
      locale,
    });

    await user.save();

    res.status(200).json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const resolveLocation = async (req, res) => {
  try {
    const { coordinates, pincode, city, address, accuracy } = req.body;
    const locale = req.body?.locale || req.headers["accept-language"];
    const location = await resolveLocationInput({ coordinates, pincode, city, address, accuracy, locale });
    res.status(200).json({ success: true, data: location });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const updateMyProfile = async (req, res) => {
  try {
    const { name, email, phone, bloodGroup, pincode, city, address, coordinates, availability, accuracy } = req.body;
    const locale = req.body?.locale || req.headers["accept-language"];
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (email && email !== user.email) {
      const existing = await User.findOne({ email, _id: { $ne: user._id } });
      if (existing) {
        return res.status(400).json({ success: false, message: "Email already in use" });
      }
      user.email = email;
    }

    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (user.role === "donor" && bloodGroup) user.bloodGroup = bloodGroup;
    if (typeof availability === "boolean" && (user.role === "donor" || user.role === "admin")) {
      user.availability = availability;
    }

    const shouldUpdateLocation =
      coordinates ||
      pincode !== undefined ||
      city !== undefined ||
      address !== undefined;

    if (shouldUpdateLocation) {
      user.location = await resolveLocationInput({
        coordinates: coordinates || user.location?.coordinates,
        pincode: pincode ?? user.location?.pincode,
        city: city ?? user.location?.city,
        address: address ?? user.location?.address,
        accuracy,
        locale,
      });
    }

    await user.save();
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const updateMySettings = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const nextSettings = req.body?.settings || {};

    user.settings = {
      notifications: {
        ...user.settings?.notifications?.toObject?.(),
        ...user.settings?.notifications,
        ...nextSettings.notifications,
      },
      accessibility: {
        ...user.settings?.accessibility?.toObject?.(),
        ...user.settings?.accessibility,
        ...nextSettings.accessibility,
      },
      donorSearch: {
        ...user.settings?.donorSearch?.toObject?.(),
        ...user.settings?.donorSearch,
        ...nextSettings.donorSearch,
      },
    };

    await user.save();
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const completeMyOnboarding = async (req, res) => {
  try {
    const { role, bloodGroup, pincode, city, address, coordinates, accuracy } = req.body;
    const locale = req.body?.locale || req.headers["accept-language"];
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const safeRole = role === "donor" ? "donor" : "requester";
    if (safeRole === "donor" && !bloodGroup) {
      return res.status(400).json({ success: false, message: "Blood group is required for donors" });
    }

    const location = await resolveLocationInput({
      coordinates,
      pincode,
      city,
      address,
      accuracy,
      locale,
    });

    user.role = safeRole;
    user.bloodGroup = safeRole === "donor" ? bloodGroup : undefined;
    user.location = location;
    user.needsOnboarding = false;

    await user.save();
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const listUsersForAdmin = async (req, res) => {
  try {
    const users = await User.find()
      .select("name email phone role bloodGroup availability location createdAt updatedAt")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getAdminOverview = async (req, res) => {
  try {
    const [users, requestStats, recentRequests, recentUsers, groupBreakdown] = await Promise.all([
      User.countDocuments(),
      BloodRequest.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
      BloodRequest.find()
        .populate("requester", "name email")
        .populate("donor", "name email bloodGroup")
        .sort({ createdAt: -1 })
        .limit(8),
      User.find().select("name role bloodGroup createdAt location").sort({ createdAt: -1 }).limit(6),
      BloodRequest.aggregate([
        { $group: { _id: "$bloodGroup", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    const statusMap = requestStats.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    const donors = await User.countDocuments({ role: "donor" });
    const requesters = await User.countDocuments({ role: "requester" });
    const admins = await User.countDocuments({ role: "admin" });
    const availableDonors = await User.countDocuments({ role: "donor", availability: true });

    res.status(200).json({
      success: true,
      data: {
        totals: {
          users,
          donors,
          requesters,
          admins,
          availableDonors,
          totalRequests:
            (statusMap.Pending || 0) +
            (statusMap.Accepted || 0) +
            (statusMap.Completed || 0) +
            (statusMap.Cancelled || 0),
          pendingRequests: statusMap.Pending || 0,
          acceptedRequests: statusMap.Accepted || 0,
          completedRequests: statusMap.Completed || 0,
          cancelledRequests: statusMap.Cancelled || 0,
        },
        recentRequests,
        recentUsers,
        groupBreakdown,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
