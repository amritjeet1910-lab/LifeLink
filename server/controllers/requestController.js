import BloodRequest from '../models/BloodRequest.js';
import User from '../models/User.js';
import { getIO } from '../socket.js';
import { resolveLocationInput } from '../utils/locationUtils.js';

// @desc    Create new blood request
// @route   POST /api/requests
// @access  Private
export const createRequest = async (req, res) => {
  try {
    const { bloodGroup, urgency, hospitalName, address, pincode, coordinates, city, accuracy } = req.body;
    const locale = req.body?.locale || req.headers["accept-language"];
    const location = await resolveLocationInput({
      coordinates,
      pincode,
      city,
      address,
      accuracy,
      locale,
    });

    const request = await BloodRequest.create({
      requester: req.user.id,
      bloodGroup,
      urgency,
      hospitalName,
      location,
      statusHistory: [{ status: 'Pending', by: req.user.id, note: 'Request created' }]
    });

    // Find nearby donors for notification
    const nearbyDonors = await User.find({
      role: 'donor',
      bloodGroup,
      availability: true,
      'location.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: location.coordinates
          },
          $maxDistance: 10000 // 10km radius
        }
      }
    });

    // Emit socket event to nearby donors
    const donorIds = nearbyDonors.map(d => d._id.toString());
    const io = getIO();
    donorIds.forEach((id) => {
      io.to(`user:${id}`).emit('new_blood_request', {
        requestId: request._id.toString(),
        bloodGroup,
        urgency,
        hospitalName,
        address,
        pincode,
        coordinates: location.coordinates,
        targetDonors: donorIds,
      });
    });

    io.to(`user:${req.user.id}`).emit('request_status', {
      requestId: request._id.toString(),
      status: request.status,
    });

    res.status(201).json({
      success: true,
      data: request,
      nearbyDonorsFound: nearbyDonors.length
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Get all requests (for discovery/admin)
// @route   GET /api/requests
export const getRequests = async (req, res) => {
  try {
    const { pincode, bloodGroup } = req.query;
    let query = {};
    if (pincode) query['location.pincode'] = pincode;
    if (bloodGroup) query.bloodGroup = bloodGroup;

    const requests = await BloodRequest.find(query).populate('requester', 'name email');
    res.status(200).json({ success: true, count: requests.length, data: requests });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Get nearby open requests using geo query
// @route   GET /api/requests/nearby?lat=..&lng=..&maxDistance=..
// @access  Private
export const getNearbyRequests = async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const maxDistance = Math.min(Math.max(Number(req.query.maxDistance) || 10000, 500), 50000);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ success: false, message: "lat and lng are required numbers" });
    }

    const requests = await BloodRequest.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [lng, lat] },
          distanceField: "distanceMeters",
          spherical: true,
          maxDistance,
          query: {
            status: { $in: ["Pending", "Accepted"] },
          },
        },
      },
      {
        $project: {
          requester: 1,
          bloodGroup: 1,
          urgency: 1,
          hospitalName: 1,
          location: 1,
          status: 1,
          donor: 1,
          distanceMeters: 1,
          createdAt: 1,
        },
      },
      { $limit: 200 },
    ]);

    res.status(200).json({ success: true, count: requests.length, data: requests });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Get my requests (requester)
// @route   GET /api/requests/me
// @access  Private
export const getMyRequests = async (req, res) => {
  try {
    const requests = await BloodRequest.find({ requester: req.user.id })
      .sort({ createdAt: -1 })
      .populate('donor', 'name email bloodGroup')
      .select('-__v');
    res.status(200).json({ success: true, count: requests.length, data: requests });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Get my assigned requests (donor)
// @route   GET /api/requests/assigned
// @access  Private
export const getMyAssignedRequests = async (req, res) => {
  try {
    const requests = await BloodRequest.find({ donor: req.user.id })
      .sort({ updatedAt: -1 })
      .populate('requester', 'name email')
      .select('-__v');
    res.status(200).json({ success: true, count: requests.length, data: requests });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Get request details
// @route   GET /api/requests/:id
// @access  Public
export const getRequestById = async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.id)
      .populate('requester', 'name email')
      .populate('donor', 'name email bloodGroup')
      .populate('statusHistory.by', 'name role');
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    res.status(200).json({ success: true, data: request });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Accept blood request
// @route   PUT /api/requests/:id/accept
// @access  Private (Donor only)
export const acceptRequest = async (req, res) => {
  try {
    let request = await BloodRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (request.status !== 'Pending') {
      return res.status(400).json({ success: false, message: 'Request already handled' });
    }

    request.status = 'Accepted';
    request.donor = req.user.id;
    request.acceptedAt = Date.now();
    request.statusHistory.push({ status: 'Accepted', by: req.user.id, note: 'Accepted by donor' });

    await request.save();

    // Notify requester
    const io = getIO();
    io.to(`user:${request.requester.toString()}`).emit('request_accepted', {
      requestId: request._id.toString(),
      donorName: req.user.name,
      requesterId: request.requester.toString()
    });

    io.to(`request:${request._id.toString()}`).emit('request_status', {
      requestId: request._id.toString(),
      status: request.status,
    });

    res.status(200).json({ success: true, data: request });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Cancel request (requester)
// @route   PATCH /api/requests/:id/cancel
// @access  Private (Requester/Admin)
export const cancelRequest = async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    const isOwner = request.requester?.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not allowed to cancel this request' });
    }

    if (request.status === 'Completed') {
      return res.status(400).json({ success: false, message: 'Completed requests cannot be cancelled' });
    }
    if (request.status === 'Cancelled') {
      return res.status(400).json({ success: false, message: 'Request already cancelled' });
    }

    request.status = 'Cancelled';
    request.statusHistory.push({ status: 'Cancelled', by: req.user.id, note: 'Cancelled' });
    await request.save();

    const io = getIO();
    io.to(`user:${request.requester.toString()}`).emit('request_status', { requestId: request._id.toString(), status: request.status });
    io.to(`request:${request._id.toString()}`).emit('request_status', { requestId: request._id.toString(), status: request.status });

    res.status(200).json({ success: true, data: request });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Mark request complete
// @route   PATCH /api/requests/:id/complete
// @access  Private (Requester/Donor/Admin)
export const completeRequest = async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    const isOwner = request.requester?.toString() === req.user.id;
    const isAssignedDonor = request.donor?.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAssignedDonor && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not allowed to complete this request' });
    }

    if (request.status === 'Cancelled') {
      return res.status(400).json({ success: false, message: 'Cancelled requests cannot be completed' });
    }
    if (request.status !== 'Accepted' && request.status !== 'Completed') {
      return res.status(400).json({ success: false, message: 'Only accepted requests can be completed' });
    }
    if (request.status === 'Completed') {
      return res.status(400).json({ success: false, message: 'Request already completed' });
    }

    request.status = 'Completed';
    request.completedAt = Date.now();
    request.statusHistory.push({ status: 'Completed', by: req.user.id, note: 'Completed' });
    await request.save();

    const io = getIO();
    io.to(`user:${request.requester.toString()}`).emit('request_status', { requestId: request._id.toString(), status: request.status });
    if (request.donor) io.to(`user:${request.donor.toString()}`).emit('request_status', { requestId: request._id.toString(), status: request.status });
    io.to(`request:${request._id.toString()}`).emit('request_status', { requestId: request._id.toString(), status: request.status });

    res.status(200).json({ success: true, data: request });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
