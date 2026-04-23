import User from "../models/User.js";

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
    const { coordinates, pincode, city } = req.body;

    if (!Array.isArray(coordinates) || coordinates.length < 2) {
      return res.status(400).json({ success: false, message: "coordinates must be [lng, lat]" });
    }

    const lng = Number(coordinates[0]);
    const lat = Number(coordinates[1]);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
      return res.status(400).json({ success: false, message: "Invalid coordinates" });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    user.location = {
      type: "Point",
      coordinates: [lng, lat],
      city: city ?? user.location?.city,
      pincode: pincode ?? user.location?.pincode,
    };

    await user.save();

    res.status(200).json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

