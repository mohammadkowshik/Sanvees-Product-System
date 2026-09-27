// =====================================================
// PATHAO COURIER SERVICE
// =====================================================
// এখনো কোনো real API call করা হবে না.
// ভবিষ্যতে Pathao API connection এখানে যুক্ত হবে.
// =====================================================

const pathaoService = {
  // ---------------------------------------------------
  // Create / Book Shipment
  // ---------------------------------------------------
  async createShipment(shipmentData) {
    return {
      success: false,
      courier: "pathao",
      status: "not_connected",
      message: "Pathao API is not connected yet.",
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
      courier: "pathao",
      status: "not_connected",
      message: "Pathao tracking API is not connected yet.",
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
      courier: "pathao",
      status: "not_connected",
      message: "Pathao cancel API is not connected yet.",
      data: null,
      error: null,
    };
  },
};

export default pathaoService;