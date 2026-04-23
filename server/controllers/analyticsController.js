import BloodRequest from '../models/BloodRequest.js';

// @desc    Get demand heatmap data by pincode
// @route   GET /api/analytics/heatmap
// @access  Private (Admin only)
export const getHeatmapData = async (req, res) => {
  try {
    const demandData = await BloodRequest.aggregate([
      {
        $group: {
          _id: "$location.pincode",
          count: { $sum: 1 },
          bloodGroups: { $addToSet: "$bloodGroup" }
        }
      },
      {
        $project: {
          pincode: "$_id",
          value: "$count",
          groups: "$bloodGroups",
          _id: 0
        }
      },
      { $sort: { value: -1 } }
    ]);

    res.status(200).json({ success: true, data: demandData });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Get shortage trends (Simple stats)
// @route   GET /api/analytics/trends
export const getShortageTrends = async (req, res) => {
  try {
    const totalRequests = await BloodRequest.countDocuments();
    const completedRequests = await BloodRequest.countDocuments({ status: 'Completed' });
    const pendingRequests = await BloodRequest.countDocuments({ status: 'Pending' });

    res.status(200).json({
      success: true,
      data: {
        total: totalRequests,
        completed: completedRequests,
        pending: pendingRequests,
        fulfillmentRate: totalRequests > 0 ? (completedRequests / totalRequests) * 100 : 0
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
