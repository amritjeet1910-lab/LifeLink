import User from "../models/User.js";

// @desc    Get nearby donors using geo query
// @route   GET /api/donors/nearby?lat=..&lng=..&maxDistance=..&bloodGroup=..&availableOnly=true
// @access  Public
export const getNearbyDonors = async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const maxDistance = Math.min(Math.max(Number(req.query.maxDistance) || 10000, 500), 50000); // meters
    const bloodGroup = req.query.bloodGroup;
    const pincode = req.query.pincode;
    const availableOnly = String(req.query.availableOnly || "true") !== "false";

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ success: false, message: "lat and lng are required numbers" });
    }

    const query = { role: "donor" };
    if (availableOnly) query.availability = true;
    if (bloodGroup) query.bloodGroup = bloodGroup;
    if (pincode) query["location.pincode"] = pincode;

    const donors = await User.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [lng, lat] },
          distanceField: "distanceMeters",
          spherical: true,
          maxDistance,
          query,
        },
      },
      {
        $project: {
          name: 1,
          bloodGroup: 1,
          availability: 1,
          location: 1,
          distanceMeters: 1,
        },
      },
      { $limit: 200 },
    ]);

    res.status(200).json({ success: true, count: donors.length, data: donors });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
