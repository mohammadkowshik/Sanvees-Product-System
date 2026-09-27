// =====================================================
// COURIER SERVICE ROUTER
// =====================================================
// App.jsx থেকে সব courier-related request এখানে আসবে.
//
// Flow:
//
// App.jsx
//    ↓
// courierService.js
//    ↓
// ┌──────────────┬──────────────┬──────────────┐
// │  Steadfast   │    Pathao    │     REDX     │
// └──────────────┴──────────────┴──────────────┘
//
// এখনো কোনো real API call করা হচ্ছে না.
// =====================================================

import steadfastService from "./steadfastService";
import pathaoService from "./pathaoService";
import redxService from "./redxService";
import courierTrackingService from "./courierTrackingService";

// =====================================================
// GET COURIER SERVICE
// =====================================================

const getCourierService = (courier) => {
  const normalizedCourier = String(courier || "")
    .trim()
    .toLowerCase();

  switch (normalizedCourier) {
    case "steadfast":
      return steadfastService;

    case "pathao":
      return pathaoService;

    case "redx":
      return redxService;

    default:
      return null;
  }
};

// =====================================================
// COURIER SERVICE
// =====================================================

const courierService = {
  // ---------------------------------------------------
  // CREATE / BOOK SHIPMENT
  // ---------------------------------------------------
  async createShipment(courier, shipmentData) {
    const service = getCourierService(courier);

    if (!service) {
      return {
        success: false,
        courier: courier || null,
        status: "unsupported",
        message: "Unsupported courier.",
        data: null,
        error: "UNSUPPORTED_COURIER",
      };
    }

    return service.createShipment(shipmentData);
  },

  // ---------------------------------------------------
  // GET TRACKING
  // ---------------------------------------------------
  async getTracking(courier, trackingData) {
    const service = getCourierService(courier);

    if (!service) {
      return {
        success: false,
        courier: courier || null,
        status: "unsupported",
        message: "Unsupported courier.",
        data: null,
        error: "UNSUPPORTED_COURIER",
      };
    }

    return service.getTracking(trackingData);
  },

  // ---------------------------------------------------
  // CANCEL SHIPMENT
  // ---------------------------------------------------
  async cancelShipment(courier, shipmentData) {
    const service = getCourierService(courier);

    if (!service) {
      return {
        success: false,
        courier: courier || null,
        status: "unsupported",
        message: "Unsupported courier.",
        data: null,
        error: "UNSUPPORTED_COURIER",
      };
    }

    return service.cancelShipment(shipmentData);
  },
    async updateTracking(courier, trackingData) {
    return courierTrackingService.updateTracking(
      courier,
      trackingData
    );
  },
  async updateShipmentStatus(
  shipmentId,
  newStatus,
  trackingData = {}
) {
  return courierTrackingService.updateShipmentStatus(
    shipmentId,
    newStatus,
    trackingData
  );
},
};

export default courierService;