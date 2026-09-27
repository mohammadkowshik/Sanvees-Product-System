// =====================================================
// STEADFAST COURIER SERVICE
// =====================================================
// এখনো কোনো real API call করা হবে না.
// ভবিষ্যতে Steadfast API connection এখানে যুক্ত হবে.
// =====================================================

const steadfastService = {
  // ---------------------------------------------------
  // Create / Book Shipment
  // ---------------------------------------------------
  async createShipment(shipmentData) {
    return {
      success: false,
      courier: "steadfast",
      status: "not_connected",
      message: "Steadfast API is not connected yet.",
      data: null,
      error: null,
    };
  },

  // ---------------------------------------------------
  // Get Tracking
  // ---------------------------------------------------
  async getTracking(trackingData) {
    return {
      success: false,
      courier: "steadfast",
      status: "not_connected",
      message: "Steadfast tracking API is not connected yet.",
      data: null,
      error: null,
    };
  },

  // ---------------------------------------------------
  // Cancel Shipment
  // ---------------------------------------------------
  async cancelShipment(shipmentData) {
    return {
      success: false,
      courier: "steadfast",
      status: "not_connected",
      message: "Steadfast cancel API is not connected yet.",
      data: null,
      error: null,
    };
  },
};

export default steadfastService;