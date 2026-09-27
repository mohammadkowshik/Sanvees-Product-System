// =====================================================
// COURIER TRACKING SERVICE
// =====================================================
// Courier tracking update database-এ save করার জন্য
// এই service ব্যবহার হবে.
//
// এখনো কোনো real courier API call করা হচ্ছে না.
// =====================================================

import { supabase } from "../../supabase";

const courierTrackingService = {
  async updateTracking(courier, trackingData) {
    const normalizedCourier = String(courier || "")
      .trim()
      .toLowerCase();

    // =================================================
    // COURIER VALIDATION
    // =================================================

    if (
      !["steadfast", "pathao", "redx"].includes(
        normalizedCourier
      )
    ) {
      return {
        success: false,
        courier: normalizedCourier || null,
        status: "unsupported",
        message: "Unsupported courier.",
        data: null,
        error: "UNSUPPORTED_COURIER",
      };
    }

    // =================================================
    // SHIPMENT ID
    // =================================================

    const shipmentId =
      trackingData?.shipmentId ||
      trackingData?.shipment_id ||
      null;

    if (!shipmentId) {
      return {
        success: false,
        courier: normalizedCourier,
        status: "invalid_data",
        message: "Shipment ID is required.",
        data: null,
        error: "SHIPMENT_ID_REQUIRED",
      };
    }

    // =================================================
    // PREPARE TRACKING ROW
    // =================================================

    const trackingRow = {
      shipment_id: shipmentId,

      status:
        trackingData?.status ||
        "tracking_update",

      location:
        trackingData?.location ||
        null,

      rider_name:
        trackingData?.riderName ||
        trackingData?.rider_name ||
        null,

      rider_phone:
        trackingData?.riderPhone ||
        trackingData?.rider_phone ||
        null,

      note:
        trackingData?.note ||
        null,

      courier_event_id:
        trackingData?.courierEventId ||
        trackingData?.courier_event_id ||
        null,

      event_time:
        trackingData?.eventTime ||
        trackingData?.event_time ||
        new Date().toISOString(),

      raw_response:
        trackingData?.rawResponse ||
        trackingData?.raw_response ||
        null,

      created_at:
        new Date().toISOString(),
    };

    // =================================================
    // SAVE TRACKING UPDATE
    // =================================================

    const {
      data,
      error,
    } = await supabase
      .from("courier_tracking_updates")
      .insert(trackingRow)
      .select()
      .single();

    // =================================================
    // DATABASE ERROR
    // =================================================

    if (error) {
      console.error(
        "Courier tracking update insert error:",
        error
      );

      return {
        success: false,
        courier: normalizedCourier,
        status: "database_error",
        message:
          "Tracking update save করা যায়নি.",
        data: null,
        error,
      };
    }

    // =================================================
    // SUCCESS
    // =================================================

    return {
      success: true,
      courier: normalizedCourier,
      status: "saved",
      message:
        "Courier tracking update successfully saved.",
      data,
      error: null,
    };
  },
    // =================================================
  // UPDATE SHIPMENT STATUS
  // =================================================

  async updateShipmentStatus(
    shipmentId,
    newStatus,
    trackingData = {}
  ) {
    // =================================================
    // ALLOWED SHIPMENT STATUSES
    // =================================================

    const allowedStatuses = [
      "ready_to_ship",
      "picked_up",
      "in_transit",
      "out_for_delivery",
      "delivered",
      "cancelled",
      "returned",
    ];

    // =================================================
    // VALIDATE SHIPMENT ID
    // =================================================

    if (!shipmentId) {
      return {
        success: false,
        status: "invalid_data",
        message: "Shipment ID is required.",
        data: null,
        error: "SHIPMENT_ID_REQUIRED",
      };
    }

    // =================================================
    // NORMALIZE STATUS
    // =================================================

    const normalizedStatus = String(newStatus || "")
      .trim()
      .toLowerCase();

    // =================================================
    // VALIDATE STATUS
    // =================================================

    if (!allowedStatuses.includes(normalizedStatus)) {
      return {
        success: false,
        status: "invalid_data",
        message: `Invalid shipment status: ${normalizedStatus}`,
        data: null,
        error: "INVALID_SHIPMENT_STATUS",
      };
    }

    // =================================================
    // UPDATE SHIPMENT
    // =================================================

    const updatedAt = new Date().toISOString();

    const {
      data: updatedShipment,
      error: shipmentError,
    } = await supabase
      .from("courier_shipments")
      .update({
        shipment_status: normalizedStatus,
        updated_at: updatedAt,
      })
      .eq("id", shipmentId)
      .select()
      .single();

    // =================================================
    // DATABASE ERROR
    // =================================================

    if (shipmentError) {
      console.error(
        "Shipment status update error:",
        shipmentError
      );

      return {
        success: false,
        status: "database_error",
        message:
          "Shipment status update করা যায়নি.",
        data: null,
        error: shipmentError,
      };
    }

    // =================================================
    // SAVE TRACKING EVENT
    // =================================================

    const trackingRow = {
      shipment_id: shipmentId,

      status: normalizedStatus,

      location:
        trackingData?.location || null,

      rider_name:
        trackingData?.riderName ||
        trackingData?.rider_name ||
        null,

      rider_phone:
        trackingData?.riderPhone ||
        trackingData?.rider_phone ||
        null,

      note:
        trackingData?.note ||
        `Shipment status changed to ${normalizedStatus}.`,

      courier_event_id:
        trackingData?.courierEventId ||
        trackingData?.courier_event_id ||
        null,

      event_time:
        trackingData?.eventTime ||
        trackingData?.event_time ||
        updatedAt,

      raw_response:
        trackingData?.rawResponse ||
        trackingData?.raw_response ||
        null,

      created_at: updatedAt,
    };

    const {
      data: trackingUpdate,
      error: trackingError,
    } = await supabase
      .from("courier_tracking_updates")
      .insert(trackingRow)
      .select()
      .single();

    // =================================================
    // TRACKING ERROR
    // =================================================

    if (trackingError) {
      console.error(
        "Tracking event insert error:",
        trackingError
      );

      return {
        success: false,
        status: "tracking_error",
        message:
          "Shipment status update হয়েছে, কিন্তু tracking history save করা যায়নি.",
        data: updatedShipment,
        error: trackingError,
      };
    }

    // =================================================
    // SUCCESS
    // =================================================

    return {
      success: true,
      status: "updated",
      message:
        "Shipment status successfully updated.",
      data: {
        shipment: updatedShipment,
        tracking: trackingUpdate,
      },
      error: null,
    };
  },
};

export default courierTrackingService;