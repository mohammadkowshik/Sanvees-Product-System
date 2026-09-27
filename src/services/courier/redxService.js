// =====================================================
// REDX COURIER SERVICE
// =====================================================
// এখনো কোনো real API call করা হবে না.
// ভবিষ্যতে REDX API connection এখানে যুক্ত হবে.
// =====================================================

const redxService = {
  // ---------------------------------------------------
  // Create / Book Shipment
  // ---------------------------------------------------
  async createShipment(shipmentData) {
    return {
      success: false,
      courier: "redx",
      status: "not_connected",
      message: "REDX API is not connected yet.",
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
      courier: "redx",
      status: "not_connected",
      message: "REDX tracking API is not connected yet.",
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
      courier: "redx",
      status: "not_connected",
      message: "REDX cancel API is not connected yet.",
      data: null,
      error: null,
    };
  },
};

export default redxService;