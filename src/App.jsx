import { useEffect, useState, useMemo, useRef } from "react";
import courierService from "./services/courier/courierService";
import JsBarcode from "jsbarcode";
import Login from "./Login";
import { supabase } from "./supabase";
import { pipeline } from "@huggingface/transformers";
const parseProductSizes = (sizeValue) => {
  if (!sizeValue) return [];

  return String(sizeValue)
    .split(/[\/,\n|]+/)
    .map((size) => size.trim())
    .filter(Boolean);
};

function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [orderSearchPhone, setOrderSearchPhone] = useState("");
const [orderSearchSV, setOrderSearchSV] = useState("");

const [searchedOrders, setSearchedOrders] = useState([]);

const [orderSearchLoading, setOrderSearchLoading] =
  useState(false);

  const [products, setProducts] = useState([]);
  const COLOR_VARIANT_LIMIT = 15;

  const [searchTerm, setSearchTerm] = useState("");

  const [categoryFilter, setCategoryFilter] = useState("all");
  const [colorFilter, setColorFilter] = useState("all");

  const [selectedColors, setSelectedColors] = useState({});

  const [searchImage, setSearchImage] = useState(null);
  
  
// =====================================================
// IMAGE SEARCH RESULT STATES
// =====================================================

const [imageSearchMode, setImageSearchMode] =
  useState("all");

// "all" | "exact" | "category_color" | "similar"

const [exactSearchProducts, setExactSearchProducts] =
  useState([]);

const [similarSearchProducts, setSimilarSearchProducts] =
  useState([]);

const [imageSearchDone, setImageSearchDone] =
  useState(false);

// Selected Category + Color-এর সব products
const [categoryColorProducts, setCategoryColorProducts] =
  useState([]);

// Pagination — 24 products per page
const [categoryColorPage, setCategoryColorPage] =
  useState(1);

const [currentPage, setCurrentPage] = useState(1);

useEffect(() => {
  setCurrentPage(1);
}, [searchTerm, categoryFilter, colorFilter]);

const PRODUCTS_PER_PAGE = 24;
const courierOptions = [
  {
    id: "steadfast",
    name: "Steadfast",
  },
  {
    id: "pathao",
    name: "Pathao",
  },
  {
    id: "redx",
    name: "REDX",
  },
];

// =========================================================
// CATEGORY + COLOR PAGE CHANGE
// =========================================================

const changeCategoryColorPage = (page) => {
  if (page < 1) return;

  const totalPages = Math.ceil(
    categoryColorProducts.length / PRODUCTS_PER_PAGE
  );

  if (page > totalPages) return;

  setCategoryColorPage(page);
};

const categoryColorTotalPages =
  Math.ceil(
    categoryColorProducts.length /
      PRODUCTS_PER_PAGE
  );

  
  const [searchImagePreview, setSearchImagePreview] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [imageEmbedder, setImageEmbedder] = useState(null);
  const [embeddingLoading, setEmbeddingLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);


  const [product, setProduct] = useState({
  name: "",
  price: "",
  buying_price: "",
  category: "",
  color: "",
  sizes: [],
  details: "",
  image: null,
  imagePreview: "",
  color_variants: [],
});

  const [editingProductId, setEditingProductId] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [detailModalProduct, setDetailModalProduct] = useState(null);

  const [userModalOpen, setUserModalOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("staff");
  const [newUserShortName, setNewUserShortName] = useState("");
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [productHistory, setProductHistory] = useState([]);
  const [productHistorySearch, setProductHistorySearch] = useState("");
  const [productHistoryLoading, setProductHistoryLoading] =
  useState(false);
  const [removingUserId, setRemovingUserId] = useState(null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [myAccountOpen, setMyAccountOpen] = useState(false);

const [currentPassword, setCurrentPassword] = useState("");
const [newPassword, setNewPassword] = useState("");
const [confirmNewPassword, setConfirmNewPassword] = useState("");

const [passwordChanging, setPasswordChanging] = useState(false);
const [resetPasswordModalOpen, setResetPasswordModalOpen] =
  useState(false);

const [resetPasswordUser, setResetPasswordUser] =
  useState(null);

const [resetNewPassword, setResetNewPassword] =
  useState("");

const [resetConfirmPassword, setResetConfirmPassword] =
  useState("");

const [resetPasswordLoading, setResetPasswordLoading] =
  useState(false);

const [passwordHistory, setPasswordHistory] =
  useState([]);

const [passwordHistoryLoading, setPasswordHistoryLoading] =
  useState(false);

  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [productsOpen, setProductsOpen] = useState(false);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [showPriceRange, setShowPriceRange] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  // =====================================================
// ORDER HISTORY STATES
// =====================================================

const [orderHistorySearch, setOrderHistorySearch] =
  useState("");

const [orderHistory, setOrderHistory] =
  useState([]);

const [orderHistoryLoading, setOrderHistoryLoading] =
  useState(false);

const [orderHistorySelectedOrder, setOrderHistorySelectedOrder] =
  useState(null);
  // =====================================================
// LOAD ORDER HISTORY
// =====================================================

const loadOrderHistory = async () => {
  const search =
    orderHistorySearch.trim();

  if (!search) {
    setOrderHistory([]);
    setOrderHistorySelectedOrder(null);
    return;
  }

  try {
    setOrderHistoryLoading(true);

    console.log(
      "🔍 Order History Search:",
      search
    );

    // =================================================
    // 1. FIND MATCHING ORDERS
    // ORDER NUMBER + PHONE + CUSTOMER NAME
    // =================================================

    const {
      data: matchingOrders,
      error: orderSearchError,
    } = await supabase
      .from("orders")
      .select(
        "id, order_number, customer_name, customer_phone"
      )
      .or(
        `order_number.ilike.*${search}*,customer_phone.ilike.*${search}*,customer_name.ilike.*${search}*`
      )
      .order("created_at", {
        ascending: false,
      })
      .limit(20);

    console.log(
      "🔍 Matching Orders:",
      matchingOrders
    );

    if (orderSearchError) {
      console.error(
        "Order search error:",
        orderSearchError
      );

      alert(
        "Order search করা যায়নি।"
      );

      return;
    }

    if (
      !matchingOrders ||
      matchingOrders.length === 0
    ) {
      setOrderHistory([]);
      setOrderHistorySelectedOrder(null);
      return;
    }

    // =================================================
    // 2. SEARCH HISTORY BY ORDER ID
    // =================================================

    const orderIds =
      matchingOrders.map(
        (order) => order.id
      );

    const {
      data: historyById,
      error: historyIdError,
    } = await supabase
      .from("order_history")
      .select("*")
      .in("order_id", orderIds)
      .order("created_at", {
        ascending: true,
      });

    if (historyIdError) {
      console.error(
        "History search by order_id error:",
        historyIdError
      );
    }

    console.log(
      "📜 History By Order ID:",
      historyById
    );

    // =================================================
    // 3. IF NO HISTORY FOUND,
    // SEARCH BY ORDER NUMBER
    // =================================================

    let finalHistory =
      historyById || [];

    if (finalHistory.length === 0) {
      const orderNumbers =
        matchingOrders.map(
          (order) => order.order_number
        );

      const {
        data: historyByNumber,
        error: historyNumberError,
      } = await supabase
        .from("order_history")
        .select("*")
        .in(
          "order_number",
          orderNumbers
        )
        .order("created_at", {
          ascending: true,
        });

      if (historyNumberError) {
        console.error(
          "History search by order_number error:",
          historyNumberError
        );
      }

      console.log(
        "📜 History By Order Number:",
        historyByNumber
      );

      finalHistory =
        historyByNumber || [];
    }

    // =================================================
    // 4. SET FINAL RESULT
    // =================================================

    setOrderHistory(
      finalHistory
    );

    setOrderHistorySelectedOrder(
      matchingOrders[0].order_number
    );

  } catch (error) {
    console.error(
      "Order history unexpected error:",
      error
    );

    alert(
      "Order history load করার সময় সমস্যা হয়েছে।"
    );

  } finally {
    setOrderHistoryLoading(false);
  }
};

// =====================================================
// ORDER MANAGEMENT STATES
// =====================================================

const [activeOrderPage, setActiveOrderPage] =
  useState("create-order");

const [customerName, setCustomerName] =
  useState("");

// =====================================================
// ORDERS MANAGEMENT
// =====================================================

const [orders, setOrders] = useState([]);
const [dashboardNow, setDashboardNow] = useState(
  () => new Date()
);

useEffect(() => {
  const timer = setInterval(() => {
    setDashboardNow(new Date());
  }, 60000);

  return () => clearInterval(timer);
}, []);

const [ordersLoading, setOrdersLoading] = useState(false);

const [orderSearchTerm, setOrderSearchTerm] = useState("");
const [orderStatusFilter, setOrderStatusFilter] = useState("all");
const [orderDateFilter, setOrderDateFilter] = useState("");
// =====================================================
// BARCODE SCANNING / BULK SHIPPING
// =====================================================

const [barcodeScanTerm, setBarcodeScanTerm] = useState("");
const [scannedOrders, setScannedOrders] = useState([]);
const [selectedScannedOrderIds, setSelectedScannedOrderIds] =
  useState([]);
const [barcodeScanning, setBarcodeScanning] = useState(false);
const [bulkShipping, setBulkShipping] = useState(false);
const [barcodeScannerOpen, setBarcodeScannerOpen] = useState(false);

const barcodeScanInputRef = useRef(null);

const [selectedOrder, setSelectedOrder] = useState(null);
const [selectedCourier, setSelectedCourier] =
  useState("steadfast");

const [courierShipping, setCourierShipping] =
  useState(false);
  // =====================================================
// COURIER SHIPMENTS STATE
// =====================================================

const [courierShipments, setCourierShipments] =
  useState([]);

const [courierShipmentsLoading, setCourierShipmentsLoading] =
  useState(false);
  const [courierSearchTerm, setCourierSearchTerm] =
  useState("");
  const [courierFromDate, setCourierFromDate] =
  useState("");

const [courierToDate, setCourierToDate] =
  useState("");
  const [showCourierDateFilter, setShowCourierDateFilter] =
  useState(false);
  // =====================================================
// COURIER PANEL
// =====================================================

const [courierPanelOpen, setCourierPanelOpen] =
  useState(false);
  // =====================================================
// COURIER TRACKING DETAILS
// =====================================================

const [selectedCourierShipment, setSelectedCourierShipment] =
  useState(null);

const [courierTrackingOpen, setCourierTrackingOpen] =
  useState(false);
  // =====================================================
// SELECTED COURIER TRACKING DATA
// =====================================================

const selectedTrackingUpdates =
  selectedCourierShipment?.courier_tracking_updates || [];

const latestTrackingUpdate =
  [...selectedTrackingUpdates].sort(
    (a, b) =>
      new Date(
        b.event_time || b.created_at
      ).getTime() -
      new Date(
        a.event_time || a.created_at
      ).getTime()
  )[0] || null;

const [activeCourier, setActiveCourier] =
  useState("all");
// =====================================================
// SELECTED ORDER DETAILS
// =====================================================

const [selectedOrderItems, setSelectedOrderItems] = useState([]);
const [orderDetailsLoading, setOrderDetailsLoading] = useState(false);
// =====================================================
// INVOICE
// =====================================================

const [invoiceOpen, setInvoiceOpen] = useState(false);
// =====================================================
// EDIT ORDER
// =====================================================

const [editOrderMode, setEditOrderMode] = useState(false);
const [editOrderItems, setEditOrderItems] = useState([]);
const [editOrderSaving, setEditOrderSaving] = useState(false);
const [editOrderDeliveryCharge, setEditOrderDeliveryCharge] =
  useState(0);
  // =====================================================
// ADD PRODUCT TO EXISTING ORDER
// =====================================================

const [addOrderProductSearch, setAddOrderProductSearch] =
  useState("");

const [addOrderProductOpen, setAddOrderProductOpen] =
  useState(false);

const [customerPhone, setCustomerPhone] =
  useState("");

const [customerAddress, setCustomerAddress] =
  useState("");

const [orderCart, setOrderCart] =
  useState([]);
  const [selectedSizes, setSelectedSizes] = useState({});

const [deliveryType, setDeliveryType] = useState("");

const [orderSubmitting, setOrderSubmitting] =
  useState(false);

// =====================================================
// ORDER CUSTOMER POPUP
// =====================================================

const [customerPopupOpen, setCustomerPopupOpen] =
  useState(false);

const [newCustomerName, setNewCustomerName] =
  useState("");

const [newCustomerPhone, setNewCustomerPhone] =
  useState("");

const [newCustomerAddress, setNewCustomerAddress] =
  useState("");

const [customerCreating, setCustomerCreating] =
  useState(false);

const [selectedCustomerId, setSelectedCustomerId] =
  useState(null);

// =====================================================
// ALL PRODUCTS ORDER PANEL
// =====================================================

const [orderPanelOpen, setOrderPanelOpen] =
  useState(false);

const [allProductsActive, setAllProductsActive] =
  useState(false);

  // =====================================================
// ADD PRODUCT TO ORDER CART
// =====================================================

// =====================================================
// NORMALIZE PHONE NUMBER
// =====================================================

const normalizePhoneNumber = (phone) => {
  if (!phone) return "";

  // বাংলা সংখ্যা → English সংখ্যা
  const banglaToEnglish = {
    "০": "0",
    "১": "1",
    "২": "2",
    "৩": "3",
    "৪": "4",
    "৫": "5",
    "৬": "6",
    "৭": "7",
    "৮": "8",
    "৯": "9",
  };

  let normalized = phone
    .split("")
    .map((char) => banglaToEnglish[char] || char)
    .join("");

  // সব ধরনের space remove
  normalized = normalized.replace(/\s+/g, "");

  // +880 / 880 দিয়ে শুরু হলে 01 format-এ convert
  if (normalized.startsWith("+880")) {
    normalized = "0" + normalized.slice(4);
  } else if (
    normalized.startsWith("880") &&
    normalized.length === 13
  ) {
    normalized = "0" + normalized.slice(3);
  }

  return normalized;
};
// =====================================================
// CREATE CUSTOMER
// =====================================================

const createOrderCustomer = async () => {
  try {
    if (!newCustomerName.trim()) {
      alert("Customer Name দিন।");
      return;
    }

    if (!newCustomerPhone.trim()) {
      alert("Customer Phone Number দিন।");
      return;
    }

    if (!newCustomerAddress.trim()) {
      alert("Customer Address দিন।");
      return;
    }

    setCustomerCreating(true);

    const {
      data,
      error,
    } = await supabase
      .from("customers")
      .insert([
        {
          name: newCustomerName.trim(),
          phone: normalizePhoneNumber(newCustomerPhone),
          address: newCustomerAddress.trim(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error(
        "Create customer error:",
        error
      );

      alert(
        "Customer create করা যায়নি।"
      );

      return;
    }

    // Save selected customer
    setSelectedCustomerId(data.id);

    // Show customer information in order panel
    setCustomerName(data.name);
    setCustomerPhone(data.phone);
    setCustomerAddress(data.address);

    // Close popup
    setCustomerPopupOpen(false);

    // Reset popup form
    setNewCustomerName("");
    setNewCustomerPhone("");
    setNewCustomerAddress("");

    alert("Customer successfully created.");

  } catch (error) {
    console.error(
      "Customer create unexpected error:",
      error
    );

    alert(
      "Customer create করার সময় সমস্যা হয়েছে।"
    );

  } finally {
    setCustomerCreating(false);
  }
};
// =====================================================
// FIND CUSTOMER BY PHONE
// =====================================================

const findCustomerByPhone = async (phone) => {
  try {
    const normalizedPhone =
      normalizePhoneNumber(phone);

    if (!normalizedPhone) {
      setSelectedCustomerId(null);
      return;
    }

    // 11 digit না হওয়া পর্যন্ত search করবে না
    if (normalizedPhone.length !== 11) {
      setSelectedCustomerId(null);
      return;
    }

    const {
      data,
      error,
    } = await supabase
      .from("customers")
      .select("id, name, phone, address")
      .eq("phone", normalizedPhone)
      .maybeSingle();

    if (error) {
      console.error(
        "Find customer error:",
        error
      );
      return;
    }

    // =================================================
    // CUSTOMER FOUND
    // =================================================

    if (data) {
      setSelectedCustomerId(data.id);

      setCustomerName(
        data.name || ""
      );

      setCustomerPhone(
        data.phone || normalizedPhone
      );

      setCustomerAddress(
        data.address || ""
      );

      return;
    }

    // =================================================
    // CUSTOMER NOT FOUND
    // =================================================

    setSelectedCustomerId(null);

  } catch (error) {
    console.error(
      "Find customer unexpected error:",
      error
    );
  }
};
// =====================================================
// ORDER HISTORY LOGGER
// =====================================================

const addOrderHistory = async ({
  orderId,
  orderNumber,
  actionType,
  actionDescription,
  oldData = null,
  newData = null,
}) => {
  try {
    const { error } = await supabase
      .from("order_history")
      .insert([
        {
          order_id: orderId,
          order_number: orderNumber,

          action_type: actionType,
          action_description: actionDescription,

          changed_by:
            session?.user?.id || null,

          changed_by_name:
            session?.user?.email || "",

          old_data: oldData,
          new_data: newData,
        },
      ]);

    if (error) {
      console.error(
        "Order history insert error:",
        error
      );
    }
  } catch (error) {
    console.error(
      "Order history unexpected error:",
      error
    );
  }
};
const placeOrder = async () => {
  try {
    // ==========================================
    // 1. VALIDATION
    // ==========================================

    if (orderCart.length === 0) {
      alert("Cart-এ কোনো product নেই।");
      return;
    }

    if (!customerName.trim()) {
      alert("Customer Name দিন।");
      return;
    }

    if (!customerPhone.trim()) {
      alert("Customer Phone Number দিন।");
      return;
    }

    if (!customerAddress.trim()) {
      alert("Customer Address দিন।");
      return;
    }

    if (!session?.user?.id) {
      alert("User session পাওয়া যাচ্ছে না। আবার login করুন।");
      return;
    }

    setOrderSubmitting(true);

    // ==========================================
    // 2. GENERATE ORDER NUMBER
    // ==========================================

    const now = new Date();

    const datePart =
      now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, "0") +
      String(now.getDate()).padStart(2, "0");

    const timePart =
      String(now.getHours()).padStart(2, "0") +
      String(now.getMinutes()).padStart(2, "0") +
      String(now.getSeconds()).padStart(2, "0");

    const randomPart =
      Math.random()
        .toString(36)
        .substring(2, 6)
        .toUpperCase();

    const orderNumber =
      `SV-${datePart}-${timePart}-${randomPart}`;

    // ==========================================
    // 3. CREATE ORDER
    // ==========================================

    const {
      data: orderData,
      error: orderError,
    } = await supabase
      .from("orders")
      .insert([
        {
          order_number: orderNumber,

          customer_id:
            selectedCustomerId || null,

          customer_name:
            customerName.trim(),

          customer_phone:
  normalizePhoneNumber(customerPhone),

          customer_address:
            customerAddress.trim(),

          subtotal:
            orderSubtotal,

          delivery_charge:
            deliveryCharge,

          total_amount:
            orderTotal,

          delivery_type:
            deliveryType === "free"
              ? "free"
              : "paid",

          status:
            "pending",

          created_by:
  session.user.id,

created_by_name:
  session.user.email || "",

created_by_role:
  userRole || "",
        },
      ])
      .select()
      .single();

    if (orderError) {
      console.error(
        "Create order error:",
        orderError
      );

      alert(
        "Order create করা যায়নি।"
      );

      return;
    }

    // ==========================================
    // 4. PREPARE ORDER ITEMS
    // ==========================================

    const orderItems = orderCart.map(
      (item) => ({
        order_id:
          orderData.id,

        product_id:
          item.product_id || null,

        product_name:
          item.product_name,

        product_image_url:
          item.product_image_url || null,

        color:
          item.color || "",

        size:
          item.size || "",

        quantity:
          Number(item.quantity || 1),

        unit_price:
          Number(item.unit_price || 0),

        total_price:
          Number(item.total_price || 0),
      })
    );

    // ==========================================
    // 5. INSERT ORDER ITEMS
    // ==========================================

    const {
      error: itemsError,
    } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      console.error(
        "Create order items error:",
        itemsError
      );

      // Order তৈরি হয়ে গেছে কিন্তু items
      // save হয়নি — তাই order delete করে দিচ্ছি
      await supabase
        .from("orders")
        .delete()
        .eq("id", orderData.id);

      alert(
        "Order items save করা যায়নি। Order তৈরি করা হয়নি।"
      );

      return;
    }
    // ==========================================
// 5.1. DECREASE PRODUCT STOCK
// COLOR + SIZE WISE
// ==========================================

try {
  for (const item of orderCart) {
    await decreaseProductVariantStock({
      productId: item.product_id,
      color: item.color,
      size: item.size,
      quantity: Number(item.quantity || 1),
    });
  }
} catch (stockError) {
  console.error(
    "Stock decrease error:",
    stockError
  );

  // Order items remove
  await supabase
    .from("order_items")
    .delete()
    .eq("order_id", orderData.id);

  // Order remove
  await supabase
    .from("orders")
    .delete()
    .eq("id", orderData.id);

  alert(
    stockError?.message ||
      "Product stock update করা যায়নি। Order তৈরি হয়নি।"
  );

  return;
}
// ==========================================
// REFRESH PRODUCTS AFTER STOCK UPDATE
// ==========================================

const {
  data: refreshedProducts,
  error: refreshProductsError,
} = await supabase
  .from("products")
  .select("*")
  .order("created_at", {
    ascending: false,
  });

if (!refreshProductsError) {
  setProducts(refreshedProducts || []);
}
    // ==========================================
// SAVE ORDER CREATED HISTORY
// ==========================================

await addOrderHistory({
  orderId: orderData.id,

  orderNumber:
    orderData.order_number,

  actionType:
    "order_created",

  actionDescription:
    "Order created",

  oldData:
    null,

  newData: {
    customer_name:
      orderData.customer_name,

    customer_phone:
      orderData.customer_phone,

    customer_address:
      orderData.customer_address,

    subtotal:
      orderData.subtotal,

    delivery_charge:
      orderData.delivery_charge,

    total_amount:
      orderData.total_amount,

    status:
      orderData.status,

    products:
      orderCart.map((item) => ({
        product_id:
          item.product_id || null,

        product_name:
          item.product_name,

        color:
          item.color || "",

        size:
          item.size || "",

        quantity:
          Number(item.quantity || 1),

        unit_price:
          Number(item.unit_price || 0),

        total_price:
          Number(item.total_price || 0),
      })),
  },
});

    // ==========================================
    // 6. SUCCESS — RESET ORDER FORM
    // ==========================================

    setOrderCart([]);

    setCustomerName("");
    setCustomerPhone("");
    setCustomerAddress("");

    setSelectedCustomerId(null);

    setDeliveryType("free");

    // ==========================================
    // 7. SUCCESS MESSAGE
    // ==========================================

    alert(
      `Order successfully created!\n\nOrder Number: ${orderNumber}`
    );

  } catch (error) {
    console.error(
      "Place order unexpected error:",
      error
    );

    alert(
      "Order create করার সময় unexpected সমস্যা হয়েছে।"
    );

  } finally {
    setOrderSubmitting(false);
  }
};
// =====================================================
// LOAD ALL ORDERS
// =====================================================

const loadOrders = async () => {
  try {
    setOrdersLoading(true);

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Load orders error:", error);
      alert("Orders load করতে সমস্যা হয়েছে।");
      return;
    }

    setOrders(data || []);
  } catch (error) {
    console.error("Load orders error:", error);
    alert("Orders load করতে সমস্যা হয়েছে।");
  } finally {
    setOrdersLoading(false);
  }
};
// =====================================================
// SEARCH CUSTOMER ORDER
// =====================================================

const searchCustomerOrders = async () => {
  const phone = orderSearchPhone.trim();
  const sv = orderSearchSV.trim();

  // দুইটা box-ই empty হলে result clear
  if (!phone && !sv) {
    setSearchedOrders([]);
    return;
  }

  try {
    setOrderSearchLoading(true);

    let query = supabase
      .from("orders")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    // SV থাকলে শুধু exact SV search হবে
    if (sv) {
      query = query.eq(
        "order_number",
        sv
      );
    }

    // SV না থাকলে Customer Number search হবে
    else if (phone) {
      query = query.eq(
        "customer_phone",
        phone
      );
    }

    const {
      data,
      error,
    } = await query;

    if (error) {
      console.error(
        "Search customer orders error:",
        error
      );

      setSearchedOrders([]);

      alert(
        "Order search করতে সমস্যা হয়েছে।"
      );

      return;
    }

    setSearchedOrders(data || []);

  } catch (error) {
    console.error(
      "Search customer orders unexpected error:",
      error
    );

    setSearchedOrders([]);

    alert(
      "Order search করার সময় সমস্যা হয়েছে।"
    );

  } finally {
    setOrderSearchLoading(false);
  }
};
// =====================================================
// ADD PRODUCT TO ORDER CART
// SAREE + DRESS SIZE/STOCK AWARE
// =====================================================

const addToOrderCart = (
  product,
  selectedColor,
  selectedImage,
  selectedSize
) => {
  if (!product?.id) return;

  // =====================================================
  // CATEGORY
  // =====================================================

  const isSaree =
    product.category?.trim().toLowerCase() === "saree";

  // =====================================================
  // SELECTED COLOR
  // =====================================================

  const cartColor =
    selectedColor || product.color || "";

  // =====================================================
  // FIND SELECTED COLOR VARIANT
  // =====================================================

  const selectedVariant =
    Array.isArray(product.color_variants)
      ? product.color_variants.find(
          (variant) =>
            String(variant.color || "")
              .trim()
              .toLowerCase() ===
            String(cartColor || "")
              .trim()
              .toLowerCase()
        )
      : null;

  // =====================================================
  // SAREE
  // SAREE HAS ONLY PRODUCT STOCK
  // NO SIZE REQUIRED
  // =====================================================

  if (isSaree) {
    const availableStock =
      Number(product.stock || 0);

    if (availableStock <= 0) {
      alert("এই Saree-এর stock শেষ।");
      return;
    }

    const cartImage =
      selectedImage ||
      selectedVariant?.image_url ||
      product.image_url ||
      null;

    const cartSize = "";

    setOrderCart((currentCart) => {

      // =================================================
      // SAME SAREE + SAME COLOR
      // =================================================

      const existingProduct =
        currentCart.find(
          (item) =>
            item.product_id === product.id &&
            item.color === cartColor &&
            item.size === cartSize
        );

      // =================================================
      // EXISTING CART ITEM
      // =================================================

      if (existingProduct) {
        const currentQuantity =
          Number(existingProduct.quantity || 0);

        // Cannot exceed stock
        if (currentQuantity >= availableStock) {
          alert(
            `এই Saree-এর সর্বোচ্চ ${availableStock}টি stock আছে।`
          );

          return currentCart;
        }

        return currentCart.map((item) =>
          item.product_id === product.id &&
          item.color === cartColor &&
          item.size === cartSize
            ? {
                ...item,
                quantity:
                  currentQuantity + 1,
                total_price:
                  (currentQuantity + 1) *
                  Number(item.unit_price || 0),
              }
            : item
        );
      }

      // =================================================
      // NEW SAREE CART ITEM
      // =================================================

      const newItem = {
        product_id: product.id,

        product_name:
          product.name,

        product_image_url:
          cartImage,

        color:
          cartColor,

        size:
          cartSize,

        quantity: 1,

        unit_price:
          Number(product.price || 0),

        total_price:
          Number(product.price || 0),
      };

      return [
        ...currentCart,
        newItem,
      ];
    });

    return;
  }

  // =====================================================
  // DRESS
  // EXISTING SIZE + STOCK LOGIC
  // =====================================================

  const availableSizes =
    selectedVariant &&
    Array.isArray(selectedVariant.sizes)
      ? selectedVariant.sizes
      : Array.isArray(product.sizes)
      ? product.sizes
      : [];

  // =====================================================
  // SIZE REQUIRED
  // =====================================================

  if (
    availableSizes.length > 0 &&
    !selectedSize
  ) {
    alert("আগে Size নির্বাচন করুন।");
    return;
  }

  // =====================================================
  // FIND SELECTED SIZE STOCK
  // =====================================================

  let selectedSizeData = null;

  if (selectedSize) {
    selectedSizeData =
      availableSizes.find(
        (sizeItem) =>
          String(sizeItem.size || "")
            .trim()
            .toLowerCase() ===
          String(selectedSize || "")
            .trim()
            .toLowerCase()
      );
  }

  // =====================================================
  // STOCK CHECK
  // =====================================================

  if (selectedSize && !selectedSizeData) {
    alert(
      "এই Color এবং Size-এর stock পাওয়া যায়নি।"
    );
    return;
  }

  const availableStock =
    selectedSizeData
      ? Number(selectedSizeData.stock || 0)
      : 0;

  if (
    selectedSize &&
    availableStock <= 0
  ) {
    alert(
      "এই Color এবং Size-এর stock শেষ।"
    );
    return;
  }

  // =====================================================
  // IMAGE
  // =====================================================

  const cartImage =
    selectedImage ||
    selectedVariant?.image_url ||
    product.image_url ||
    null;

  const cartSize =
    selectedSize || "";

  // =====================================================
  // ADD / UPDATE CART
  // =====================================================

  setOrderCart((currentCart) => {

    // ===================================================
    // SAME PRODUCT + SAME COLOR + SAME SIZE
    // ===================================================

    const existingProduct =
      currentCart.find(
        (item) =>
          item.product_id === product.id &&
          item.color === cartColor &&
          item.size === cartSize
      );

    // ===================================================
    // EXISTING ITEM
    // ===================================================

    if (existingProduct) {

      const currentQuantity =
        Number(existingProduct.quantity || 0);

      // Cannot exceed stock
      if (
        selectedSize &&
        currentQuantity >= availableStock
      ) {
        alert(
          `এই Color এবং Size-এর সর্বোচ্চ ${availableStock}টি stock আছে।`
        );

        return currentCart;
      }

      return currentCart.map((item) =>
        item.product_id === product.id &&
        item.color === cartColor &&
        item.size === cartSize
          ? {
              ...item,

              quantity:
                currentQuantity + 1,

              total_price:
                (currentQuantity + 1) *
                Number(
                  item.unit_price || 0
                ),
            }
          : item
      );
    }

    // ===================================================
    // NEW CART ITEM
    // ===================================================

    const newItem = {
      product_id: product.id,

      product_name:
        product.name,

      product_image_url:
        cartImage,

      color:
        cartColor,

      size:
        cartSize,

      quantity: 1,

      unit_price:
        Number(product.price || 0),

      total_price:
        Number(product.price || 0),
    };

    return [
      ...currentCart,
      newItem,
    ];
  });
};
const normalizeCartValue = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const isSameOrderCartItem = (
  item,
  productId,
  productColor,
  productSize
) => {
  return (
    String(item.product_id) === String(productId) &&
    normalizeCartValue(item.color) ===
      normalizeCartValue(productColor) &&
    normalizeCartValue(item.size) ===
      normalizeCartValue(productSize)
  );
};
const decreaseOrderCartQuantity = (
  productId,
  productColor,
  productSize
) => {
  setOrderCart((currentCart) =>
    currentCart
      .map((item) => {
        if (
          !isSameOrderCartItem(
            item,
            productId,
            productColor,
            productSize
          )
        ) {
          return item;
        }

        const newQuantity =
          Number(item.quantity || 0) - 1;

        return {
          ...item,
          quantity: newQuantity,
          total_price:
            newQuantity *
            Number(item.unit_price || 0),
        };
      })
      .filter((item) => Number(item.quantity || 0) > 0)
  );
};


const increaseOrderCartQuantity = (
  productId,
  productColor,
  productSize
) => {
  setOrderCart((currentCart) =>
    currentCart.map((item) => {
      if (
        !isSameOrderCartItem(
          item,
          productId,
          productColor,
          productSize
        )
      ) {
        return item;
      }

      const newQuantity =
        Number(item.quantity || 0) + 1;

      return {
        ...item,
        quantity: newQuantity,
        total_price:
          newQuantity *
          Number(item.unit_price || 0),
      };
    })
  );
};
const decreaseProductVariantStock = async ({
  productId,
  color,
  size,
  quantity,
}) => {
  // =====================================================
  // GET PRODUCT STOCK DATA
  // =====================================================

  const {
    data: productData,
    error: productError,
  } = await supabase
    .from("products")
    .select(
      "id, category, stock, color, sizes, color_variants"
    )
    .eq("id", productId)
    .single();

  if (productError || !productData) {
    throw new Error("Product stock data পাওয়া যায়নি।");
  }

  const normalizedColor = String(color || "")
    .trim()
    .toLowerCase();

  const normalizedSize = String(size || "")
    .trim()
    .toLowerCase();

  const qty = Number(quantity || 0);

  if (qty <= 0) {
    return productData;
  }

  // =====================================================
  // SAREE STOCK
  // Saree-এর stock সরাসরি products.stock-এ থাকে
  // =====================================================

  const isSaree =
    productData.category?.trim().toLowerCase() ===
    "saree";

  if (isSaree) {
    const currentStock =
      Number(productData.stock || 0);

    if (currentStock < qty) {
      throw new Error(
        `এই Saree-এর পর্যাপ্ত stock নেই। Available: ${currentStock}`
      );
    }

    const newStock =
      currentStock - qty;

    const {
      data: updatedProduct,
      error: updateError,
    } = await supabase
      .from("products")
      .update({
        stock: newStock,
      })
      .eq("id", productId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return updatedProduct;
  }

  // =====================================================
  // MAIN COLOR STOCK — DRESS
  // =====================================================

  const mainColor =
    String(productData.color || "")
      .trim()
      .toLowerCase();

  if (mainColor === normalizedColor) {
    const sizes = Array.isArray(productData.sizes)
      ? [...productData.sizes]
      : [];

    const sizeIndex = sizes.findIndex(
      (sizeItem) =>
        String(sizeItem.size || "")
          .trim()
          .toLowerCase() === normalizedSize
    );

    if (sizeIndex === -1) {
      throw new Error(
        `এই Color + Size-এর stock পাওয়া যায়নি।`
      );
    }

    const currentStock = Number(
      sizes[sizeIndex].stock || 0
    );

    if (currentStock < qty) {
      throw new Error(
        `এই Color + Size-এর পর্যাপ্ত stock নেই। Available: ${currentStock}`
      );
    }

    sizes[sizeIndex] = {
      ...sizes[sizeIndex],
      stock: currentStock - qty,
    };

    const {
      data: updatedProduct,
      error: updateError,
    } = await supabase
      .from("products")
      .update({
        sizes,
      })
      .eq("id", productId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return updatedProduct;
  }

  // =====================================================
  // COLOR VARIANT STOCK — DRESS
  // =====================================================

  const variants = Array.isArray(
    productData.color_variants
  )
    ? [...productData.color_variants]
    : [];

  const variantIndex = variants.findIndex(
    (variant) =>
      String(variant.color || "")
        .trim()
        .toLowerCase() === normalizedColor
  );

  if (variantIndex === -1) {
    throw new Error(
      `Color "${color}" পাওয়া যায়নি।`
    );
  }

  const variant = {
    ...variants[variantIndex],
  };

  const sizes = Array.isArray(variant.sizes)
    ? [...variant.sizes]
    : [];

  const sizeIndex = sizes.findIndex(
    (sizeItem) =>
      String(sizeItem.size || "")
        .trim()
        .toLowerCase() === normalizedSize
  );

  if (sizeIndex === -1) {
    throw new Error(
      `Color "${color}" এবং Size "${size}" পাওয়া যায়নি।`
    );
  }

  const currentStock = Number(
    sizes[sizeIndex].stock || 0
  );

  if (currentStock < qty) {
    throw new Error(
      `এই Color + Size-এর পর্যাপ্ত stock নেই। Available: ${currentStock}`
    );
  }

  sizes[sizeIndex] = {
    ...sizes[sizeIndex],
    stock: currentStock - qty,
  };

  variants[variantIndex] = {
    ...variant,
    sizes,
  };

  const {
    data: updatedProduct,
    error: updateError,
  } = await supabase
    .from("products")
    .update({
      color_variants: variants,
    })
    .eq("id", productId)
    .select()
    .single();

  if (updateError) {
    throw updateError;
  }

  return updatedProduct;
};

const removeFromOrderCart = (
  productId,
  productColor,
  productSize
) => {
  setOrderCart((currentCart) =>
    currentCart.filter(
      (item) =>
        !isSameOrderCartItem(
          item,
          productId,
          productColor,
          productSize
        )
    )
  );
};
const orderSubtotal = orderCart.reduce(
  (total, item) =>
    total + Number(item.total_price || 0),
  0
);
const deliveryCharge =
  deliveryType === "80"
    ? 80
    : deliveryType === "150"
    ? 150
    : deliveryType === "free"
    ? 0
    : 0;

const orderTotal =
  orderSubtotal + deliveryCharge;
  

  // =========================================================
// ROLE PERMISSIONS
// =========================================================

const normalizedRole = String(userRole || "")
  .trim()
  .toLowerCase();

const isOwner = normalizedRole === "owner";
const isAdmin = normalizedRole === "admin";
const isStaff = normalizedRole === "staff";
const isViewer = normalizedRole === "viewer";
const canSeeAdminProductInfo =
  isOwner || isAdmin;

const canManageProducts =
  isOwner || isAdmin || isStaff;

const canViewBuyingPrice =
  isOwner || isAdmin || isStaff;

const canManageUsers =
  isOwner || isAdmin;
  // =========================================================
// PASSWORD PERMISSIONS
// =========================================================

// সব role নিজের password change করতে পারবে।
const canChangeOwnPassword =
  isOwner || isAdmin || isStaff || isViewer;

// Password History শুধুমাত্র Owner দেখতে পারবে।
const canViewPasswordHistory = isOwner;
  const dashboardOrderStats = useMemo(() => {
  const now = dashboardNow;

  // ==========================================
  // TODAY
  // ==========================================

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(
    startOfTomorrow.getDate() + 1
  );

  const isToday = (dateValue) => {
    if (!dateValue) return false;

    const date = new Date(dateValue);

    return (
      date >= startOfToday &&
      date < startOfTomorrow
    );
  };

  // ==========================================
  // AMOUNT
  // ==========================================

  const getAmount = (order) =>
    Number(order.total_amount || 0);

  // ==========================================
  // ROLE-BASED ORDERS
  //
  // OWNER / ADMIN
  // → সব orders
  //
  // STAFF / VIEWER
  // → শুধু নিজের orders
  // ==========================================

  const visibleOrders =
    isOwner || isAdmin
      ? orders
      : orders.filter(
          (order) =>
            order.created_by === currentUserId
        );

  // ==========================================
  // TODAY'S ORDERS ONLY
  //
  // Staff / Viewer:
  // শুধু আজকে নিজের তৈরি orders
  //
  // Admin / Owner:
  // আজকের সব orders
  // ==========================================

  const todayOrders =
    visibleOrders.filter(
      (order) =>
        isToday(order.created_at)
    );

  // ==========================================
// STATUS
// ==========================================

const getStatus = (order) =>
  String(order.status || "")
    .trim()
    .toLowerCase();


// ==========================================
// STATUS UPDATED TODAY
//
// এই function দেখবে order-এর status
// আজকে update হয়েছে কি না
// ==========================================

// ==========================================
// SHIPPED TODAY CHECK
// ==========================================

const isShippedToday = (order) => {
  if (!order.shipped_at) return false;

  return isToday(order.shipped_at);
};


// ==========================================
// CANCELLED TODAY CHECK
// ==========================================

const isCancelledToday = (order) => {
  if (!order.cancelled_at) return false;

  return isToday(order.cancelled_at);
};


// ==========================================
// PENDING
//
// OWNER / ADMIN
// → সব দিনের Pending orders
//
// STAFF / VIEWER
// → শুধু আজকের নিজের Pending orders
// ==========================================

const pendingOrders =
  isOwner || isAdmin
    ? visibleOrders.filter(
        (order) =>
          getStatus(order) === "pending"
      )
    : todayOrders.filter(
        (order) =>
          getStatus(order) === "pending"
      );


// ==========================================
// PACKAGING
//
// OWNER / ADMIN
// → সব দিনের Packaging orders
//
// STAFF / VIEWER
// → শুধু আজকের নিজের Packaging orders
// ==========================================

const packagingOrders =
  isOwner || isAdmin
    ? visibleOrders.filter(
        (order) =>
          getStatus(order) === "packaging"
      )
    : todayOrders.filter(
        (order) =>
          getStatus(order) === "packaging"
      );


// ==========================================
// SHIPPED TODAY
//
// OWNER / ADMIN
// → আজ status Shipped হয়েছে এমন সব order
//    (order গতকাল/আগে তৈরি হলেও চলবে)
//
// STAFF / VIEWER
// → শুধু আজকের নিজের Shipped order
// ==========================================

const shippedOrdersToday =
  isOwner || isAdmin
    ? visibleOrders.filter(
        (order) =>
          getStatus(order) === "shipped" &&
          isShippedToday(order)
      )
    : todayOrders.filter(
        (order) =>
          getStatus(order) === "shipped"
      );


// ==========================================
// CANCELLED TODAY
//
// OWNER / ADMIN
// → আজ status Cancelled হয়েছে এমন সব order
//    (order গতকাল/আগে তৈরি হলেও চলবে)
//
// STAFF / VIEWER
// → শুধু আজকের নিজের Cancelled order
// ==========================================

const cancelledOrdersToday =
  isOwner || isAdmin
    ? visibleOrders.filter(
        (order) =>
          getStatus(order) === "cancelled" &&
          isCancelledToday(order)
      )
    : todayOrders.filter(
        (order) =>
          getStatus(order) === "cancelled"
      );

  // ==========================================
  // RETURN DASHBOARD DATA
  // ==========================================

  return {
    // ------------------------------------------
    // TOTAL / NEW ORDERS TODAY
    // ------------------------------------------

    newOrdersTodayCount:
      todayOrders.length,

    newOrdersTodayAmount:
      todayOrders.reduce(
        (sum, order) =>
          sum + getAmount(order),
        0
      ),

    // ------------------------------------------
    // PENDING
    // ------------------------------------------

    pendingOrdersCount:
      pendingOrders.length,

    pendingOrdersAmount:
      pendingOrders.reduce(
        (sum, order) =>
          sum + getAmount(order),
        0
      ),

    // ------------------------------------------
    // PACKAGING
    // ------------------------------------------

    packagingOrdersCount:
      packagingOrders.length,

    packagingOrdersAmount:
      packagingOrders.reduce(
        (sum, order) =>
          sum + getAmount(order),
        0
      ),

    // ------------------------------------------
    // SHIPPED
    // ------------------------------------------

    shippedOrdersTodayCount:
      shippedOrdersToday.length,

    shippedOrdersTodayAmount:
      shippedOrdersToday.reduce(
        (sum, order) =>
          sum + getAmount(order),
        0
      ),

    // ------------------------------------------
    // CANCELLED
    // ------------------------------------------

    cancelledOrdersTodayCount:
      cancelledOrdersToday.length,

    cancelledOrdersTodayAmount:
      cancelledOrdersToday.reduce(
        (sum, order) =>
          sum + getAmount(order),
        0
      ),
  };
}, [
  orders,
  dashboardNow,
  currentUserId,
  isOwner,
  isAdmin,
]);


  // =========================================================
  // RESET PRODUCT FORM
  // =========================================================

  const resetProductForm = () => {
  setEditingProductId(null);

  setProduct({
    name: "",
    price: "",
    buying_price: "",
    category: "",
    color: "",
    sizes: [],
    details: "",
    image: null,
    imagePreview: "",
    color_variants: [],
  });
};

  // =========================================================
  // COLOR VARIANT FUNCTIONS
  // =========================================================

  const addColorVariant = () => {
  if (product.color_variants.length >= COLOR_VARIANT_LIMIT) {
    alert(
      `সর্বোচ্চ ${COLOR_VARIANT_LIMIT}টি Color Variant যোগ করা যাবে।`
    );
    return;
  }

  setProduct((currentProduct) => ({
    ...currentProduct,
    color_variants: [
      ...currentProduct.color_variants,
      {
        color: "",
        image: null,
        imagePreview: "",
        image_url: "",
        stock: "",
        sizes: [],
      },
    ],
  }));
};
const addColorVariantSize = (variantIndex) => {
  setProduct((currentProduct) => ({
    ...currentProduct,
    color_variants: currentProduct.color_variants.map(
      (variant, index) =>
        index === variantIndex
          ? {
              ...variant,
              sizes: [
                ...(Array.isArray(variant.sizes)
                  ? variant.sizes
                  : []),
                {
                  size: "",
                  stock: "",
                },
              ],
            }
          : variant
    ),
  }));
};
const handleColorVariantSizeChange = (
  variantIndex,
  sizeIndex,
  value
) => {
  setProduct((currentProduct) => ({
    ...currentProduct,
    color_variants: currentProduct.color_variants.map(
      (variant, index) =>
        index === variantIndex
          ? {
              ...variant,
              sizes: (variant.sizes || []).map(
                (sizeItem, index) =>
                  index === sizeIndex
                    ? {
                        ...sizeItem,
                        size: value,
                      }
                    : sizeItem
              ),
            }
          : variant
    ),
  }));
};
const handleColorVariantStockChange = (
  variantIndex,
  sizeIndex,
  value
) => {
  setProduct((currentProduct) => ({
    ...currentProduct,
    color_variants: currentProduct.color_variants.map(
      (variant, index) =>
        index === variantIndex
          ? {
              ...variant,
              sizes: (variant.sizes || []).map(
                (sizeItem, index) =>
                  index === sizeIndex
                    ? {
                        ...sizeItem,
                        stock: value,
                      }
                    : sizeItem
              ),
            }
          : variant
    ),
  }));
};
const removeColorVariantSize = (
  variantIndex,
  sizeIndex
) => {
  setProduct((currentProduct) => ({
    ...currentProduct,
    color_variants: currentProduct.color_variants.map(
      (variant, index) =>
        index === variantIndex
          ? {
              ...variant,
              sizes: (variant.sizes || []).filter(
                (_, index) => index !== sizeIndex
              ),
            }
          : variant
    ),
  }));
};

  const removeColorVariant = (index) => {
    setProduct((currentProduct) => ({
      ...currentProduct,
      color_variants: currentProduct.color_variants.filter(
        (_, variantIndex) => variantIndex !== index
      ),
    }));
  };

  const handleColorVariantChange = (index, value) => {
    setProduct((currentProduct) => ({
      ...currentProduct,
      color_variants: currentProduct.color_variants.map(
        (variant, variantIndex) =>
          variantIndex === index
            ? {
                ...variant,
                color: value,
              }
            : variant
      ),
    }));
  };

  const handleColorVariantImage = (index, e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const preview = URL.createObjectURL(file);

    setProduct((currentProduct) => ({
      ...currentProduct,
      color_variants: currentProduct.color_variants.map(
        (variant, variantIndex) =>
          variantIndex === index
            ? {
                ...variant,
                image: file,
                imagePreview: preview,
              }
            : variant
      ),
    }));
  };

  // =========================================================
  // CREATE USER
  // =========================================================

  const createNewUser = async () => {
    if (!canManageUsers) {
      alert("আপনার user create করার permission নেই।");
      return;
    }

    const email = newUserEmail.trim();

    const shortName = newUserShortName.trim();

    if (!email || !newUserPassword || !shortName) {
  alert("Short Name, Email এবং Password দিন।");
  return;
}

    if (newUserPassword.length < 6) {
      alert("Password কমপক্ষে 6 characters হতে হবে।");
      return;
    }

    try {
      setSaving(true);

      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      if (!currentSession?.access_token) {
        alert("আপনি Login করা নেই।");
        return;
      }

      const response = await fetch(
        "https://lnxfltmqphmcpffhcywp.supabase.co/functions/v1/create-user",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentSession.access_token}`,
          },
          body: JSON.stringify({
  email,
  password: newUserPassword,
  role: newUserRole,
  shortName,
}),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        console.error("Create user error:", result);
        alert(result.error || "User create করা যায়নি।");
        return;
      }

      const roleName =
        newUserRole === "admin"
          ? "Admin"
          : newUserRole === "staff"
          ? "Staff"
          : "Viewer";

      alert(`${roleName} user successfully created! ✅`);

      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserShortName("");
      setNewUserRole("staff");

      // নতুন user তৈরি হওয়ার পর একই modal-এ list refresh হবে।
      await loadUsers();
    } catch (error) {
      console.error("Create user unexpected error:", error);
      alert("User create করার সময় সমস্যা হয়েছে।");
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
// CHANGE OWN PASSWORD
// =========================================================
const handleChangePassword = async () => {
  if (passwordChanging) return;

  const email = session?.user?.email;

  if (!email) {
    alert("Logged in user পাওয়া যায়নি।");
    return;
  }

  if (!currentPassword) {
    alert("Current password দিন।");
    return;
  }

  if (!newPassword) {
    alert("New password দিন।");
    return;
  }

  if (!confirmNewPassword) {
    alert("Confirm new password দিন।");
    return;
  }

  if (newPassword.length < 6) {
    alert("New password কমপক্ষে 6 characters হতে হবে।");
    return;
  }

  if (newPassword !== confirmNewPassword) {
    alert("New password এবং Confirm password মিলছে না।");
    return;
  }

  if (currentPassword === newPassword) {
    alert("New password অবশ্যই current password থেকে আলাদা হতে হবে।");
    return;
  }

  try {
    setPasswordChanging(true);

    const { error: verifyError } =
      await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });

    if (verifyError) {
      console.error("Current password verification error:", verifyError);
      alert("Current password সঠিক নয়।");
      return;
    }

    const { error: updateError } =
      await supabase.auth.updateUser({
        password: newPassword,
      });
      

    if (updateError) {
      console.error("Password update error:", updateError);
      alert(updateError.message || "Password change করা যায়নি।");
      return;
    }
    // Password Change History
const { data: currentProfile } = await supabase
  .from("profiles")
  .select("full_name, role")
  .eq("id", session.user.id)
  .single();

const { error: historyError } = await supabase
  .from("password_history")
  .insert({
    user_id: session.user.id,
    user_email: session.user.email,
    user_short_name: currentProfile?.full_name || null,
    action: "Password Changed",
    changed_by: session.user.id,
    changed_by_email: session.user.email,
    changed_by_short_name:
      currentProfile?.full_name || null,
    changed_by_role:
      currentProfile?.role || null,
  });

if (historyError) {
  console.error(
    "Password history insert error:",
    historyError
  );
}

    alert("Password successfully changed! ✅");

    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setMyAccountOpen(false);
  } catch (error) {
    console.error("Password change unexpected error:", error);
    alert("Password change করার সময় সমস্যা হয়েছে।");
  } finally {
    setPasswordChanging(false);
  }
};
const loadPasswordHistory = async () => {
  if (!isOwner) return;

  try {
    setPasswordHistoryLoading(true);

    const {
      data,
      error,
    } = await supabase
      .from("password_history")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error("Password history load error:", error);
      return;
    }

    setPasswordHistory(data || []);
  } catch (error) {
    console.error(
      "Password history unexpected error:",
      error
    );
  } finally {
    setPasswordHistoryLoading(false);
  }
};
const handleOwnerResetPassword = async () => {
  if (!isOwner) {
    alert("শুধু Owner এই কাজ করতে পারবেন।");
    return;
  }

  if (!resetPasswordUser?.id) {
    alert("User পাওয়া যায়নি।");
    return;
  }

  if (!resetNewPassword) {
    alert("New password দিন।");
    return;
  }

  if (resetNewPassword.length < 6) {
    alert("Password কমপক্ষে 6 characters হতে হবে।");
    return;
  }

  if (!resetConfirmPassword) {
    alert("Confirm password দিন।");
    return;
  }

  if (resetNewPassword !== resetConfirmPassword) {
    alert("New password এবং Confirm password মিলছে না।");
    return;
  }

  try {
    setResetPasswordLoading(true);

    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();

    if (!currentSession?.access_token) {
      alert("আপনি Login করা নেই।");
      return;
    }

    const response = await fetch(
      "https://lnxfltmqphmcpffhcywp.supabase.co/functions/v1/reset-user-password",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentSession.access_token}`,
        },
        body: JSON.stringify({
          user_id: resetPasswordUser.id,
          password: resetNewPassword,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error("Reset password error:", result);
      alert(result.error || "Password reset করা যায়নি।");
      return;
    }

    alert("User password successfully reset! ✅");

    setResetNewPassword("");
    setResetConfirmPassword("");
    setResetPasswordUser(null);
    setResetPasswordModalOpen(false);

    await loadPasswordHistory();
  } catch (error) {
    console.error("Reset password unexpected error:", error);
    alert("Password reset করার সময় সমস্যা হয়েছে।");
  } finally {
    setResetPasswordLoading(false);
  }
};
  // =========================================================
  // LOAD USERS
  // =========================================================

  const loadUsers = async () => {
    if (!canManageUsers) return;

    try {
      setUsersLoading(true);

      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      if (!currentSession?.access_token) {
        alert("আপনি Login করা নেই।");
        return;
      }

      const response = await fetch(
        "https://lnxfltmqphmcpffhcywp.supabase.co/functions/v1/list-users",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${currentSession.access_token}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        console.error("Load users error:", result);
        alert(result.error || "User list load করা যায়নি।");
        return;
      }

      setUsers(Array.isArray(result.users) ? result.users : []);
    } catch (error) {
      console.error("Load users unexpected error:", error);
      alert("User list load করার সময় সমস্যা হয়েছে।");
    } finally {
      setUsersLoading(false);
    }
  };
  // =========================================================
// LOAD PRODUCT HISTORY
// =========================================================

const loadProductHistory = async () => {
  try {
    setProductHistoryLoading(true);

    const {
      data,
      error,
    } = await supabase
      .from("product_history")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "Load product history error:",
        error
      );

      alert("Product History load করা যায়নি.");
      return;
    }

    setProductHistory(data || []);
  } catch (error) {
    console.error(
      "Load product history unexpected error:",
      error
    );

    alert(
      "Product History load করার সময় সমস্যা হয়েছে."
    );
  } finally {
    setProductHistoryLoading(false);
  }
};
// =========================================================
// FILTER PRODUCT HISTORY BY PRODUCT NAME
// =========================================================

const filteredProductHistory =
  productHistory.filter((item) =>
    String(item.product_name || "")
      .toLowerCase()
      .includes(
        String(productHistorySearch || "")
          .trim()
          .toLowerCase()
      )
  );

  // =========================================================
  // REMOVE USER
  // =========================================================

  const removeUser = async (userId, userEmail) => {
    if (!canManageUsers || !userId) return;

    // নিজের account বা Owner account কখনো remove করা যাবে না।
    if (userId === currentUserId) {
      alert("আপনার নিজের account remove করা যাবে না।");
      return;
    }

    const confirmed = window.confirm(
      `${userEmail || "এই user"}-কে permanently remove করতে চান?`
    );

    if (!confirmed) return;

    try {
      setRemovingUserId(userId);

      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      if (!currentSession?.access_token) {
        alert("আপনি Login করা নেই।");
        return;
      }

      const response = await fetch(
        "https://lnxfltmqphmcpffhcywp.supabase.co/functions/v1/remove-user",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentSession.access_token}`,
          },
          body: JSON.stringify({
            user_id: userId,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        console.error("Remove user error:", result);
        alert(result.error || "User remove করা যায়নি।");
        return;
      }

      alert("User successfully removed! ✅");
      await loadUsers();
    } catch (error) {
      console.error("Remove user unexpected error:", error);
      alert("User remove করার সময় সমস্যা হয়েছে।");
    } finally {
      setRemovingUserId(null);
    }
  };

  // =========================================================
  // LOAD PRODUCTS
  // =========================================================

  const loadProducts = async () => {
    setLoading(true);

    console.log("🔵 Products loading started...");

    try {
      const supabaseRequest = supabase
        .from("products")
        .select("*")
        .order("created_at", {
          ascending: false,
        });

      const timeout = new Promise((_, reject) =>
        setTimeout(() => {
          reject(new Error("Supabase request timeout."));
        }, 10000)
      );

      const { data, error } = await Promise.race([
        supabaseRequest,
        timeout,
      ]);

      console.log("🟢 Supabase response:", {
        data,
        error,
      });

      if (error) {
        console.error("Load products error:", error);

        setProducts([]);
        return;
      }

      setProducts(data || []);
    } catch (error) {
      console.error("❌ Products loading error:", error);

      setProducts([]);

      alert(
        "Products load করতে সমস্যা হয়েছে। তবে website চালু থাকবে।"
      );
    } finally {
      setLoading(false);

      console.log("✅ Products loading finished");
    }
  };

  // =========================================================
  // IMAGE EMBEDDING
  // =========================================================

  const getImageEmbedding = async (imageUrl) => {
    try {
      setEmbeddingLoading(true);

      let embedder = imageEmbedder;

      if (!embedder) {
        console.log("🤖 Loading AI image model...");
          console.log("⏳ Starting CLIP model download...");

        embedder = await pipeline(
          "image-feature-extraction",
          "Xenova/clip-vit-base-patch32"
        );
          console.log("✅ CLIP model loaded successfully!");

        setImageEmbedder(() => embedder);
      }

      console.log("IMAGE URL:", imageUrl);

      const output = await embedder(imageUrl);

      console.log("Embedding length:", output.data.length);

      const embedding = Array.from(output.data);

      console.log("Embedding dimensions:", embedding.length);

      return embedding;
    } catch (error) {
      console.error("Image embedding error:", error);

      throw error;
    } finally {
      setEmbeddingLoading(false);
    }
  };

  const selectedOrderStatus = String(
  selectedOrder?.status || ""
).trim().toLowerCase();

const orderIsEditable =
  selectedOrderStatus === "pending" ||
  selectedOrderStatus === "packaging";

const orderIsLocked =
  selectedOrderStatus === "shipped" ||
  selectedOrderStatus === "delivered" ||
  selectedOrderStatus === "cancelled";


  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setSession(session);
      setCurrentUserId(session?.user?.id || null);
      setAuthLoading(false);
    };

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);
  // =====================================================
// LOAD ORDERS WHEN ORDERS PAGE IS OPENED
// =====================================================

useEffect(() => {
  if (
    activeMenu === "dashboard" ||
    activeMenu === "orders"
  ) {
    loadOrders();
  }
}, [activeMenu]);
// =====================================================
// LOAD SINGLE ORDER DETAILS
// =====================================================

const loadOrderDetails = async (order) => {
  try {
    setOrderDetailsLoading(true);

    setSelectedOrder(order);
    setSelectedOrderItems([]);

    const {
      data,
      error,
    } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", order.id)
      .order("created_at", {
        ascending: true,
      });

    if (error) {
      console.error(
        "Load order items error:",
        error
      );

      alert("Order items load করা যায়নি।");
      return;
    }

    setSelectedOrderItems(data || []);
  } catch (error) {
    console.error(
      "Load order details error:",
      error
    );

    alert(
      "Order details load করার সময় সমস্যা হয়েছে।"
    );
  } finally {
    setOrderDetailsLoading(false);
  }
};
// =====================================================
// SCAN BARCODE ORDER
// =====================================================

const scanBarcodeOrder = async () => {
  const scannedCode = String(barcodeScanTerm || "").trim();

  if (!scannedCode) {
    return;
  }

  try {
    setBarcodeScanning(true);

    // =================================================
    // EXACT ORDER NUMBER MATCH
    // =================================================

    const { data: order, error } = await supabase
      .from("orders")
      .select("*")
      .eq("order_number", scannedCode)
      .maybeSingle();

    if (error) {
      console.error("Barcode order search error:", error);
      alert("Barcode scan করে order খুঁজতে সমস্যা হয়েছে।");
      return;
    }

    // =================================================
    // ORDER NOT FOUND
    // =================================================

    if (!order) {
      alert(
        `এই barcode-এর জন্য কোনো order পাওয়া যায়নি।\n\nBarcode: ${scannedCode}`
      );
      return;
    }

    // =================================================
    // ONLY PACKAGING ORDERS
    // =================================================

    const orderStatus = String(
      order.status || ""
    )
      .trim()
      .toLowerCase();

    if (orderStatus !== "packaging") {
      alert(
        `এই order এখন Packaging status-এ নেই।\n\nOrder: ${order.order_number}\nStatus: ${orderStatus || "unknown"}`
      );
      return;
    }

    // =================================================
    // DUPLICATE SCAN CHECK
    // =================================================

    const alreadyScanned = scannedOrders.some(
      (item) => item.id === order.id
    );

    if (alreadyScanned) {
      alert(
        `এই order আগে থেকেই scan করা হয়েছে।\n\nOrder: ${order.order_number}`
      );
      return;
    }

    // =================================================
    // ADD TO SCANNED ORDERS
    // =================================================

    setScannedOrders((currentOrders) => [
      ...currentOrders,
      order,
    ]);

    // Clear scan box
    setBarcodeScanTerm("");

    // Scanner-এর focus আবার input-এ রাখবে
    setTimeout(() => {
      barcodeScanInputRef.current?.focus();
    }, 50);

  } catch (error) {
    console.error("Barcode scan unexpected error:", error);
    alert("Barcode scan করার সময় সমস্যা হয়েছে।");
  } finally {
    setBarcodeScanning(false);
  }
};
useEffect(() => {
  if (barcodeScannerOpen) {
    setTimeout(() => {
      barcodeScanInputRef.current?.focus();
    }, 100);
  }
}, [barcodeScannerOpen]);
// =====================================================
// TOGGLE SCANNED ORDER MARK
// =====================================================

const toggleScannedOrderMark = (orderId) => {
  setSelectedScannedOrderIds((currentIds) => {
    if (currentIds.includes(orderId)) {
      return currentIds.filter((id) => id !== orderId);
    }

    return [...currentIds, orderId];
  });
};
// =====================================================
// MARK ALL SCANNED ORDERS
// =====================================================

const markAllScannedOrders = () => {
  setSelectedScannedOrderIds(
    scannedOrders
      .filter(
        (order) =>
          String(order.status || "")
            .trim()
            .toLowerCase() === "packaging"
      )
      .map((order) => order.id)
  );
};
// =====================================================
// UNMARK ALL SCANNED ORDERS
// =====================================================

const unmarkAllScannedOrders = () => {
  setSelectedScannedOrderIds([]);
};
// =====================================================
// CREATE COURIER SHIPMENT RECORDS
// =====================================================

const createCourierShipmentRecords = async ({
  ordersToShip,
  courier,
  shippedAt,
}) => {
  if (!ordersToShip || ordersToShip.length === 0) {
    return {
      success: false,
      data: [],
      error: "No orders selected",
    };
  }

  // =====================================================
// COURIER SERVICE LAYER
// =====================================================
// এখনো কোনো real courier API call হবে না.
// শুধু selected courier-এর service available কিনা
// এবং future API connection status কী সেটা check করা হবে.
// =====================================================

const courierServiceResult =
  await courierService.createShipment(courier, {
    orders: ordersToShip,
    shippedAt,
  });

console.log(
  "Courier Service Layer Result:",
  courierServiceResult
);
// =====================================================
// SAVE COURIER SERVICE STATUS
// =====================================================

const courierServiceStatus =
  courierServiceResult?.status || "not_connected";

const courierServiceMessage =
  courierServiceResult?.message || null;
  const shipmentRows = ordersToShip.map((order) => ({
    order_id: order.id,

    courier,

    // API এখনো connected নয়
    shipment_status: "ready_to_ship",
    api_status: courierServiceStatus,

    // Courier API connect হলে এগুলো আসবে
    consignment_id: null,
    tracking_code: null,

    courier_response:
  courierServiceResult?.data || null,

api_error:
  courierServiceResult?.error || null,

    // বর্তমানে logged-in user
    created_by: session?.user?.id || null,
    created_by_name: session?.user?.email || null,
    created_by_role: userRole || null,

    created_at: shippedAt,
    booked_at: null,
    shipped_at: shippedAt,

    updated_at: shippedAt,

    // Courier API-তে ভবিষ্যতে যেসব order data লাগবে
    metadata: {
      order_number: order.order_number || null,

      customer_name:
        order.customer_name || null,

      customer_phone:
        order.customer_phone || null,

      customer_address:
        order.customer_address || null,

      subtotal:
        Number(order.subtotal || 0),

      delivery_charge:
        Number(order.delivery_charge || 0),

      total_amount:
        Number(order.total_amount || 0),

      delivery_type:
        order.delivery_type || null,
    },
  }));

  const { data, error } = await supabase
    .from("courier_shipments")
    .insert(shipmentRows)
    .select();
    // =====================================================
// CREATE INITIAL TRACKING EVENT
// =====================================================

if (data && data.length > 0) {
  const trackingRows = data.map((shipment) => ({
    shipment_id: shipment.id,

    status: "ready_to_ship",

    location: null,
    rider_name: null,
    rider_phone: null,

    note: "Courier shipment record created.",

    courier_event_id: null,

    event_time: shippedAt,

    raw_response:
      courierServiceResult?.data || null,

    created_at: shippedAt,
  }));

  const {
    error: trackingError,
  } = await supabase
    .from("courier_tracking_updates")
    .insert(trackingRows);

  if (trackingError) {
    console.error(
      "Initial tracking event insert error:",
      trackingError
    );
  }
}

  if (error) {
  console.error(
    "Courier shipment insert error:",
    error
  );

  alert(
    `Courier shipment insert error:\n\n${
      error?.message ||
      error?.details ||
      error?.hint ||
      "Unknown Supabase error"
    }`
  );

  return {
    success: false,
    data: [],
    error,
  };
}

  return {
    success: true,
    data: data || [],
    error: null,
  };
};
// =====================================================
// LOAD COURIER SHIPMENTS
// =====================================================

const loadCourierShipments = async () => {
  try {
    setCourierShipmentsLoading(true);

    const { data, error } = await supabase
      .from("courier_shipments")
      .select(`
        *,
        orders (
          order_number,
          customer_name,
          customer_phone,
          customer_address,
          total_amount,
          delivery_charge,
          delivery_type,
          status,
          created_at,
          shipped_at
        ),
        courier_tracking_updates (
          id,
          status,
          location,
          rider_name,
          rider_phone,
          note,
          courier_event_id,
          event_time,
          raw_response,
          created_at
        )
      `)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "Load courier shipments error:",
        error
      );

      return;
    }

    setCourierShipments(data || []);

    console.log(
      "Courier shipments loaded:",
      data || []
    );

    return data || [];

  } catch (error) {
    console.error(
      "Courier shipments unexpected error:",
      error
    );

    return [];

  } finally {
    setCourierShipmentsLoading(false);
  }
};
// =====================================================
// FILTERED COURIER SHIPMENTS
// =====================================================

const filteredCourierShipments =
  courierShipments.filter((shipment) => {
    // =================================================
    // COURIER FILTER
    // =================================================

    const shipmentCourier = String(
      shipment.courier || ""
    )
      .trim()
      .toLowerCase();

    const courierMatches =
      activeCourier === "all" ||
      shipmentCourier === activeCourier;

    // =================================================
    // SEARCH FILTER
    // Search by:
    // 1. Order Number
    // 2. Customer Phone
    // =================================================

    const searchValue = String(
      courierSearchTerm || ""
    )
      .trim()
      .toLowerCase();

    const orderNumber = String(
      shipment.orders?.order_number ||
        shipment.metadata?.order_number ||
        ""
    )
      .trim()
      .toLowerCase();

    const customerPhone = String(
      shipment.orders?.customer_phone ||
        shipment.metadata?.customer_phone ||
        ""
    )
      .trim()
      .toLowerCase();

    const normalizedSearch = searchValue.replace(
      /[\s-]/g,
      ""
    );

    const normalizedPhone = customerPhone.replace(
      /[\s-]/g,
      ""
    );

    const searchMatches =
      !searchValue ||
      orderNumber.includes(searchValue) ||
      normalizedPhone.includes(normalizedSearch);

    // =================================================
// DATE FILTER
// Based on courier shipment created_at
// =================================================

const shipmentDate = shipment.created_at
  ? new Date(shipment.created_at)
  : null;

let dateMatches = true;

// FROM DATE
if (courierFromDate && shipmentDate) {
  const fromDate = new Date(
    `${courierFromDate}T00:00:00`
  );

  if (shipmentDate < fromDate) {
    dateMatches = false;
  }
}

// TO DATE
if (courierToDate && shipmentDate) {
  const toDate = new Date(
    `${courierToDate}T23:59:59.999`
  );

  if (shipmentDate > toDate) {
    dateMatches = false;
  }
}

// =================================================
// FINAL RESULT
// =================================================

return (
  courierMatches &&
  searchMatches &&
  dateMatches
);
  });
// =====================================================
// BULK MARK AS SHIPPED
// =====================================================

const bulkMarkAsShipped = async () => {
  if (!isOwner && !isAdmin) {
    alert(
      "শুধু Owner এবং Admin order shipped করতে পারবেন।"
    );
    return;
  }

  if (selectedScannedOrderIds.length === 0) {
    alert("আগে অন্তত একটি order mark করুন।");
    return;
  }

  const selectedOrders = scannedOrders.filter((order) =>
    selectedScannedOrderIds.includes(order.id)
  );

  if (selectedOrders.length === 0) {
    alert("কোনো valid order selected নেই।");
    return;
  }

  const invalidOrders = selectedOrders.filter(
    (order) =>
      String(order.status || "")
        .trim()
        .toLowerCase() !== "packaging"
  );

  if (invalidOrders.length > 0) {
    alert(
      "Selected orders-এর মধ্যে কিছু order আর Packaging status-এ নেই।"
    );
    return;
  }

  const confirmShipping = window.confirm(
    `${selectedOrders.length}টি order একসাথে Shipped করবেন?\n\nPackaging → Shipped`
  );

  if (!confirmShipping) {
    return;
  }

  try {
    setBulkShipping(true);

    // =====================================================
    // SHIPPING TIME
    // =====================================================

    const shippedAt = new Date().toISOString();

    // =====================================================
    // CREATE COURIER SHIPMENT RECORDS
    // =====================================================

    const courierShipmentResult =
      await createCourierShipmentRecords({
        ordersToShip: selectedOrders,
        courier: selectedCourier,
        shippedAt,
      });

    if (!courierShipmentResult.success) {
      console.error(
        "Courier shipment creation failed:",
        courierShipmentResult.error
      );

      alert(
        "Courier shipment record তৈরি করা যায়নি।\n\nOrder Shipped করা হয়নি।"
      );

      return;
    }

    // =====================================================
    // UPDATE ORDERS → SHIPPED
    // =====================================================

    const { data: updatedOrders, error } = await supabase
      .from("orders")
      .update({
        status: "shipped",
        shipped_at: shippedAt,
      })
      .in("id", selectedScannedOrderIds)
      .eq("status", "packaging")
      .select();

    if (error) {
      console.error("Bulk shipping error:", error);

      alert("Orders shipped করা যায়নি।");

      return;
    }

    if (!updatedOrders || updatedOrders.length === 0) {
      alert("কোনো order update হয়নি.");
      return;
    }

    // =====================================================
    // UPDATE SCANNED ORDER LIST
    // =====================================================

    setScannedOrders((currentOrders) =>
      currentOrders.map((order) => {
        const updated = updatedOrders.find(
          (item) => item.id === order.id
        );

        return updated || order;
      })
    );

    // =====================================================
    // CLEAR MARKED ORDERS
    // =====================================================

    setSelectedScannedOrderIds([]);

    // =====================================================
    // UPDATE MAIN ORDERS LIST
    // =====================================================

    setOrders((currentOrders) =>
      currentOrders.map((order) => {
        const updated = updatedOrders.find(
          (item) => item.id === order.id
        );

        return updated || order;
      })
    );

    // =====================================================
    // ADD ORDER HISTORY
    // =====================================================

    for (const updatedOrder of updatedOrders) {
      const oldOrder = selectedOrders.find(
        (order) => order.id === updatedOrder.id
      );

      await addOrderHistory({
        orderId: updatedOrder.id,
        orderNumber: updatedOrder.order_number,
        actionType: "status_changed",
        actionDescription:
          "Order status changed from packaging to shipped by bulk barcode shipping",
        oldData: {
          status: oldOrder?.status || "packaging",
        },
        newData: {
          status: "shipped",
          shipped_at: updatedOrder.shipped_at,
        },
      });
    }

    alert(
      `${updatedOrders.length}টি order সফলভাবে Shipped হয়েছে। ✅`
    );

  } catch (error) {
    console.error(
      "Bulk shipping unexpected error:",
      error
    );

    alert(
      `Bulk shipping করার সময় সমস্যা হয়েছে।\n\n${
        error?.message ||
        error?.details ||
        error?.hint ||
        "Unknown error"
      }`
    );

  } finally {
    setBulkShipping(false);

    setTimeout(() => {
      barcodeScanInputRef.current?.focus();
    }, 50);
  }
};
// =====================================================
// COURIER REPORT SUMMARY
// =====================================================

const courierReportTotalParcels =
  filteredCourierShipments.length;

const courierReportTotalAmount =
  filteredCourierShipments.reduce(
    (sum, shipment) =>
      sum +
      Number(
        shipment.orders?.total_amount ??
          shipment.metadata?.total_amount ??
          0
      ),
    0
  );
// =====================================================
// START EDIT ORDER
// =====================================================

const startEditOrder = () => {
  if (!isOwner && !isAdmin) {
    alert("শুধু Owner এবং Admin order edit করতে পারবেন।");
    return;
  }

  if (!selectedOrder) return;

  setEditOrderItems(
    selectedOrderItems.map((item) => ({
      ...item,
      quantity: Number(item.quantity || 1),
      unit_price: Number(item.unit_price || 0),
      total_price:
        Number(item.quantity || 1) *
        Number(item.unit_price || 0),
    }))
  );

  setEditOrderDeliveryCharge(
    Number(selectedOrder.delivery_charge || 0)
  );

  setEditOrderMode(true);
};
// =====================================================
// UPDATE EDIT ORDER ITEM
// =====================================================

const updateEditOrderItem = (
  itemId,
  field,
  value
) => {
  setEditOrderItems((currentItems) =>
    currentItems.map((item) => {
      if (item.id !== itemId) {
        return item;
      }

      const updatedItem = {
        ...item,
        [field]: value,
      };

      const quantity =
        field === "quantity"
          ? Number(value || 0)
          : Number(updatedItem.quantity || 0);

      const unitPrice =
        field === "unit_price"
          ? Number(value || 0)
          : Number(updatedItem.unit_price || 0);

      return {
        ...updatedItem,
        quantity,
        unit_price: unitPrice,
        total_price: quantity * unitPrice,
      };
    })
  );
};
// =====================================================
// REMOVE ITEM FROM EDIT ORDER
// =====================================================

const removeEditOrderItem = (itemId) => {
  setEditOrderItems((currentItems) =>
    currentItems.filter(
      (item) => item.id !== itemId
    )
  );
};
// =====================================================
// SAVE EDITED ORDER
// =====================================================

const saveEditedOrder = async () => {
  if (!isOwner && !isAdmin) {
    alert("শুধু Owner এবং Admin order edit করতে পারবেন।");
    return;
  }

  if (!selectedOrder) {
    alert("Order পাওয়া যায়নি।");
    return;
  }
  // =====================================================
// ORDER EDIT LOCK AFTER SHIPPED
// =====================================================

const currentOrderStatus =
  String(selectedOrder.status || "")
    .trim()
    .toLowerCase();

if (
  currentOrderStatus === "shipped" ||
  currentOrderStatus === "delivered" ||
  currentOrderStatus === "cancelled"
) {
  alert(
    "এই order Shipped হওয়ার পর আর edit করা যাবে না।"
  );
  return;
}

  if (editOrderItems.length === 0) {
    alert("কমপক্ষে একটি product থাকতে হবে।");
    return;
  }

  // ================================================
// SAVE ORIGINAL ORDER SNAPSHOT FOR HISTORY
// ================================================

const originalItems = selectedOrderItems.map((item) => ({
  id: item.id,
  product_id: item.product_id || null,
  product_name: item.product_name || "Product",
  color: item.color || "",
  size: item.size || "",
  quantity: Number(item.quantity || 0),
  unit_price: Number(item.unit_price || 0),
  total_price: Number(item.total_price || 0),
}));

const originalDeliveryCharge =
  Number(selectedOrder.delivery_charge || 0);

const originalSubtotal =
  Number(selectedOrder.subtotal || 0);

const originalTotalAmount =
  Number(selectedOrder.total_amount || 0);
  try {
    setEditOrderSaving(true);

    // ================================================
    // 1. UPDATE ORDER
    // ================================================

    const { data: updatedOrder, error: orderError } =
      await supabase
        .from("orders")
        .update({
          subtotal: editOrderSubtotal,
          delivery_charge:
            Number(editOrderDeliveryCharge || 0),
          total_amount: editOrderTotal,
          delivery_type:
            Number(editOrderDeliveryCharge || 0) === 0
              ? "free"
              : "paid",
        })
        .eq("id", selectedOrder.id)
        .select()
        .single();

    if (orderError) {
      console.error(
        "Update order error:",
        orderError
      );

      alert("Order update করা যায়নি।");
      return;
    }

    // ================================================
    // 2. UPDATE EXISTING ORDER ITEMS
    // ================================================

    for (const item of editOrderItems) {

  // =================================================
  // NEW PRODUCT
  // =================================================

  if (item.isNew) {
    const { error: insertItemError } =
      await supabase
        .from("order_items")
        .insert([
          {
            order_id:
              selectedOrder.id,

            product_id:
              item.product_id || null,

            product_name:
              item.product_name,

            product_image_url:
              item.product_image_url || null,

            color:
              item.color || "",

            size:
              item.size || "",

            quantity:
              Number(item.quantity || 1),

            unit_price:
              Number(item.unit_price || 0),

            total_price:
              Number(item.quantity || 1) *
              Number(item.unit_price || 0),
          },
        ]);

    if (insertItemError) {
      console.error(
        "Insert new order item error:",
        insertItemError
      );

      alert(
        "নতুন product order-এ যোগ করা যায়নি।"
      );

      return;
    }

    continue;
  }

  // =================================================
  // EXISTING PRODUCT
  // =================================================

  const { error: itemError } =
    await supabase
      .from("order_items")
      .update({
        quantity:
          Number(item.quantity || 0),

        unit_price:
          Number(item.unit_price || 0),

        total_price:
          Number(item.quantity || 0) *
          Number(item.unit_price || 0),
      })
      .eq("id", item.id);

  if (itemError) {
    console.error(
      "Update order item error:",
      itemError
    );

    alert(
      "একটি order item update করা যায়নি।"
    );

    return;
  }
}
// =====================================================
// UPDATE ORDER STATUS
// =====================================================


    // ================================================
    // 3. DELETE REMOVED ITEMS
    // ================================================

    const currentItemIds =
      editOrderItems.map(
        (item) => item.id
      );

    const originalItemIds =
      selectedOrderItems.map(
        (item) => item.id
      );

    const removedItemIds =
      originalItemIds.filter(
        (id) =>
          !currentItemIds.includes(id)
      );

    if (removedItemIds.length > 0) {
      const { error: removeError } =
        await supabase
          .from("order_items")
          .delete()
          .in("id", removedItemIds);

      if (removeError) {
        console.error(
          "Remove order items error:",
          removeError
        );

        alert(
          "Removed product database থেকে সরানো যায়নি।"
        );

        return;
      }
    }

    // ================================================
// SAVE ORDER EDIT HISTORY
// ================================================

try {
  // =================================================
  // NEW PRODUCTS ADDED
  // =================================================

  const addedItems = editOrderItems.filter(
    (item) => item.isNew
  );

  for (const item of addedItems) {
    await addOrderHistory({
      orderId: updatedOrder.id,

      orderNumber:
        updatedOrder.order_number,

      actionType:
        "product_added",

      actionDescription:
        `Product added: ${
          item.product_name || "Product"
        }`,

      oldData:
        null,

      newData: {
        product_id:
          item.product_id || null,

        product_name:
          item.product_name || "Product",

        color:
          item.color || "",

        size:
          item.size || "",

        quantity:
          Number(item.quantity || 0),

        unit_price:
          Number(item.unit_price || 0),

        total_price:
          Number(item.total_price || 0),
      },
    });
  }

  // =================================================
  // REMOVED PRODUCTS
  // =================================================

  const removedItems =
    originalItems.filter(
      (oldItem) =>
        !editOrderItems.some(
          (newItem) =>
            !newItem.isNew &&
            newItem.id === oldItem.id
        )
    );

  for (const item of removedItems) {
    await addOrderHistory({
      orderId: updatedOrder.id,

      orderNumber:
        updatedOrder.order_number,

      actionType:
        "product_removed",

      actionDescription:
        `Product removed: ${
          item.product_name || "Product"
        }`,

      oldData: {
        product_id:
          item.product_id || null,

        product_name:
          item.product_name || "Product",

        color:
          item.color || "",

        size:
          item.size || "",

        quantity:
          Number(item.quantity || 0),

        unit_price:
          Number(item.unit_price || 0),

        total_price:
          Number(item.total_price || 0),
      },

      newData:
        null,
    });
  }

  // =================================================
  // EXISTING PRODUCT CHANGES
  // =================================================

  const existingEditedItems =
    editOrderItems.filter(
      (item) => !item.isNew
    );

  for (const newItem of existingEditedItems) {
    const oldItem =
      originalItems.find(
        (item) =>
          item.id === newItem.id
      );

    if (!oldItem) continue;

    const oldQuantity =
      Number(oldItem.quantity || 0);

    const newQuantity =
      Number(newItem.quantity || 0);

    const oldUnitPrice =
      Number(oldItem.unit_price || 0);

    const newUnitPrice =
      Number(newItem.unit_price || 0);

    // =================================================
    // QUANTITY CHANGED
    // =================================================

    if (oldQuantity !== newQuantity) {
      await addOrderHistory({
        orderId: updatedOrder.id,

        orderNumber:
          updatedOrder.order_number,

        actionType:
          "quantity_changed",

        actionDescription:
          `Quantity changed for ${
            newItem.product_name || "Product"
          }`,

        oldData: {
          product_id:
            oldItem.product_id || null,

          product_name:
            oldItem.product_name || "Product",

          quantity:
            oldQuantity,
        },

        newData: {
          product_id:
            newItem.product_id || null,

          product_name:
            newItem.product_name || "Product",

          quantity:
            newQuantity,
        },
      });
    }

    // =================================================
    // PRICE CHANGED
    // =================================================

    if (oldUnitPrice !== newUnitPrice) {
      await addOrderHistory({
        orderId: updatedOrder.id,

        orderNumber:
          updatedOrder.order_number,

        actionType:
          "price_changed",

        actionDescription:
          `Price changed for ${
            newItem.product_name || "Product"
          }`,

        oldData: {
          product_id:
            oldItem.product_id || null,

          product_name:
            oldItem.product_name || "Product",

          unit_price:
            oldUnitPrice,
        },

        newData: {
          product_id:
            newItem.product_id || null,

          product_name:
            newItem.product_name || "Product",

          unit_price:
            newUnitPrice,
        },
      });
    }
  }

  // =================================================
  // DELIVERY CHARGE CHANGED
  // =================================================

  const newDeliveryCharge =
    Number(
      updatedOrder.delivery_charge || 0
    );

  if (
    originalDeliveryCharge !==
    newDeliveryCharge
  ) {
    await addOrderHistory({
      orderId: updatedOrder.id,

      orderNumber:
        updatedOrder.order_number,

      actionType:
        "delivery_charge_changed",

      actionDescription:
        "Delivery charge changed",

      oldData: {
        delivery_charge:
          originalDeliveryCharge,
      },

      newData: {
        delivery_charge:
          newDeliveryCharge,
      },
    });
  }

  // =================================================
  // ORDER TOTAL CHANGED
  // =================================================

  const newSubtotal =
    Number(
      updatedOrder.subtotal || 0
    );

  const newTotalAmount =
    Number(
      updatedOrder.total_amount || 0
    );

  if (
    originalSubtotal !== newSubtotal ||
    originalTotalAmount !== newTotalAmount
  ) {
    await addOrderHistory({
      orderId: updatedOrder.id,

      orderNumber:
        updatedOrder.order_number,

      actionType:
        "order_total_changed",

      actionDescription:
        "Order amount updated",

      oldData: {
        subtotal:
          originalSubtotal,

        delivery_charge:
          originalDeliveryCharge,

        total_amount:
          originalTotalAmount,
      },

      newData: {
        subtotal:
          newSubtotal,

        delivery_charge:
          newDeliveryCharge,

        total_amount:
          newTotalAmount,
      },
    });
  }

} catch (historyError) {
  console.error(
    "Order edit history error:",
    historyError
  );
}
    // ================================================
    // 4. UPDATE LOCAL STATES
    // ================================================

    setSelectedOrder(updatedOrder);

    await loadOrderDetails(updatedOrder);

    setOrders((currentOrders) =>
      currentOrders.map((order) =>
        order.id === updatedOrder.id
          ? updatedOrder
          : order
      )
    );

    // ================================================
    // 5. EXIT EDIT MODE
    // ================================================

    setEditOrderMode(false);

    alert("Order successfully updated! ✅");

  } catch (error) {
    console.error(
      "Save edited order unexpected error:",
      error
    );

    alert(
      "Order update করার সময় সমস্যা হয়েছে।"
    );

    } finally {
    setEditOrderSaving(false);
  }
};

// =====================================================
// UPDATE ORDER STATUS
// =====================================================

const updateOrderStatus = async (newStatus) => {
  if (!isOwner && !isAdmin) {
    alert(
      "শুধু Owner এবং Admin order status পরিবর্তন করতে পারবেন।"
    );
    return;
  }

  if (!selectedOrder?.id) {
    alert("Order পাওয়া যায়নি।");
    return;
  }

  const currentStatus =
    String(selectedOrder.status || "")
      .trim()
      .toLowerCase();

  const nextStatus =
    String(newStatus || "")
      .trim()
      .toLowerCase();

  // =====================================================
  // ONLY THESE TRANSITIONS ARE ALLOWED
  // =====================================================

  const allowedTransitions = {
    pending: ["packaging"],
    packaging: ["shipped"],
    shipped: [],
    delivered: [],
    cancelled: [],
  };

  const allowedNextStatuses =
    allowedTransitions[currentStatus] || [];

  if (
    !allowedNextStatuses.includes(nextStatus)
  ) {
    alert(
      `এই status থেকে "${newStatus}" করা যাবে না।`
    );
    return;
  }

  try {
    const updateData = {
  status: nextStatus,
};

if (nextStatus === "shipped") {
  updateData.shipped_at =
    new Date().toISOString();
}

const {
  data,
  error,
} = await supabase
  .from("orders")
  .update(updateData)
  .eq("id", selectedOrder.id)
  .select()
  .single();

    if (error) {
      console.error(
        "Update order status error:",
        error
      );

      alert(
        "Order status update করা যায়নি।"
      );

      return;
    }

    setSelectedOrder(data);

    setOrders((currentOrders) =>
      currentOrders.map((order) =>
        order.id === data.id
          ? data
          : order
      )
    );

    // =================================================
    // SAVE STATUS CHANGE HISTORY
    // =================================================

    await addOrderHistory({
      orderId:
        data.id,

      orderNumber:
        data.order_number,

      actionType:
        "status_changed",

      actionDescription:
        `Order status changed from ${
          currentStatus || "unknown"
        } to ${
          nextStatus || "unknown"
        }`,

      oldData: {
        status:
          currentStatus || null,
      },

      newData: {
        status:
          nextStatus || null,
      },
    });

    alert(
      `Order status "${nextStatus}" করা হয়েছে। ✅`
    );

  } catch (error) {
    console.error(
      "Update order status unexpected error:",
      error
    );

    alert(
      "Order status update করার সময় সমস্যা হয়েছে।"
    );
  }
};

// =====================================================
// CANCEL ORDER
// =====================================================

const cancelOrder = async () => {
  if (!isOwner && !isAdmin) {
    alert(
      "শুধু Owner এবং Admin order cancel করতে পারবেন।"
    );
    return;
  }

  if (!selectedOrder?.id) {
    alert("Order পাওয়া যায়নি।");
    return;
  }
  const currentOrderStatus =
  String(selectedOrder.status || "")
    .trim()
    .toLowerCase();

if (
  currentOrderStatus === "shipped" ||
  currentOrderStatus === "delivered" ||
  currentOrderStatus === "cancelled"
) {
  alert(
    "এই order Shipped হওয়ার পর আর cancel করা যাবে না।"
  );
  return;
}

  if (
    String(selectedOrder.status || "")
      .toLowerCase() === "cancelled"
  ) {
    alert("এই order ইতিমধ্যে cancelled।");
    return;
  }

  const confirmed = window.confirm(
    `Order #${
      selectedOrder.order_number || ""
    } cancel করতে চান?`
  );

  if (!confirmed) return;

  try {
    const { data, error } =
  await supabase
    .from("orders")
    .update({
      status: "cancelled",
      cancelled_at:
        new Date().toISOString(),
    })
    .eq("id", selectedOrder.id)
    .select()
    .single();

    if (error) {
      console.error(
        "Cancel order error:",
        error
      );

      alert(
        "Order cancel করা যায়নি।"
      );

      return;
    }

    setSelectedOrder(data);

    setOrders((currentOrders) =>
      currentOrders.map((order) =>
        order.id === data.id
          ? data
          : order
      )
    );
    // ==========================================
// SAVE ORDER CANCEL HISTORY
// ==========================================

await addOrderHistory({
  orderId: data.id,

  orderNumber:
    data.order_number,

  actionType:
    "order_cancelled",

  actionDescription:
    "Order cancelled",

  oldData: {
    status:
      selectedOrder.status || null,
  },

  newData: {
    status:
      "cancelled",
  },
});

    alert(
      "Order successfully cancelled. ✅"
    );

  } catch (error) {
    console.error(
      "Cancel order unexpected error:",
      error
    );

    alert(
      "Order cancel করার সময় সমস্যা হয়েছে।"
    );
  }
};
// =====================================================
// PRINT INVOICE
// =====================================================

const printInvoice = () => {
  if (!selectedOrder) {
    alert("Order পাওয়া যায়নি।");
    return;
  }

  const invoiceWindow = window.open(
    "",
    "_blank",
    "width=900,height=1000"
  );

  if (!invoiceWindow) {
    alert(
      "Print window open করা যায়নি। Browser popup allow করুন।"
    );
    return;
  }

  const formatDate = (dateValue) => {
    if (!dateValue) return "—";

    return new Date(dateValue).toLocaleString(
      "en-BD",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  };

  // =====================================================
  // GENERATE BARCODE FROM ORDER NUMBER
  // =====================================================

  const barcodeValue = String(
    selectedOrder.order_number || ""
  ).trim();

  let barcodeHtml = "";

  if (barcodeValue) {
    try {
      const barcodeSvg =
        document.createElementNS(
          "http://www.w3.org/2000/svg",
          "svg"
        );

      JsBarcode(
        barcodeSvg,
        barcodeValue,
        {
          format: "CODE128",

          width: 2,

          height: 60,

          displayValue: true,

          fontSize: 14,

          fontOptions: "bold",

          margin: 0,

          textMargin: 6,

          background: "#ffffff",

          lineColor: "#000000",
        }
      );

      barcodeHtml =
        barcodeSvg.outerHTML;

    } catch (barcodeError) {
      console.error(
        "Barcode generation error:",
        barcodeError
      );

      barcodeHtml = `
        <div
          style="
            margin-top:12px;
            color:#b91c1c;
            font-size:12px;
          "
        >
          Barcode generate করা যায়নি।
        </div>
      `;
    }
  }

  // =====================================================
  // ORDER ITEMS HTML
  // =====================================================

  const itemsHtml =
    selectedOrderItems
      .map(
        (item) => `
          <tr>

            <td
              style="
                padding:12px;
                border-bottom:1px solid #ddd;
              "
            >
              ${
                item.product_image_url
                  ? `
                    <img
                      src="${item.product_image_url}"
                      class="product-image"
                    />
                  `
                  : "—"
              }
            </td>

            <td
              style="
                padding:12px;
                border-bottom:1px solid #ddd;
              "
            >

              <strong>
                ${item.product_name || "Product"}
              </strong>

              <div
                style="
                  font-size:12px;
                  color:#666;
                  margin-top:4px;
                "
              >
                Color: ${item.color || "—"}
              </div>

              <div
                style="
                  font-size:12px;
                  color:#666;
                  margin-top:3px;
                "
              >
                Size: ${item.size || "—"}
              </div>

            </td>

            <td
              style="
                padding:12px;
                border-bottom:1px solid #ddd;
                text-align:center;
              "
            >
              ${item.quantity || 0}
            </td>

            <td
              style="
                padding:12px;
                border-bottom:1px solid #ddd;
                text-align:right;
              "
            >
              ৳${Number(
                item.unit_price || 0
              ).toLocaleString()}
            </td>

            <td
              style="
                padding:12px;
                border-bottom:1px solid #ddd;
                text-align:right;
                font-weight:700;
              "
            >
              ৳${Number(
                item.total_price || 0
              ).toLocaleString()}
            </td>

          </tr>
        `
      )
      .join("");

  // =====================================================
  // PRINT WINDOW
  // =====================================================

  invoiceWindow.document.write(`
    <!DOCTYPE html>

    <html>

      <head>

        <title>
          Invoice ${
            selectedOrder.order_number || ""
          }
        </title>

        <style>

          * {
            box-sizing: border-box;
          }

          html,
          body {
            margin: 0;
            padding: 0;
            background: #fff;
          }

          body {
            font-family:
              Arial,
              Helvetica,
              sans-serif;

            color: #111827;
          }

          .invoice {
            width: 100%;
            max-width: 190mm;
            margin: 0 auto;
          }

          /* =================================================
             BRAND
          ================================================= */

          .brand {
            text-align: center;
            margin-bottom: 18px;
          }

          .brand-name {
            font-size: 30px;
            font-weight: 800;
            letter-spacing: 1px;
          }

          .brand-subtitle {
            margin-top: 4px;
            font-size: 13px;
            color: #666;
          }

          .invoice-title {
            margin-top: 12px;
            font-size: 20px;
            font-weight: 700;
          }

          /* =================================================
             INVOICE META
          ================================================= */

          .invoice-meta {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            margin-top: 18px;
            margin-bottom: 20px;
          }

          .customer-box,
          .order-box,
          .box {
            flex: 1;
            min-width: 0;
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 12px;
          }

          .box-title {
            font-size: 11px;
            color: #777;
            margin-bottom: 5px;
            text-transform: uppercase;
            font-weight: 700;
          }

          /* =================================================
             BARCODE
          ================================================= */

          .barcode-section {
            margin-top: 14px;
            padding-top: 10px;
            border-top: 1px dashed #ddd;
            text-align: center;
          }

          .barcode-section svg {
            width: 100%;
            max-width: 300px;
            height: auto;
            display: block;
            margin: 0 auto;
          }

          .barcode-label {
            margin-top: 5px;
            font-size: 11px;
            color: #555;
            font-weight: 700;
            letter-spacing: 0.5px;
          }

          /* =================================================
             TABLE
          ================================================= */

          table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
          }

          th {
            padding: 9px 7px;
            background: #f3f4f6;
            border-bottom: 1px solid #ddd;
            text-align: left;
            font-size: 12px;
          }

          td {
            padding: 9px 7px;
            border-bottom: 1px solid #ddd;
            font-size: 12px;
            vertical-align: middle;
            overflow-wrap: anywhere;
          }

          th:nth-child(1),
          td:nth-child(1) {
            width: 20%;
          }

          th:nth-child(2),
          td:nth-child(2) {
            width: 38%;
          }

          th:nth-child(3),
          td:nth-child(3) {
            width: 9%;
          }

          th:nth-child(4),
          td:nth-child(4) {
            width: 15%;
          }

          th:nth-child(5),
          td:nth-child(5) {
            width: 18%;
          }

          /* =================================================
             PRODUCT IMAGE
          ================================================= */

          .product-image {
            width: 105px;
            height: 125px;
            object-fit: cover;
            border-radius: 6px;
            border: 1px solid #ddd;
            display: block;
            margin: 0 auto;
          }

          /* =================================================
             SUMMARY
          ================================================= */

          .summary {
            width: 320px;
            max-width: 100%;
            margin-left: auto;
            margin-top: 20px;
          }

          .summary-row {
            display: flex;
            justify-content: space-between;
            gap: 15px;
            padding: 6px 0;
            font-size: 13px;
          }

          .grand-total {
            border-top: 2px solid #111827;
            margin-top: 7px;
            padding-top: 10px;
            font-size: 18px;
            font-weight: 800;
          }

          /* =================================================
             FOOTER
          ================================================= */

          .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #ddd;
            text-align: center;
            font-size: 12px;
            color: #666;
          }

          /* =================================================
             PAGE
          ================================================= */

          @page {
            size: A4 portrait;
            margin: 10mm;
          }

          @media print {

            html,
            body {
              width: 210mm;
              min-height: 297mm;
              margin: 0;
              padding: 0;
              background: #fff;
            }

            .invoice {
              width: 190mm;
              max-width: 190mm;
              margin: 0 auto;
            }

            .product-image {
              width: 105px;
              height: 125px;
            }

            table {
              width: 100%;
            }

            .barcode-section {
              page-break-inside: avoid;
            }

          }

        </style>

      </head>

      <body>

        <div class="invoice">

          <!-- =================================================
               BRAND
          ================================================= -->

          <div class="brand">

            <div class="brand-name">
              SANVEE'S
            </div>

            <div class="brand-subtitle">
              by Tony
            </div>

            <div class="invoice-title">
              ORDER INVOICE
            </div>

          </div>

          <!-- =================================================
               ORDER + CUSTOMER
          ================================================= -->

          <div class="invoice-meta">

            <!-- ORDER BOX -->

            <div class="box">

              <div class="box-title">
                Order Number
              </div>

              <strong>
                ${
                  selectedOrder.order_number ||
                  "—"
                }
              </strong>

              <!-- =================================================
                   BARCODE
              ================================================= -->

              ${
                barcodeHtml
                  ? `
                    <div class="barcode-section">

                      ${barcodeHtml}

                      <div class="barcode-label">
                        Order Barcode
                      </div>

                    </div>
                  `
                  : ""
              }

              <div
                style="
                  margin-top:10px;
                  font-size:13px;
                "
              >

                <strong>
                  Date & Time:
                </strong>

                <br />

                ${formatDate(
                  selectedOrder.created_at
                )}

              </div>

              <div
                style="
                  margin-top:10px;
                  font-size:13px;
                  color:#555;
                "
              >

                <strong>
                  Created By:
                </strong>

                <br />

                ${
                  selectedOrder.created_by_name ||
                  "—"
                }

              </div>

            </div>

            <!-- CUSTOMER BOX -->

            <div class="box">

              <div class="box-title">
                Customer
              </div>

              <strong>
                ${
                  selectedOrder.customer_name ||
                  "—"
                }
              </strong>

              <div
                style="
                  margin-top:8px;
                  font-size:13px;
                "
              >
                📱 ${
                  selectedOrder.customer_phone ||
                  "—"
                }
              </div>

              <div
                style="
                  margin-top:6px;
                  font-size:13px;
                  line-height:1.5;
                "
              >
                📍 ${
                  selectedOrder.customer_address ||
                  "—"
                }
              </div>

            </div>

          </div>

          <!-- =================================================
               PRODUCTS TABLE
          ================================================= -->

          <table>

            <thead>

              <tr>

                <th>
                  Image
                </th>

                <th>
                  Product
                </th>

                <th
                  style="
                    text-align:center;
                  "
                >
                  Qty
                </th>

                <th
                  style="
                    text-align:right;
                  "
                >
                  Price
                </th>

                <th
                  style="
                    text-align:right;
                  "
                >
                  Total
                </th>

              </tr>

            </thead>

            <tbody>

              ${
                itemsHtml ||
                `
                  <tr>

                    <td
                      colspan="5"
                      style="
                        padding:25px;
                        text-align:center;
                        color:#777;
                      "
                    >
                      No products found.
                    </td>

                  </tr>
                `
              }

            </tbody>

          </table>

          <!-- =================================================
               SUMMARY
          ================================================= -->

          <div class="summary">

            <div class="summary-row">

              <span>
                Subtotal
              </span>

              <strong>
                ৳${Number(
                  selectedOrder.subtotal || 0
                ).toLocaleString()}
              </strong>

            </div>

            <div class="summary-row">

              <span>
                Delivery Charge
              </span>

              <strong>

                ${
                  Number(
                    selectedOrder.delivery_charge ||
                      0
                  ) === 0
                    ? "Free"
                    : `৳${Number(
                        selectedOrder.delivery_charge ||
                          0
                      ).toLocaleString()}`
                }

              </strong>

            </div>

            <div
              class="summary-row grand-total"
            >

              <span>
                TOTAL
              </span>

              <span>
                ৳${Number(
                  selectedOrder.total_amount || 0
                ).toLocaleString()}
              </span>

            </div>

          </div>

          <!-- =================================================
               FOOTER
          ================================================= -->

          <div class="footer">

            Thank you for shopping with
            <strong>Sanvee's</strong>

            <br />

            We appreciate your business.

          </div>

        </div>

        <script>

          window.onload = function () {

            setTimeout(function () {

              window.print();

            }, 500);

          };

        </script>

      </body>

    </html>
  `);

  invoiceWindow.document.close();
};

// =====================================================
// EDIT ORDER TOTALS
// =====================================================

const editOrderSubtotal = editOrderItems.reduce(
  (total, item) =>
    total +
    Number(item.total_price || 0),
  0
);

const editOrderTotal =
  editOrderSubtotal +
  Number(editOrderDeliveryCharge || 0);

  // =========================================================
// LOAD USER ROLE
// =========================================================

useEffect(() => {
  if (!session?.user?.id) return;

  const loadUserRole = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .maybeSingle();

    if (error) {
      console.error("Role load error:", error);
      return;
    }

    if (!data) {
      console.error(
        "Role load error: এই user-এর profiles row পাওয়া যায়নি।"
      );
      return;
    }

    const role = String(data.role || "")
      .trim()
      .toLowerCase();

    console.log("USER ROLE FROM DATABASE:", data.role);
    console.log("NORMALIZED USER ROLE:", role);

    setUserRole(role);
  };

  loadUserRole();
}, [session]);
// =====================================================
// PRODUCTS AVAILABLE FOR EXISTING ORDER
// =====================================================

const addOrderProductResults = products
  .filter((product) => {
    const search =
      addOrderProductSearch
        .trim()
        .toLowerCase();

    if (!search) return true;

    return (
      String(product.name || "")
        .toLowerCase()
        .includes(search) ||
      String(product.color || "")
        .toLowerCase()
        .includes(search)
    );
  })
  .slice(0, 10);
  // =====================================================
// ADD PRODUCT INTO EXISTING ORDER
// =====================================================

const addProductToExistingOrder = (product) => {
  if (!isOwner && !isAdmin) {
    alert(
      "শুধু Owner এবং Admin existing order edit করতে পারবেন।"
    );
    return;
  }

  if (!product?.id) return;

  setEditOrderItems((currentItems) => {
    const existingItem = currentItems.find(
      (item) =>
        item.product_id === product.id &&
        item.color === (product.color || "")
    );

    if (existingItem) {
      return currentItems.map((item) => {
        if (item.id !== existingItem.id) {
          return item;
        }

        const newQuantity =
          Number(item.quantity || 0) + 1;

        return {
          ...item,
          quantity: newQuantity,
          total_price:
            newQuantity *
            Number(item.unit_price || 0),
        };
      });
    }

    const newItem = {
      id: `new-${product.id}-${Date.now()}`,
      product_id: product.id,
      product_name: product.name || "Product",
      product_image_url: product.image_url || null,
      color: product.color || "",
      size: product.size || "",
      quantity: 1,
      unit_price: Number(product.price || 0),
      total_price: Number(product.price || 0),
      isNew: true,
    };

    return [...currentItems, newItem];
  });

  setAddOrderProductSearch("");
  setAddOrderProductOpen(false);
};

  // =========================================================
  // LOAD PRODUCTS AFTER ROLE
  // =========================================================

  useEffect(() => {
    if (!session?.user?.id) return;

    if (userRole) {
      loadProducts();
    }
  }, [session, userRole]);

  // =========================================================
  // INPUT CHANGE
  // =========================================================

  const handleChange = (e) => {
    setProduct((currentProduct) => ({
      ...currentProduct,
      [e.target.name]: e.target.value,
    }));
  };

  // =========================================================
  // IMAGE SELECT
  // =========================================================

  const handleImage = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setProduct((currentProduct) => ({
      ...currentProduct,
      image: file,
      imagePreview: URL.createObjectURL(file),
    }));
  };
  const addMainSize = () => {
  setProduct((currentProduct) => ({
    ...currentProduct,
    sizes: [
      ...(Array.isArray(currentProduct.sizes)
        ? currentProduct.sizes
        : []),
      {
        size: "",
        stock: "",
      },
    ],
  }));
};
const removeMainSize = (index) => {
  setProduct((currentProduct) => ({
    ...currentProduct,
    sizes: currentProduct.sizes.filter(
      (_, sizeIndex) => sizeIndex !== index
    ),
  }));
};
const handleMainSizeChange = (
  index,
  field,
  value
) => {
  setProduct((currentProduct) => ({
    ...currentProduct,
    sizes: currentProduct.sizes.map(
      (sizeItem, sizeIndex) =>
        sizeIndex === index
          ? {
              ...sizeItem,
              [field]: value,
            }
          : sizeItem
    ),
  }));
};

  // =========================================================
  // SEARCH IMAGE SELECT
  // =========================================================

  const handleSearchImage = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setSearchImage(file);

    setSearchImagePreview(URL.createObjectURL(file));
  };

  // =========================================================
  // PASTE IMAGE
  // =========================================================

  const handlePasteImage = (e) => {
    const items = e.clipboardData?.items;

    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();

        if (file) {
          setSearchImage(file);

          setSearchImagePreview(
            URL.createObjectURL(file)
          );
        }

        break;
      }
    }
  };

  // =========================================================
  // EDIT PRODUCT
  // =========================================================

  const editProduct = (productItem) => {
    if (!canManageProducts) {
      alert("আপনার এই কাজ করার permission নেই।");
      return;
    }

    setEditingProductId(productItem.id);

    let variants = [];

    try {
      if (Array.isArray(productItem.color_variants)) {
        variants = productItem.color_variants.map(
  (variant) => ({
    color: variant.color || "",
    image: null,
    imagePreview:
      variant.image_url || "",
    image_url:
      variant.image_url || "",

    sizes: Array.isArray(
      variant.sizes
    )
      ? variant.sizes.map(
          (sizeItem) => ({
            size:
              sizeItem.size || "",

            stock:
              sizeItem.stock === null ||
              sizeItem.stock === undefined
                ? ""
                : sizeItem.stock,
          })
        )
      : [],
  })
);
      }
    } catch (error) {
      console.error("Color variants load error:", error);

      variants = [];
    }

    setProduct({
      name: productItem.name || "",
      price: productItem.price || "",
      buying_price: productItem.buying_price || "",
      color: productItem.color || "",
      stock:
  productItem.stock === null ||
  productItem.stock === undefined
    ? ""
    : productItem.stock,
      sizes: Array.isArray(productItem.sizes)
  ? productItem.sizes.map((sizeItem) => ({
      size: sizeItem.size || "",
      stock:
        sizeItem.stock === null ||
        sizeItem.stock === undefined
          ? ""
          : sizeItem.stock,
    }))
  : [],
      details: productItem.details || "",
      image: null,
      imagePreview: productItem.image_url || "",
      color_variants: variants,
    });

    setEditModalOpen(true);
  };
  // =========================================================
// EDIT PRODUCT FROM PRODUCT HISTORY
// =========================================================

const editProductFromHistory = async (historyItem) => {
  if (!canManageProducts) {
    alert("আপনার এই কাজ করার permission নেই।");
    return;
  }

  if (!historyItem?.product_id) {
    alert("এই history record-এর product পাওয়া যাচ্ছে না।");
    return;
  }

  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", historyItem.product_id)
      .single();

    if (error || !data) {
      alert(
        "Product আর পাওয়া যাচ্ছে না। সম্ভবত delete করা হয়েছে।"
      );
      return;
    }

    // Existing Edit Product UI open হবে
    editProduct(data);
  } catch (error) {
    console.error(
      "History product edit load error:",
      error
    );

    alert(
      "Product edit করার জন্য load করা যায়নি."
    );
  }
};

  // =========================================================
// UPLOAD VARIANT IMAGES — FAST
// =========================================================

// =========================================================
// UPLOAD VARIANT IMAGES + SIZE STOCK
// =========================================================

const uploadColorVariantImages = async (
  variants,
  uploadedPaths = [],
  category = ""
) => {
  const uploadPromises = variants.map(
    async (variant, i) => {
      if (!variant.color?.trim()) {
        throw new Error(
          `Color Variant ${i + 1}-এ Color দিন।`
        );
      }

      let imageUrl =
        variant.image_url || "";

      // =====================================================
      // UPLOAD IMAGE
      // =====================================================

      if (variant.image) {
        const file = variant.image;

        const fileExt =
          file.name.split(".").pop();

        const fileName =
          Date.now() +
          "-variant-" +
          i +
          "-" +
          Math.random()
            .toString(36)
            .substring(2) +
          "." +
          fileExt;

        const filePath = fileName;

        const {
          error: uploadError,
        } = await supabase.storage
          .from("product-images")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }

        uploadedPaths.push(filePath);

        const {
          data: publicUrlData,
        } = supabase.storage
          .from("product-images")
          .getPublicUrl(filePath);

        imageUrl =
          publicUrlData.publicUrl;
      }

      // =====================================================
      // NORMALIZED COLOR
      // =====================================================

      const normalizedColor =
        variant.color
          .trim()
          .toLowerCase();

      // =====================================================
// SIZE + STOCK
// SAREE → ONLY STOCK
// DRESS → SIZE + STOCK
// =====================================================

const isSaree =
  category?.trim().toLowerCase() === "saree";

let sizes = [];
let stock = null;

if (isSaree) {
  // =====================================================
  // SAREE VARIANT → ONLY STOCK
  // =====================================================

  stock =
    variant.stock === "" ||
    variant.stock === null ||
    variant.stock === undefined
      ? 0
      : Number(variant.stock);

} else {
  // =====================================================
  // DRESS VARIANT → SIZE + STOCK
  // =====================================================

  sizes = Array.isArray(variant.sizes)
    ? variant.sizes
        .map((sizeItem) => ({
          size: String(
            sizeItem.size || ""
          ).trim(),

          stock:
            sizeItem.stock === "" ||
            sizeItem.stock === null ||
            sizeItem.stock === undefined
              ? 0
              : Number(sizeItem.stock),
        }))
        .filter(
          (sizeItem) =>
            sizeItem.size
        )
    : [];
}

      // =====================================================
      // FINAL COLOR VARIANT
      // =====================================================

      return {
  color:
    variant.color.trim(),

  normalized_color:
    normalizedColor,

  image_url:
    imageUrl || null,

  stock,

  sizes,
};
    }
  );

  // =========================================================
  // RETURN ALL VARIANTS
  // =========================================================

  return await Promise.all(
    uploadPromises
  );
};

  // =========================================================
  // ADD PRODUCT
  // =========================================================

  const addProduct = async () => {
    if (!canManageProducts) {
      alert("আপনার product add করার permission নেই।");
      return;
    }

    if (
  !product.name ||
  !product.price ||
  !product.category ||
  !product.image
) {
  alert("Product Name, Price, Category এবং Image দিন।");
  return;
}
// =========================================================
// STOCK VALIDATION
// DRESS → Sizes & Stock
// SAREE → Only Stock
// =========================================================

if (product.category === "saree") {
  // Saree-এর জন্য শুধু Stock লাগবে
  if (
    product.stock === "" ||
    product.stock === null ||
    product.stock === undefined
  ) {
    alert("Saree-এর Stock দিন।");
    return;
  }
} else {
  // Dress-এর জন্য Sizes & Stock লাগবে
  if (!product.sizes || product.sizes.length === 0) {
    alert("কমপক্ষে একটি Main Color Size এবং Stock দিন।");
    return;
  }

  const invalidMainSize = product.sizes.some(
    (item) =>
      !item.size?.trim() ||
      item.stock === "" ||
      item.stock === null ||
      item.stock === undefined
  );

  if (invalidMainSize) {
    alert("প্রতিটি Main Color Size-এর জন্য Stock দিন।");
    return;
  }
}

    try {
      setSaving(true);

      const uploadedPaths = [];

      const file = product.image;

      const fileExt = file.name.split(".").pop();

      const fileName =
        Date.now() +
        "-" +
        Math.random()
          .toString(36)
          .substring(2) +
        "." +
        fileExt;

      const filePath = fileName;

      const {
        error: uploadError,
      } = await supabase.storage
        .from("product-images")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Image upload error:", uploadError);

        alert("Image upload করা যায়নি.");

        return;
      }

      uploadedPaths.push(filePath);

      const {
        data: publicUrlData,
      } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);

      const imageUrl = publicUrlData.publicUrl;

      const colorVariants =
  await uploadColorVariantImages(
    product.color_variants,
    uploadedPaths,
    product.category
  );

      const { data, error: insertError } =
        await supabase
          .from("products")
          .insert([
  {
    name: product.name.trim(),

    price: Number(product.price),

    buying_price:
      product.buying_price === ""
        ? null
        : Number(product.buying_price),

    // =====================================================
    // CATEGORY
    // =====================================================

    category:
      product.category?.trim().toLowerCase() || null,
      stock:
  product.category === "saree"
    ? Number(product.stock || 0)
    : null,

    // =====================================================
    // MAIN COLOR
    // Existing color remains untouched
    // =====================================================

    color:
      product.color.trim() || null,

    // =====================================================
    // NORMALIZED COLOR
    // Used for filtering/searching
    // =====================================================

    normalized_color:
      product.color?.trim().toLowerCase() || null,

    sizes:
  product.category?.trim().toLowerCase() === "saree"
    ? []
    : Array.isArray(product.sizes)
      ? product.sizes
          .filter(
            (item) =>
              item.size?.trim() !== ""
          )
          .map((item) => ({
            size: item.size.trim(),
            stock:
              item.stock === ""
                ? 0
                : Number(item.stock),
          }))
      : [],

    details:
      product.details.trim() || null,

    image_url: imageUrl,

    color_variants: colorVariants,
  },
])

          .select()
          .single();

      if (insertError) {
        console.error(
          "Product insert error:",
          insertError
        );
        if (insertError) {
  console.error(
    "Product insert error:",
    insertError
  );

  console.error(
    "Product insert error JSON:",
    JSON.stringify(insertError, null, 2)
  );

  console.error(
    "Product being inserted:",
    JSON.stringify(
      {
        ...data,
        sizes: product.sizes,
      },
      null,
      2
    )
  );

  await supabase.storage
    .from("product-images")
    .remove(uploadedPaths);

  alert("Product save করা যায়নি.");

  return;
}

        await supabase.storage
          .from("product-images")
          .remove(uploadedPaths);

        alert("Product save করা যায়নি.");

        return;
      }

      setProducts((currentProducts) => [
        data,
        ...currentProducts,
      ]);
      // =========================================================
// PRODUCT HISTORY — PRODUCT ADDED
// =========================================================

try {
  const {
    data: {
      user: currentUser,
    },
  } = await supabase.auth.getUser();

  if (currentUser) {
    const {
      data: currentProfile,
    } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", currentUser.id)
      .single();

    const { error: historyError } =
      await supabase
        .from("product_history")
        .insert([
          {
            user_id: currentUser.id,
            user_email: currentUser.email || "",
            user_name:
              currentProfile?.full_name || "",
            user_role:
              currentProfile?.role || "",
            action: "product_added",
            product_id: data.id,
            product_name: data.name,
            product_image_url: imageUrl || null,
            old_value: null,
            new_value: `Price: ${data.price}, Stock: ${
              data.stock ?? "N/A"
            }`,
          },
        ]);

    if (historyError) {
      console.error(
        "Product history insert error:",
        historyError
      );
    }
  }
} catch (historyError) {
  console.error(
    "Product history unexpected error:",
    historyError
  );
}
      // =========================================================
// AUTOMATIC AI VISUAL INDEXING
// RUN IN BACKGROUND
// =========================================================

fetch(
  "https://sanvees-product-system.sanvee-products-system.workers.dev/api/index-products?offset=0&limit=5",
  {
    method: "POST",
  }
)
  .then(async (response) => {
    const result = await response.json();

    console.log(
      "🟢 AI INDEX RESULT:",
      result
    );

    if (!response.ok || !result.success) {
      console.error(
        "AI visual indexing failed:",
        result
      );
    } else {
      console.log(
        "✅ AI visual indexing completed.",
        result
      );
    }
  })
  .catch((error) => {
    console.error(
      "Automatic AI indexing error:",
      error
    );
  });

      resetProductForm();

      alert("Product successfully saved! ✅");

      setActiveMenu("products");
      setProductsOpen(true);
    } catch (error) {
      console.error("Unexpected error:", error);

      alert(
        error?.message ||
          "একটি সমস্যা হয়েছে। আবার চেষ্টা করুন।"
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
// PRODUCT TOTAL STOCK
// SAREE → product.stock
// DRESS → sizes stock
// =========================================================

const getProductTotalStock = (productItem) => {
  if (
    productItem?.category?.trim().toLowerCase() === "saree"
  ) {
    return Number(productItem.stock || 0);
  }

  if (Array.isArray(productItem?.sizes)) {
    return productItem.sizes.reduce(
      (total, item) =>
        total + Number(item.stock || 0),
      0
    );
  }

  return 0;
};
  // =========================================================
  // UPDATE PRODUCT
  // =========================================================

  const updateProduct = async () => {
  if (!canManageProducts) {
    alert("আপনার product update করার permission নেই।");
    return false;
  }

  try {
    setSaving(true);

    const oldProduct = products.find(
      (item) => item.id === editingProductId
    );

    if (!oldProduct) {
      alert("Product পাওয়া যায়নি।");
      return false;
    }

    if (!product.name || !product.price) {
      alert("Product Name এবং Selling Price দিন।");
      return false;
    }

    if (!product.category) {
      alert("Product Category নির্বাচন করুন।");
      return false;
    }

    const uploadedPaths = [];

    const colorVariants =
  await uploadColorVariantImages(
    product.color_variants,
    uploadedPaths,
    product.category
  );

    // =====================================================
    // NORMALIZED COLOR
    // =====================================================

    const normalizedColor =
      (product.color || "")
        .trim()
        .toLowerCase();

    // =====================================================
    // UPDATE PRODUCT
    // =====================================================

    const { data, error } =
      await supabase
        .from("products")
        .update({
          name: product.name.trim(),

          price: Number(product.price),

          buying_price:
            product.buying_price === ""
              ? null
              : Number(product.buying_price),

          // Existing color unchanged
          color:
            product.color.trim() || null,

          // New category
          category:
  product.category?.trim().toLowerCase() || null,

stock:
  product.category?.trim().toLowerCase() === "saree"
    ? Number(product.stock || 0)
    : null,

normalized_color:
  normalizedColor || null,

sizes:
  product.category?.trim().toLowerCase() === "saree"
    ? []
    : Array.isArray(product.sizes)
      ? product.sizes
          .filter(
            (item) =>
              item.size?.trim() !== ""
          )
          .map((item) => ({
            size: item.size.trim(),
            stock:
              item.stock === ""
                ? 0
                : Number(item.stock),
          }))
      : [],

          details:
            product.details.trim() || null,

          color_variants: colorVariants,
        })
        .eq("id", editingProductId)
        .select()
        .single();

    if (error) {
      console.error(
        "Product update error:",
        error
      );

      if (uploadedPaths.length > 0) {
        await supabase.storage
          .from("product-images")
          .remove(uploadedPaths);
      }

      alert("Product update করা যায়নি.");

      return false;
    }

    // =====================================================
    // DELETE OLD VARIANT IMAGES THAT ARE NO LONGER USED
    // =====================================================

    if (
      oldProduct &&
      Array.isArray(oldProduct.color_variants)
    ) {
      const newUrls = colorVariants
        .map((item) => item.image_url)
        .filter(Boolean);

      const oldUrls = oldProduct.color_variants
        .map((item) => item.image_url)
        .filter(Boolean);

      const marker =
        "/storage/v1/object/public/product-images/";

      const filesToDelete = oldUrls
        .filter(
          (url) => !newUrls.includes(url)
        )
        .map((url) => {
          if (url.includes(marker)) {
            return url.split(marker)[1];
          }

          return null;
        })
        .filter(Boolean);

      if (filesToDelete.length > 0) {
        await supabase.storage
          .from("product-images")
          .remove(filesToDelete);
      }
    }

    // =========================================================
// PRODUCT HISTORY — PRICE / STOCK CHANGES
// =========================================================

try {
  const {
    data: {
      user: currentUser,
    },
  } = await supabase.auth.getUser();

  if (currentUser) {
    const {
      data: currentProfile,
    } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", currentUser.id)
      .single();

    const historyRecords = [];

    // =====================================================
    // PRICE CHANGE
    // =====================================================

    const oldPrice = Number(oldProduct.price);
    const newPrice = Number(data.price);

    if (oldPrice !== newPrice) {
      historyRecords.push({
        user_id: currentUser.id,
        user_email: currentUser.email || "",
        user_name:
          currentProfile?.full_name || "",
        user_role:
          currentProfile?.role || "",
        action: "price_changed",
        product_id: data.id,
        product_name: data.name,
        product_image_url: data.image_url || null,
        old_value: String(oldProduct.price ?? ""),
        new_value: String(data.price ?? ""),
      });
    }

    // =====================================================
    // STOCK CHANGE
    // =====================================================

    const oldStock =
      oldProduct.stock === null ||
      oldProduct.stock === ""
        ? null
        : Number(oldProduct.stock);

    const newStock =
      data.stock === null ||
      data.stock === ""
        ? null
        : Number(data.stock);

    if (oldStock !== newStock) {
      historyRecords.push({
        user_id: currentUser.id,
        user_email: currentUser.email || "",
        user_name:
          currentProfile?.full_name || "",
        user_role:
          currentProfile?.role || "",
        action: "stock_changed",
        product_id: data.id,
        product_name: data.name,
        product_image_url: data.image_url || null,
        old_value:
          oldStock === null
            ? "N/A"
            : String(oldStock),
        new_value:
          newStock === null
            ? "N/A"
            : String(newStock),
      });
    }

    // =====================================================
    // INSERT HISTORY RECORDS
    // =====================================================

    if (historyRecords.length > 0) {
      const {
        error: historyError,
      } = await supabase
        .from("product_history")
        .insert(historyRecords);

      if (historyError) {
        console.error(
          "Product history insert error:",
          historyError
        );
      }
    }
  }
} catch (historyError) {
  console.error(
    "Product history unexpected error:",
    historyError
  );
}
    // =====================================================
    // UPDATE FRONTEND PRODUCT LIST
    // =====================================================

    setProducts((currentProducts) =>
      currentProducts.map((item) =>
        item.id === editingProductId
          ? data
          : item
      )
    );

    resetProductForm();

    alert("Product updated successfully! ✅");

    return true;
  } catch (error) {
    console.error(
      "Unexpected update error:",
      error
    );

    alert(
      error?.message ||
        "Product update করার সময় সমস্যা হয়েছে."
    );

    return false;
  } finally {
    setSaving(false);
  }
};

  // =========================================================
  // DELETE PRODUCT
  // =========================================================

  const deleteProduct = async (productItem) => {
    if (!canManageProducts) {
      alert("আপনার product delete করার permission নেই।");
      return;
    }

    const confirmDelete = window.confirm(
      `"${productItem.name}" delete করতে চান?`
    );

    if (!confirmDelete) return;

    try {
      // =========================================================
// PRODUCT HISTORY — PRODUCT DELETED
// =========================================================

try {
  const {
    data: {
      user: currentUser,
    },
  } = await supabase.auth.getUser();

  if (currentUser) {
    const {
      data: currentProfile,
    } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", currentUser.id)
      .single();

    const { error: historyError } =
      await supabase
        .from("product_history")
        .insert([
          {
            user_id: currentUser.id,
            user_email: currentUser.email || "",
            user_name:
              currentProfile?.full_name || "",
            user_role:
              currentProfile?.role || "",
            action: "product_deleted",
            product_id: productItem.id,
            product_name: productItem.name,
            product_image_url: productItem.image_url || null,
            old_value: `Price: ${
              productItem.price ?? "N/A"
            }, Stock: ${
              productItem.stock ?? "N/A"
            }`,
            new_value: null,
          },
        ]);

    if (historyError) {
      console.error(
        "Product delete history insert error:",
        historyError
      );
    }
  }
} catch (historyError) {
  console.error(
    "Product delete history unexpected error:",
    historyError
  );
}
      const {
        error: deleteError,
      } = await supabase
        .from("products")
        .delete()
        .eq("id", productItem.id);

      if (deleteError) {
        console.error(
          "Delete product error:",
          deleteError
        );

        alert("Product delete করা যায়নি.");

        return;
      }

      const filesToDelete = [];

      const marker =
        "/storage/v1/object/public/product-images/";

      // Main image
      if (
        productItem.image_url &&
        productItem.image_url.includes(marker)
      ) {
        const filePath =
          productItem.image_url.split(marker)[1];

        if (filePath) {
          filesToDelete.push(filePath);
        }
      }

      // Variant images
      if (
        Array.isArray(
          productItem.color_variants
        )
      ) {
        productItem.color_variants.forEach(
          (variant) => {
            if (
              variant.image_url &&
              variant.image_url.includes(marker)
            ) {
              const filePath =
                variant.image_url.split(marker)[1];

              if (filePath) {
                filesToDelete.push(filePath);
              }
            }
          }
        );
      }

      if (filesToDelete.length > 0) {
        try {
          await supabase.storage
            .from("product-images")
            .remove(filesToDelete);
        } catch (storageError) {
          console.error(
            "Storage image delete error:",
            storageError
          );
        }
      }

      setProducts((currentProducts) =>
        currentProducts.filter(
          (item) => item.id !== productItem.id
        )
      );

      alert("Product deleted successfully. ✅");
    } catch (error) {
      console.error(
        "Unexpected delete error:",
        error
      );

      alert(
        "Product delete করার সময় সমস্যা হয়েছে."
      );
    }
  };

// =========================================================
// IMAGE SEARCH - EXACT PRODUCT ONLY
// =========================================================

const searchByImage = async () => {
  if (!searchImage) {
    alert("আগে একটি Dress Image select করুন।");
    return;
  }

  try {
    setEmbeddingLoading(true);

    // =====================================================
    // NEW SEARCH RESET
    // =====================================================

    setImageSearchDone(false);
    setImageSearchMode("all");

    setExactSearchProducts([]);
    setSimilarSearchProducts([]);
    setCategoryColorProducts([]);
    setCategoryColorPage(1);

    // =====================================================
    // SELECTED CATEGORY + COLOR
    // =====================================================

    const selectedCategory = String(
      categoryFilter || "all"
    )
      .trim()
      .toLowerCase();

    const selectedColor = String(
      colorFilter || "all"
    )
      .trim()
      .toLowerCase();

    // =====================================================
    // COLOR MATCH HELPER
    //
    // Main Color অথবা Color Variant
    // যেকোনোটার সাথে selected color মিললেই TRUE
    // =====================================================

    const getMatchedColorData = (product) => {
      const mainColor = String(
        product.color || ""
      )
        .trim()
        .toLowerCase();

      // -----------------------------------------------------
      // MAIN COLOR MATCH
      // -----------------------------------------------------

      if (
        selectedColor !== "all" &&
        mainColor === selectedColor
      ) {
        return {
          matched: true,
          color: product.color,
          image: product.image_url,
          type: "main",
        };
      }

      // -----------------------------------------------------
      // COLOR VARIANT MATCH
      // -----------------------------------------------------

      const variants = Array.isArray(
        product.color_variants
      )
        ? product.color_variants
        : [];

      const matchedVariant = variants.find(
        (variant) => {
          const variantColor = String(
            variant?.color || ""
          )
            .trim()
            .toLowerCase();

          const normalizedVariantColor = String(
            variant?.normalized_color || ""
          )
            .trim()
            .toLowerCase();

          return (
            variantColor === selectedColor ||
            normalizedVariantColor === selectedColor
          );
        }
      );

      if (matchedVariant) {
        return {
          matched: true,
          color: matchedVariant.color,
          image:
            matchedVariant.image_url ||
            product.image_url,
          type: "variant",
        };
      }

      // -----------------------------------------------------
      // NO COLOR FILTER
      // -----------------------------------------------------

      if (selectedColor === "all") {
        return {
          matched: true,
          color: product.color || "",
          image: product.image_url,
          type: "main",
        };
      }

      return {
        matched: false,
        color: "",
        image: product.image_url,
        type: null,
      };
    };

    // =====================================================
    // CATEGORY + COLOR PRODUCT FILTER
    // =====================================================

    const filterProduct = (product) => {
      const productCategory = String(
        product.category || ""
      )
        .trim()
        .toLowerCase();

      const categoryOK =
        selectedCategory === "all" ||
        productCategory === selectedCategory;

      if (!categoryOK) {
        return false;
      }

      const colorData =
        getMatchedColorData(product);

      return colorData.matched;
    };

    // =====================================================
    // SEND IMAGE TO AI
    // =====================================================

    const formData = new FormData();

    formData.append(
      "image",
      searchImage
    );
    formData.append("category", selectedCategory);

    formData.append("color", selectedColor);

    const response = await fetch(
      "https://sanvees-product-system.sanvee-products-system.workers.dev/api/visual-search",
      {
        method: "POST",
        body: formData,
      }
    );

    const result =
      await response.json();

    console.log(
      "AI VISUAL SEARCH RESULT:",
      result
    );

    if (
      !response.ok ||
      !result.success
    ) {
      throw new Error(
        result.error ||
        "AI visual search failed."
      );
    }

    // =====================================================
    // EXACT MATCHES
    // =====================================================

    const exactMatches =
      result.exact_matches || [];

    // =====================================================
    // SIMILAR MATCHES
    // =====================================================

    const similarMatches =
      result.similar_matches || [];
      // =====================================================
// CATEGORY + COLOR FALLBACK MATCHES
// =====================================================

const categoryColorMatches =
  result.category_color_matches || [];

console.log(
  "CATEGORY + COLOR MATCHES:",
  categoryColorMatches
);

    console.log(
      "EXACT MATCHES:",
      exactMatches
    );

    console.log(
      "SIMILAR MATCHES:",
      similarMatches
    );

    // =====================================================
    // GET PRODUCT IDS
    // =====================================================

    const exactIds =
      exactMatches
        .map(
          (item) =>
            item.metadata?.product_id ||
            item.id
        )
        .filter(Boolean);

    const similarIds =
      similarMatches
        .map(
          (item) =>
            item.metadata?.product_id ||
            item.id
        )
        .filter(Boolean);
        // =====================================================
// CATEGORY + COLOR FALLBACK PRODUCT IDS
// =====================================================

const categoryColorIds =
  categoryColorMatches
    .map(
      (item) =>
        item.metadata?.product_id ||
        item.id
    )
    .filter(Boolean);

console.log(
  "CATEGORY + COLOR PRODUCT IDS:",
  categoryColorIds
);

    // =====================================================
    // FETCH EXACT PRODUCTS
    // =====================================================

    let exactProducts = [];

    if (exactIds.length > 0) {
      const {
        data,
        error,
      } = await supabase
        .from("products")
        .select("*")
        .in("id", exactIds);

      if (error) {
        console.error(
          "Exact products fetch error:",
          error
        );
      } else {
        exactProducts = data || [];
      }
    }

    // =====================================================
// FETCH SIMILAR PRODUCTS
// =====================================================

let similarProducts = [];

if (similarIds.length > 0) {
  const {
    data,
    error,
  } = await supabase
    .from("products")
    .select("*")
    .in("id", similarIds);

  if (error) {
    console.error(
      "Similar products fetch error:",
      error
    );
  } else {
    similarProducts = data || [];
  }
}

// =====================================================
// FETCH CATEGORY + COLOR FALLBACK PRODUCTS
// =====================================================

let categoryColorProducts = [];

if (categoryColorIds.length > 0) {
  const {
    data,
    error,
  } = await supabase
    .from("products")
    .select("*")
    .in("id", categoryColorIds);

  if (error) {
    console.error(
      "Category + Color products fetch error:",
      error
    );
  } else {
    categoryColorProducts = data || [];
  }
}

console.log(
  "CATEGORY + COLOR PRODUCTS:",
  categoryColorProducts
);

// =====================================================
// ADD MATCHED COLOR + IMAGE TO CATEGORY + COLOR PRODUCTS
// =====================================================

const preparedCategoryColorProducts =
  categoryColorProducts.map((product) => {

    const colorData =
      getMatchedColorData(product);

    return {
      ...product,

      searchMatchedColor:
        colorData.color,

      searchMatchedImage:
        colorData.image,

      searchMatchedColorType:
        colorData.type,

      search_type:
        "category_color",
    };
  });

console.log(
  "PREPARED CATEGORY + COLOR PRODUCTS:",
  preparedCategoryColorProducts
);

// =====================================================
// KEEP AI SCORE
// =====================================================

    exactProducts =
      exactProducts.map((product) => {
        const match =
          exactMatches.find(
            (item) =>
              (
                item.metadata?.product_id ||
                item.id
              ) === product.id
          );

        const colorData =
          getMatchedColorData(product);

        return {
          ...product,

          similarity_score:
            match?.score || 0,

          combined_score:
            match?.combined_score || 0,

          search_type: "exact",

          // IMPORTANT:
          // matched color/image save করছি
          searchMatchedColor:
            colorData.color,

          searchMatchedImage:
            colorData.image,

          searchMatchedColorType:
            colorData.type,
        };
      });

    similarProducts =
      similarProducts.map((product) => {
        const match =
          similarMatches.find(
            (item) =>
              (
                item.metadata?.product_id ||
                item.id
              ) === product.id
          );

        const colorData =
          getMatchedColorData(product);

        return {
          ...product,

          similarity_score:
            match?.score || 0,

          combined_score:
            match?.combined_score || 0,

          search_type: "similar",

          // IMPORTANT:
          searchMatchedColor:
            colorData.color,

          searchMatchedImage:
            colorData.image,

          searchMatchedColorType:
            colorData.type,
        };
      });

    // =====================================================
    // FILTER EXACT
    // =====================================================

    const filteredExact =
      exactProducts.filter(
        filterProduct
      );

    // =====================================================
    // FILTER SIMILAR
    // =====================================================

    const filteredSimilar =
      similarProducts.filter(
        filterProduct
      );

    // =====================================================
    // SORT BY AI SCORE
    // BEST MATCH FIRST
    // =====================================================

    filteredExact.sort(
      (a, b) =>
        (b.combined_score || b.similarity_score || 0) -
        (a.combined_score || a.similarity_score || 0)
    );

    filteredSimilar.sort(
      (a, b) =>
        (b.combined_score || b.similarity_score || 0) -
        (a.combined_score || a.similarity_score || 0)
    );
    // =====================================================
// REMOVE EXACT + SIMILAR FROM CATEGORY + COLOR
// =====================================================

const exactProductIds = new Set(
  filteredExact.map(
    (product) => product.id
  )
);

const similarProductIds = new Set(
  filteredSimilar.map(
    (product) => product.id
  )
);

const finalCategoryColorProducts =
  preparedCategoryColorProducts.filter(
    (product) =>
      !exactProductIds.has(product.id) &&
      !similarProductIds.has(product.id)
  );

console.log(
  "FINAL CATEGORY + COLOR PRODUCTS:",
  finalCategoryColorProducts
);

    // =====================================================
    // SET RESULTS
    // =====================================================

    setExactSearchProducts(
      filteredExact
    );

    setSimilarSearchProducts(
      filteredSimilar
    );

    setCategoryColorProducts(
  finalCategoryColorProducts
);

    setCategoryColorPage(1);

    setImageSearchDone(true);

    // =====================================================
// DEFAULT SEARCH RESULT PRIORITY
// =====================================================

if (filteredExact.length > 0) {

  // 1️⃣ EXACT PRODUCT
  setImageSearchMode("exact");

} else if (
  finalCategoryColorProducts.length > 0
) {

  // 2️⃣ CATEGORY + COLOR FALLBACK
  setImageSearchMode("category_color");

} else if (
  filteredSimilar.length > 0
) {

  // 3️⃣ SIMILAR PRODUCT
  setImageSearchMode("similar");

} else {

  // 4️⃣ NOTHING FOUND
  setImageSearchMode("all");
}

    // =====================================================
    // DEBUG LOG
    // =====================================================

    console.log(
      "FINAL EXACT PRODUCTS:",
      filteredExact
    );

    console.log(
      "FINAL SIMILAR PRODUCTS:",
      filteredSimilar
    );

    console.log(
  "FINAL CATEGORY + COLOR PRODUCTS:",
  finalCategoryColorProducts
);

  } catch (error) {

    console.error(
      "AI image search error:",
      error
    );

    setExactSearchProducts([]);
    setSimilarSearchProducts([]);
    setCategoryColorProducts([]);

    setImageSearchDone(false);

    alert(
      "AI image search-এর সময় সমস্যা হয়েছে।"
    );

  } finally {

    setEmbeddingLoading(
      false
    );
  }
};


// =========================================================
// SHOW ALL PRODUCTS AGAIN
// =========================================================

const showAllProducts = async () => {
  setSearchTerm("");
  setSearchImage(null);
  setSearchImagePreview("");

  // Reset filters
  setCategoryFilter("all");
  setColorFilter("all");

  await loadProducts();
};


// =========================================================
// LOGOUT
// =========================================================

const handleLogout = async () => {
  await supabase.auth.signOut();

  setSession(null);
  setCurrentUserId(null);
  setUserRole(null);
  setUsers([]);
  setImageEmbedder(null);
  setActiveMenu("dashboard");
  setProductsOpen(false);
};


// =====================================================
// CATEGORY + COLOR OPTIONS
// =====================================================

const availableCategories = [
  ...new Set(
    products
      .map((item) => item.category)
      .filter(Boolean)
      .map((category) =>
        String(category)
          .trim()
          .toLowerCase()
      )
  ),
];


// =====================================================
// DYNAMIC COLOR OPTIONS
// Main Color + Color Variants
// =====================================================

const availableColors = [
  ...new Set(
    products
      .flatMap((item) => {

        const colors = [];

        // =================================================
        // MAIN COLOR
        // =================================================

        if (
          item.normalized_color ||
          item.color
        ) {
          colors.push(
            String(
              item.normalized_color ||
              item.color
            )
              .trim()
              .toLowerCase()
          );
        }

        // =================================================
        // COLOR VARIANTS
        // =================================================

        if (
          Array.isArray(
            item.color_variants
          )
        ) {
          item.color_variants.forEach(
            (variant) => {

              if (
                variant?.normalized_color ||
                variant?.color
              ) {
                colors.push(
                  String(
                    variant.normalized_color ||
                    variant.color
                  )
                    .trim()
                    .toLowerCase()
                );
              }

            }
          );
        }

        return colors;
      })
      .filter(Boolean)
  ),
];

// =========================================================
// NORMAL SEARCH + CATEGORY + COLOR FILTER
// =========================================================

const filteredProducts = products.filter((item) => {

  const search = searchTerm.trim().toLowerCase();

  // =======================================================
  // PRODUCT NAME
  // =======================================================

  const name =
    (item.name || "").toLowerCase();

  // =======================================================
  // PRODUCT PRICE
  // =======================================================

  const price =
    String(item.price || "").trim();

      // =======================================================
  // PRICE RANGE MATCH
  // =======================================================

  const numericPrice =
    Number(
      String(item.price || "")
        .replace(/[^\d.]/g, "")
    ) || 0;

  const min =
    minPrice === ""
      ? 0
      : Number(minPrice);

  const max =
    maxPrice === ""
      ? Infinity
      : Number(maxPrice);

  const matchesPrice =
    numericPrice >= min &&
    numericPrice <= max;

  // =======================================================
  // CATEGORY
  // =======================================================

  const productCategory =
    (item.category || "").toLowerCase();

  // =======================================================
  // CATEGORY MATCH
  // =======================================================

  const matchesCategory =
    categoryFilter === "all" ||
    productCategory ===
      categoryFilter.toLowerCase();

  // =======================================================
  // ALL PRODUCT COLORS
  //
  // Main Color + Color Variants
  // =======================================================

  const productColors = [];

  // MAIN COLOR
  if (
    item.normalized_color ||
    item.color
  ) {
    productColors.push(
      (
        item.normalized_color ||
        item.color ||
        ""
      )
        .trim()
        .toLowerCase()
    );
  }

  // COLOR VARIANTS
  if (
    Array.isArray(item.color_variants)
  ) {
    item.color_variants.forEach(
      (variant) => {

        if (
          variant?.normalized_color ||
          variant?.color
        ) {
          productColors.push(
            (
              variant.normalized_color ||
              variant.color ||
              ""
            )
              .trim()
              .toLowerCase()
          );
        }

      }
    );
  }

  // =======================================================
  // COLOR MATCH
  //
  // Main Color অথবা Color Variant-এর যেকোনো একটিতে
  // selected color থাকলেই product show হবে।
  // =======================================================

  const matchesColor =
  colorFilter === "all" ||
  (
    item.color &&
    item.color.toLowerCase().trim() ===
      colorFilter.toLowerCase().trim()
  ) ||
  (
    Array.isArray(item.color_variants) &&
    item.color_variants.some(
      (variant) =>
        variant.color &&
        variant.color.toLowerCase().trim() ===
          colorFilter.toLowerCase().trim()
    )
  );

  // =======================================================
  // SEARCH MATCH
  // =======================================================

  const matchesSearch =
    !search ||
    name.includes(search) ||
    price === search;

  // =======================================================
  // FINAL RESULT
  // =======================================================

   return (
    matchesSearch &&
    matchesCategory &&
    matchesColor &&
    matchesPrice
  );
});

// =====================================================
// FILTER ORDERS
// =====================================================

const filteredOrders = orders.filter((order) => {
  const search = orderSearchTerm.trim().toLowerCase();

  const matchesSearch =
    !search ||
    String(order.order_number || "")
      .toLowerCase()
      .includes(search) ||
    String(order.customer_phone || "")
      .toLowerCase()
      .includes(search) ||
    String(order.customer_name || "")
      .toLowerCase()
      .includes(search);

  const matchesStatus =
    orderStatusFilter === "all" ||
    String(order.status || "").toLowerCase() ===
      orderStatusFilter.toLowerCase();

  const matchesDate =
    !orderDateFilter ||
    (
      order.created_at &&
      new Date(order.created_at)
        .toISOString()
        .slice(0, 10) === orderDateFilter
    );

  return (
    matchesSearch &&
    matchesStatus &&
    matchesDate
  );
});
// =====================================================
// MAIN PRODUCT PAGINATION
// =====================================================

const totalPages = Math.ceil(
  filteredProducts.length / PRODUCTS_PER_PAGE
);

const startIndex =
  (currentPage - 1) * PRODUCTS_PER_PAGE;

const paginatedFilteredProducts =
  filteredProducts.slice(
    startIndex,
    startIndex + PRODUCTS_PER_PAGE
  );

const changePage = (page) => {
  if (page < 1) return;

  if (page > totalPages) return;

  setCurrentPage(page);
};


  // =========================================================
// ORDER TABLE STYLES
// =========================================================

const orderTableHeaderStyle = {
  padding: "13px 14px",
  textAlign: "left",
  fontSize: "13px",
  fontWeight: "700",
  whiteSpace: "nowrap",
};

const orderTableCellStyle = {
  padding: "13px 14px",
  fontSize: "13px",
  whiteSpace: "nowrap",
};

// =========================================================
// AUTH LOADING
// =========================================================

if (authLoading) {
  return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "20px",
        }}
      >
        ⏳ Loading...
      </div>
    );
  }

  // =========================================================
  // LOGIN
  // =========================================================

  if (!session) {
    return (
      <Login
        onLogin={(user) => {
          setSession({ user });
          setCurrentUserId(user?.id || null);
        }}
      />
    );
  }

  // =========================================================
// GET SELECTED COLOR + IMAGE
// =========================================================

const getSelectedColorData = (item) => {
  const filterColor =
    colorFilter && colorFilter !== "all"
      ? colorFilter.toLowerCase().trim()
      : "";

  const mainColor =
    item.color
      ? item.color.toLowerCase().trim()
      : "";

  const variants =
    Array.isArray(item.color_variants)
      ? item.color_variants
      : [];

  // =======================================================
  // 1. COLOR FILTER SELECTED
  // =======================================================

  if (filterColor) {

    // -------------------------------------------------------
    // FIRST PRIORITY:
    // Color Variant match
    // -------------------------------------------------------

    const matchedVariant = variants.find(
      (variant) =>
        variant?.color &&
        variant.color.toLowerCase().trim() ===
          filterColor
    );

    if (matchedVariant) {
      return {
        color: matchedVariant.color,
        image:
          matchedVariant.image_url ||
          item.image_url,
      };
    }

    // -------------------------------------------------------
    // SECOND PRIORITY:
    // Main Color match
    // -------------------------------------------------------

    if (mainColor === filterColor) {
      return {
        color: item.color,
        image: item.image_url,
      };
    }
  }

  // =======================================================
  // 2. MANUALLY SELECTED COLOR FROM CARD
  // =======================================================

  const manuallySelectedColor =
    selectedColors[item.id];

  if (manuallySelectedColor) {

    const manualColor =
      manuallySelectedColor
        .toLowerCase()
        .trim();

    // -------------------------------------------------------
    // MAIN COLOR
    // -------------------------------------------------------

    if (mainColor === manualColor) {
      return {
        color: item.color,
        image: item.image_url,
      };
    }

    // -------------------------------------------------------
    // COLOR VARIANT
    // -------------------------------------------------------

    const selectedVariant =
      variants.find(
        (variant) =>
          variant?.color &&
          variant.color.toLowerCase().trim() ===
            manualColor
      );

    if (selectedVariant) {
      return {
        color: selectedVariant.color,
        image:
          selectedVariant.image_url ||
          item.image_url,
      };
    }
  }

  // =======================================================
  // 3. DEFAULT
  // =======================================================

  return {
    color: item.color || "",
    image: item.image_url,
  };
};

  // =========================================================
  // RETURN
  // =========================================================

  return (
    <div
      style={{
        minHeight: "100vh",
        background: darkMode
  ? "#111827"
  : "#f5f6f8",
        display: "flex",
        fontFamily:
          "Arial, Helvetica, sans-serif",
      }}
    >
      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <aside
        style={{
          width: "240px",
          minHeight: "100vh",
          background: "#111827",
          color: "#fff",
          padding: "20px 15px",
          boxSizing: "border-box",
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          overflowY: "auto",
          zIndex: 100,
        }}
      >
        {/* LOGO */}

        <div
          style={{
            fontSize: "21px",
            fontWeight: "700",
            padding: "10px 12px 25px",
            borderBottom:
              "1px solid #374151",
            marginBottom: "20px",
          }}
        >
          Sanvee's
          <br />

          <span
            style={{
              fontSize: "14px",
              fontWeight: "400",
              color: "#9ca3af",
            }}
          >
            Product System
          </span>
        </div>

        {/* DASHBOARD */}

        <button
          onClick={() => {
  setActiveMenu("dashboard");
  setAllProductsActive(false);
}}
          style={{
            width: "100%",
            padding: "13px 15px",
            marginBottom: "8px",
            border: "none",
            borderRadius: "8px",
            textAlign: "left",
            cursor: "pointer",
            color: "#fff",
            background:
              activeMenu === "dashboard"
                ? "#2563eb"
                : "transparent",
            fontSize: "15px",
            fontWeight: "600",
          }}
        >
          🏠 Dashboard
        </button>

        {/* ADD PRODUCT */}

        {canManageProducts && (
          <button
            onClick={() => {
  setActiveMenu("addProduct");
  setProductsOpen(false);
  setAllProductsActive(false);
  resetProductForm();
}}
            style={{
              width: "100%",
              padding: "13px 15px",
              marginBottom: "8px",
              border: "none",
              borderRadius: "8px",
              textAlign: "left",
              cursor: "pointer",
              color: "#fff",
              background:
                activeMenu === "addProduct"
                  ? "#2563eb"
                  : "transparent",
              fontSize: "15px",
              fontWeight: "600",
            }}
          >
            ➕ Add New Product
          </button>
        )}

        {/* =====================================================
    ALL PRODUCTS
===================================================== */}

<button
  onClick={() => {
    setActiveMenu("products");

    // Keep existing product state
    setProductsOpen(true);

    // ALL PRODUCTS ACTIVE
    setAllProductsActive(true);

    // ORDER PROCESS PANEL OPEN
    setOrderPanelOpen(true);

    // Scroll to existing product search section
    setTimeout(() => {
      document
        .getElementById(
          "product-search-section"
        )
        ?.scrollIntoView({
          behavior: "smooth",
        });
    }, 50);
  }}
  style={{
    width: "100%",
    padding: "13px 15px",
    marginBottom: "8px",
    border: "none",
    borderRadius: "8px",
    textAlign: "left",
    cursor: "pointer",
    color: "#fff",
    background:
      activeMenu === "products"
        ? "#2563eb"
        : "transparent",
    fontSize: "15px",
    fontWeight: "600",
  }}
>
  📋 All Products
</button>

        {/* =====================================================
    ORDERS
===================================================== */}

{canManageProducts && (
<button
  onClick={() => {
    setActiveMenu("orders");
    setActiveOrderPage("all-orders");
    setAllProductsActive(false);
  }}
  style={{
    width: "100%",
    padding: "13px 15px",
    marginBottom: "8px",
    border: "none",
    borderRadius: "8px",
    textAlign: "left",
    cursor: "pointer",
    color: "#fff",
    background:
      activeMenu === "orders"
        ? "#2563eb"
        : "transparent",
    fontSize: "15px",
    fontWeight: "600",
  }}
>
  🛒 Orders
</button>
)}
{/* =====================================================
    ORDER HISTORY
===================================================== */}

{canManageProducts && (
<button
  onClick={() => {
    setActiveMenu("order-history");
    setActiveOrderPage("");
    setAllProductsActive(false);
    setOrderHistorySelectedOrder(null);
    setOrderHistory([]);
  }}
  style={{
    width: "100%",
    padding: "13px 15px",
    marginBottom: "8px",
    border: "none",
    borderRadius: "8px",
    textAlign: "left",
    cursor: "pointer",
    color: "#fff",
    background:
      activeMenu === "order-history"
        ? "#2563eb"
        : "transparent",
    fontSize: "15px",
    fontWeight: "600",
  }}
>
  🕒 Order History
</button>
)}
{/* =====================================================
    SEARCH CUSTOMER ORDER
===================================================== */}

<button
  onClick={() => {
    setActiveMenu("search-customer-order");
    setActiveOrderPage("");
    setAllProductsActive(false);

    setOrderSearchPhone("");
    setOrderSearchSV("");
    setSearchedOrders([]);
  }}
  style={{
    width: "100%",
    padding: "13px 15px",
    marginBottom: "8px",
    border: "none",
    borderRadius: "8px",
    textAlign: "left",
    cursor: "pointer",
    color: "#fff",
    background:
      activeMenu === "search-customer-order"
        ? "#2563eb"
        : "transparent",
    fontSize: "15px",
    fontWeight: "600",
  }}
>
  🔎 Search Customer Order
</button>
{/* =====================================================
    COURIER PANEL
===================================================== */}

{canManageProducts && (
<button
  onClick={() => {
    setActiveMenu("courier-panel");
    setActiveOrderPage("");
    setAllProductsActive(false);
    setCourierPanelOpen(true);
    setActiveCourier("all");
    loadCourierShipments();
  }}
  style={{
    width: "100%",
    padding: "13px 15px",
    marginBottom: "8px",
    border: "none",
    borderRadius: "8px",
    textAlign: "left",
    cursor: "pointer",
    color: "#fff",
    background:
      activeMenu === "courier-panel"
        ? "#2563eb"
        : "transparent",
    fontSize: "15px",
    fontWeight: "600",
  }}
>
  🚚 Courier Panel
</button>
)}
{/* PRODUCT HISTORY */}

{canManageProducts && (
<button
  onClick={() => {
    setActiveMenu("history");
    setActiveOrderPage("");
    setAllProductsActive(false);
    loadProductHistory();
  }}
  style={{
    width: "100%",
    padding: "13px 15px",
    marginBottom: "8px",
    border: "none",
    borderRadius: "8px",
    textAlign: "left",
    cursor: "pointer",
    color: "#fff",
    background:
      activeMenu === "history"
        ? "#2563eb"
        : "transparent",
    fontSize: "15px",
    fontWeight: "600",
  }}
>
  🕒 Product History
</button>
)}

        {/* MANAGE USERS */}

        {canManageUsers && (
          <button
           onClick={() => {
  setActiveMenu("users");
  setAllProductsActive(false);
  setUserModalOpen(true);
  loadUsers();
}}
            style={{
              width: "100%",
              padding: "13px 15px",
              marginBottom: "8px",
              border: "none",
              borderRadius: "8px",
              textAlign: "left",
              cursor: "pointer",
              color: "#fff",
              background:
                activeMenu === "users"
                  ? "#2563eb"
                  : "transparent",
              fontSize: "15px",
              fontWeight: "600",
            }}
          >
            👥 Manage Users
          </button>
        )}
        

        {/* USER INFO */}

        <div
  style={{
    marginTop: "25px",
    padding: "12px 14px",
    background: darkMode ? "#1f2937" : "#f3f4f6",
    borderRadius: "8px",
    fontSize: "13px",
    color: darkMode ? "#d1d5db" : "#6b7280",
    border: darkMode
      ? "1px solid #374151"
      : "1px solid #e5e7eb",
  }}
>
          Logged in as
          <br />

          <strong
            style={{
              color: "#110101",
              textTransform: "capitalize",
            }}
          >
            {userRole || "User"}
          </strong>
        </div>

        {/* DARK MODE */}

<button
  onClick={() => setDarkMode(!darkMode)}
  style={{
    position: "absolute",
    left: "15px",
    right: "15px",
    bottom: "72px",
    width: "calc(100% - 30px)",
    padding: "13px 15px",
    border: "none",
    borderRadius: "8px",
    textAlign: "left",
    cursor: "pointer",
    color: "#fff",
    background: darkMode
      ? "#374151"
      : "transparent",
    fontSize: "15px",
    fontWeight: "600",
  }}
>
  {darkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
</button>
        {/* LOGOUT */}

        <button
          onClick={handleLogout}
          style={{
            position: "absolute",
            left: "15px",
            right: "15px",
            bottom: "20px",
            width: "calc(100% - 30px)",
            padding: "13px 15px",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            color: "#fff",
            background: "#dc2626",
            fontSize: "15px",
            fontWeight: "600",
            textAlign: "left",
          }}
        >
          🚪 Logout
        </button>
      </aside>

      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}

      <div
        style={{
          marginLeft: "240px",
          width: "calc(100% - 240px)",
          minHeight: "100vh",
          boxSizing: "border-box",
              background: darkMode ? "#111827" : "#f5f6f8",

        }}
      >
        {/* HEADER */}

<header
  style={{
    background: darkMode ? "#1f2937" : "#fff",
    padding: "25px 30px",
    borderBottom: darkMode
      ? "1px solid #374151"
      : "1px solid #e5e7eb",
    color: darkMode ? "#fff" : "#111827",
  }}
>
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "20px",
    }}
  >

    {/* LEFT: TITLE */}

    <div>
      <h1
        style={{
          margin: 0,
          fontSize: "28px",
        }}
      >
        Sanvee's Product System
      </h1>

      <p
        style={{
          margin: "7px 0 0",
          color: darkMode ? "#9ca3af" : "#6b7280",
        }}
      >
        Product Management & Catalog
      </p>
    </div>

    {/* RIGHT: MY ACCOUNT */}

    <button
      type="button"
      onClick={() => setMyAccountOpen(true)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "10px 15px",
        border: darkMode
          ? "1px solid #4b5563"
          : "1px solid #d1d5db",
        borderRadius: "8px",
        background: darkMode ? "#111827" : "#fff",
        color: darkMode ? "#fff" : "#111827",
        cursor: "pointer",
        fontSize: "14px",
        fontWeight: "600",
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: "18px" }}>
        👤
      </span>

      My Account
    </button>

  </div>
</header>

        {/* CONTENT */}

        <main
          style={{
            padding: "30px",
          }}
        >
          {/* =================================================
              DASHBOARD
          ================================================= */}

          {activeMenu === "dashboard" && (
            <section>
              <h2
  style={{
    color: darkMode ? "#fff" : "#111827",
  }}
>
  🏠 Dashboard
</h2>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "20px",
                  marginTop: "20px",
                }}
              >
                <div
                  style={{
  background: darkMode ? "#1f2937" : "#fff",
  color: darkMode ? "#fff" : "#111827",
  padding: "25px",
                    borderRadius: "12px",
                    boxShadow:
                      "0 2px 10px rgba(0,0,0,0.06)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "30px",
                    }}
                  >
                    📦
                  </div>

                  <h3>Total Products</h3>

                  <strong
                    style={{
                      fontSize: "28px",
                    }}
                  >
                    {products.length}
                  </strong>
                </div>

                <div
                  style={{
                    background: darkMode ? "#1f2937" : "#fff",
color: darkMode ? "#fff" : "#111827",
padding: "25px",
borderRadius: "12px",
boxShadow: darkMode
  ? "0 2px 10px rgba(0,0,0,0.30)"
  : "0 2px 10px rgba(0,0,0,0.06)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "30px",
                    }}
                  >
                    👤
                  </div>

                  <h3>Your Role</h3>

                  <strong
                    style={{
                      fontSize: "22px",
                      textTransform:
                        "capitalize",
                    }}
                  >
                    {userRole}
                  </strong>
                </div>
              </div>
                            <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "20px",
                  marginTop: "20px",
                }}
              >
                {/* =================================================
    DASHBOARD ORDER STATISTICS
================================================= */}

<div
  style={{
    display: "grid",
    gridTemplateColumns:
      "repeat(4, minmax(0, 1fr))",
    gap: "24px",
    marginTop: "24px",
  }}
>
  {/* =================================================
      NEW ORDERS TODAY
  ================================================= */}

  <div
    style={{
      background: darkMode ? "#1f2937" : "#fff",
      color: darkMode ? "#fff" : "#111827",
      padding: "28px",
      borderRadius: "16px",
      boxShadow:
        "0 4px 14px rgba(0,0,0,0.08)",
      minHeight: "175px",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
    }}
  >
    <div>
      <div
        style={{
          fontSize: "34px",
          marginBottom: "10px",
        }}
      >
        🆕
      </div>

      <h3
        style={{
          margin: 0,
          fontSize: "18px",
        }}
      >
        {isOwner || isAdmin
  ? "New Orders Today"
  : "Total Orders Today"}
      </h3>
    </div>

    <div>
      <strong
        style={{
          fontSize: "34px",
          display: "block",
          marginTop: "12px",
        }}
      >
        {
          dashboardOrderStats
            .newOrdersTodayCount
        }
      </strong>

      <div
        style={{
          marginTop: "6px",
          fontSize: "17px",
          fontWeight: "600",
          opacity: 0.85,
        }}
      >
        ৳
        {dashboardOrderStats.newOrdersTodayAmount.toLocaleString(
          "en-BD",
        )}
      </div>
    </div>
  </div>

  {/* =================================================
      PENDING ORDERS
  ================================================= */}

  <div
    style={{
      background: darkMode ? "#1f2937" : "#fff",
      color: darkMode ? "#fff" : "#111827",
      padding: "28px",
      borderRadius: "16px",
      boxShadow:
        "0 4px 14px rgba(0,0,0,0.08)",
      minHeight: "175px",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
    }}
  >
    <div>
      <div
        style={{
          fontSize: "34px",
          marginBottom: "10px",
        }}
      >
        ⏳
      </div>

      <h3
        style={{
          margin: 0,
          fontSize: "18px",
        }}
      >
        Pending Orders
      </h3>
    </div>

    <div>
      <strong
        style={{
          fontSize: "34px",
          display: "block",
          marginTop: "12px",
        }}
      >
        {
          dashboardOrderStats
            .pendingOrdersCount
        }
      </strong>

      <div
        style={{
          marginTop: "6px",
          fontSize: "17px",
          fontWeight: "600",
          opacity: 0.85,
        }}
      >
        ৳
        {dashboardOrderStats.pendingOrdersAmount.toLocaleString(
          "en-BD",
        )}
      </div>
    </div>
  </div>

  {/* =================================================
      PACKAGING ORDERS
  ================================================= */}

  <div
    style={{
      background: darkMode ? "#1f2937" : "#fff",
      color: darkMode ? "#fff" : "#111827",
      padding: "28px",
      borderRadius: "16px",
      boxShadow:
        "0 4px 14px rgba(0,0,0,0.08)",
      minHeight: "175px",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
    }}
  >
    <div>
      <div
        style={{
          fontSize: "34px",
          marginBottom: "10px",
        }}
      >
        📦
      </div>

      <h3
        style={{
          margin: 0,
          fontSize: "18px",
        }}
      >
        Packaging Orders
      </h3>
    </div>

    <div>
      <strong
        style={{
          fontSize: "34px",
          display: "block",
          marginTop: "12px",
        }}
      >
        {
          dashboardOrderStats
            .packagingOrdersCount
        }
      </strong>

      <div
        style={{
          marginTop: "6px",
          fontSize: "17px",
          fontWeight: "600",
          opacity: 0.85,
        }}
      >
        ৳
        {dashboardOrderStats.packagingOrdersAmount.toLocaleString(
          "en-BD",
        )}
      </div>
    </div>
  </div>

  {/* =================================================
      SHIPPED TODAY
  ================================================= */}

  <div
    style={{
      background: darkMode ? "#1f2937" : "#fff",
      color: darkMode ? "#fff" : "#111827",
      padding: "28px",
      borderRadius: "16px",
      boxShadow:
        "0 4px 14px rgba(0,0,0,0.08)",
      minHeight: "175px",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
    }}
  >
    <div>
      <div
        style={{
          fontSize: "34px",
          marginBottom: "10px",
        }}
      >
        🚚
      </div>

      <h3
        style={{
          margin: 0,
          fontSize: "18px",
        }}
      >
        Shipped Today
      </h3>
    </div>

    <div>
      <strong
        style={{
          fontSize: "34px",
          display: "block",
          marginTop: "12px",
        }}
      >
        {
          dashboardOrderStats
            .shippedOrdersTodayCount
        }
      </strong>

      <div
        style={{
          marginTop: "6px",
          fontSize: "17px",
          fontWeight: "600",
          opacity: 0.85,
        }}
      >
        ৳
        {dashboardOrderStats.shippedOrdersTodayAmount.toLocaleString(
          "en-BD",
        )}
      </div>
    </div>
  </div>

  {/* =================================================
      CANCELLED TODAY
      5th CARD → NEXT ROW, LEFT SIDE
  ================================================= */}

  <div
    style={{
      background: darkMode ? "#1f2937" : "#fff",
      color: darkMode ? "#fff" : "#111827",
      padding: "28px",
      borderRadius: "16px",
      boxShadow: darkMode
  ? "0 4px 14px rgba(0,0,0,0.30)"
  : "0 4px 14px rgba(0,0,0,0.08)",
      minHeight: "175px",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
    }}
  >
    <div>
      <div
        style={{
          fontSize: "34px",
          marginBottom: "10px",
        }}
      >
        ❌
      </div>

      <h3
        style={{
          margin: 0,
          fontSize: "18px",
        }}
      >
        Cancelled Today
      </h3>
    </div>

    <div>
      <strong
        style={{
          fontSize: "34px",
          display: "block",
          marginTop: "12px",
        }}
      >
        {
          dashboardOrderStats
            .cancelledOrdersTodayCount
        }
      </strong>

      <div
        style={{
          marginTop: "6px",
          fontSize: "17px",
          fontWeight: "600",
          opacity: 0.85,
        }}
      >
        ৳
        {dashboardOrderStats.cancelledOrdersTodayAmount.toLocaleString(
          "en-BD",
        )}
      </div>
    </div>
  </div>
</div>

              </div>
            </section>
          )}
          {/* =====================================================
    COURIER TRACKING DETAILS POPUP
===================================================== */}

{courierTrackingOpen && selectedCourierShipment && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.55)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
      padding: "20px",
    }}
    onClick={() => {
      setCourierTrackingOpen(false);
      setSelectedCourierShipment(null);
    }}
  >
    <div
      style={{
        width: "100%",
        maxWidth: "750px",
        maxHeight: "90vh",
        overflowY: "auto",
        background: "#fff",
        borderRadius: "14px",
        padding: "24px",
        boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "22px",
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: "22px",
              fontWeight: "700",
            }}
          >
            🚚 Tracking Details
          </h2>

          <div
            style={{
              marginTop: "5px",
              color: "#666",
              fontSize: "14px",
            }}
          >
            {selectedCourierShipment.orders?.order_number ||
              selectedCourierShipment.metadata?.order_number ||
              "Order"}
          </div>
        </div>

        <button
          onClick={() => {
            setCourierTrackingOpen(false);
            setSelectedCourierShipment(null);
          }}
          style={{
            width: "36px",
            height: "36px",
            border: "none",
            borderRadius: "50%",
            background: "#f1f5f9",
            cursor: "pointer",
            fontSize: "18px",
          }}
        >
          ✕
        </button>
      </div>

      {/* =====================================================
          BASIC SHIPMENT INFORMATION
      ===================================================== */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "14px",
          marginBottom: "22px",
        }}
      >
        <div
          style={{
            padding: "15px",
            background: "#f8fafc",
            borderRadius: "10px",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              color: "#64748b",
              marginBottom: "5px",
            }}
          >
            Courier
          </div>

          <strong>
            {String(
              selectedCourierShipment.courier || ""
            ).toUpperCase()}
          </strong>
        </div>

        <div
          style={{
            padding: "15px",
            background: "#f8fafc",
            borderRadius: "10px",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              color: "#64748b",
              marginBottom: "5px",
            }}
          >
            Shipment Status
          </div>

          <strong>
            {selectedCourierShipment.shipment_status ||
              "—"}
          </strong>
        </div>

        <div
          style={{
            padding: "15px",
            background: "#f8fafc",
            borderRadius: "10px",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              color: "#64748b",
              marginBottom: "5px",
            }}
          >
            API Status
          </div>

          <strong>
            {selectedCourierShipment.api_status ||
              "—"}
          </strong>
        </div>

        <div
          style={{
            padding: "15px",
            background: "#f8fafc",
            borderRadius: "10px",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              color: "#64748b",
              marginBottom: "5px",
            }}
          >
            Tracking Code
          </div>

          <strong>
            {selectedCourierShipment.tracking_code ||
              "—"}
          </strong>
        </div>

        <div
          style={{
            padding: "15px",
            background: "#f8fafc",
            borderRadius: "10px",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              color: "#64748b",
              marginBottom: "5px",
            }}
          >
            Consignment ID
          </div>

          <strong>
            {selectedCourierShipment.consignment_id ||
              "—"}
          </strong>
        </div>

        <div
          style={{
            padding: "15px",
            background: "#f8fafc",
            borderRadius: "10px",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              color: "#64748b",
              marginBottom: "5px",
            }}
          >
            Last Updated
          </div>

          <strong>
            {selectedCourierShipment.updated_at
              ? new Date(
                  selectedCourierShipment.updated_at
                ).toLocaleString()
              : "—"}
          </strong>
        </div>
      </div>

      {/* =====================================================
          CUSTOMER INFORMATION
      ===================================================== */}

      <h3
        style={{
          margin: "0 0 12px",
          fontSize: "17px",
        }}
      >
        👤 Customer Information
      </h3>

      <div
        style={{
          padding: "16px",
          background: "#f8fafc",
          borderRadius: "10px",
          marginBottom: "22px",
        }}
      >
        <div style={{ marginBottom: "8px" }}>
          <strong>Name:</strong>{" "}
          {selectedCourierShipment.orders?.customer_name ||
            selectedCourierShipment.metadata?.customer_name ||
            "—"}
        </div>

        <div style={{ marginBottom: "8px" }}>
          <strong>Phone:</strong>{" "}
          {selectedCourierShipment.orders?.customer_phone ||
            selectedCourierShipment.metadata?.customer_phone ||
            "—"}
        </div>

        <div>
          <strong>Address:</strong>{" "}
          {selectedCourierShipment.orders?.customer_address ||
            selectedCourierShipment.metadata?.customer_address ||
            "—"}
        </div>
      </div>

      {/* TRACKING INFORMATION */}
<h3
  style={{
    margin: "0 0 12px",
    fontSize: "17px",
  }}
>
  📍 Tracking Information
</h3>

<div
  style={{
    padding: "18px",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    marginBottom: "22px",
  }}
>
  <div style={{ marginBottom: "12px" }}>
    <strong>Current Location:</strong>

    <div
      style={{
        marginTop: "5px",
        color: "#64748b",
      }}
    >
      {latestTrackingUpdate?.location || "—"}
    </div>
  </div>

  <div style={{ marginBottom: "12px" }}>
    <strong>Rider:</strong>

    <div
      style={{
        marginTop: "5px",
        color: "#64748b",
      }}
    >
      {latestTrackingUpdate?.rider_name
        ? `${latestTrackingUpdate.rider_name}${
            latestTrackingUpdate.rider_phone
              ? ` (${latestTrackingUpdate.rider_phone})`
              : ""
          }`
        : "—"}
    </div>
  </div>

  <div>
    <strong>Rider Note / Remarks:</strong>

    <div
      style={{
        marginTop: "5px",
        color: "#64748b",
      }}
    >
      {latestTrackingUpdate?.note || "—"}
    </div>
  </div>
</div>

{/* TRACKING TIMELINE */}
<h3
  style={{
    margin: "0 0 12px",
    fontSize: "17px",
  }}
>
  🕐 Tracking Timeline
</h3>

<div
  style={{
    padding: "18px",
    background: "#f8fafc",
    borderRadius: "10px",
  }}
>
  {selectedTrackingUpdates.length === 0 ? (
    <div
      style={{
        color: "#64748b",
        textAlign: "center",
      }}
    >
      Tracking history will appear here after courier API is connected.
    </div>
  ) : (
    [...selectedTrackingUpdates]
      .sort(
        (a, b) =>
          new Date(
            b.event_time || b.created_at
          ).getTime() -
          new Date(
            a.event_time || a.created_at
          ).getTime()
      )
      .map((update, index) => (
        <div
          key={update.id || index}
          style={{
            position: "relative",
            paddingLeft: "28px",
            paddingBottom:
              index ===
              selectedTrackingUpdates.length - 1
                ? "0"
                : "20px",
            borderLeft:
              index ===
              selectedTrackingUpdates.length - 1
                ? "none"
                : "2px solid #cbd5e1",
          }}
        >
          {/* TIMELINE DOT */}
          <div
            style={{
              position: "absolute",
              left: "-7px",
              top: "0",
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              background: "#2563eb",
              border: "2px solid #fff",
              boxShadow:
                "0 0 0 1px #2563eb",
            }}
          />

          {/* STATUS */}
          <div
            style={{
              fontWeight: "700",
              fontSize: "14px",
              marginBottom: "5px",
            }}
          >
            {update.status || "Tracking Update"}
          </div>

          {/* LOCATION */}
          {update.location && (
            <div
              style={{
                fontSize: "13px",
                color: "#475569",
                marginBottom: "4px",
              }}
            >
              📍 {update.location}
            </div>
          )}

          {/* RIDER */}
          {update.rider_name && (
            <div
              style={{
                fontSize: "13px",
                color: "#475569",
                marginBottom: "4px",
              }}
            >
              👤 {update.rider_name}

              {update.rider_phone
                ? ` — ${update.rider_phone}`
                : ""}
            </div>
          )}

          {/* NOTE */}
          {update.note && (
            <div
              style={{
                fontSize: "13px",
                color: "#64748b",
                marginBottom: "4px",
              }}
            >
              📝 {update.note}
            </div>
          )}

          {/* TIME */}
          <div
            style={{
              fontSize: "12px",
              color: "#94a3b8",
            }}
          >
            {new Date(
              update.event_time ||
                update.created_at
            ).toLocaleString()}
          </div>
        </div>
      ))
  )}
</div>

      {/* =====================================================
          API RESPONSE
      ===================================================== */}

      {selectedCourierShipment.courier_response && (
        <details
          style={{
            marginTop: "18px",
          }}
        >
          <summary
            style={{
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            🔧 Courier API Response
          </summary>

          <pre
            style={{
              marginTop: "10px",
              padding: "14px",
              background: "#0f172a",
              color: "#e2e8f0",
              borderRadius: "8px",
              overflowX: "auto",
              fontSize: "12px",
            }}
          >
            {JSON.stringify(
              selectedCourierShipment.courier_response,
              null,
              2
            )}
          </pre>
        </details>
      )}

      {/* CLOSE */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginTop: "24px",
        }}
      >
        <button
          onClick={() => {
            setCourierTrackingOpen(false);
            setSelectedCourierShipment(null);
          }}
          style={{
            padding: "10px 18px",
            border: "none",
            borderRadius: "8px",
            background: "#334155",
            color: "#fff",
            cursor: "pointer",
            fontWeight: "600",
          }}
        >
          Close
        </button>
      </div>
    </div>
  </div>
)}

          {/* =================================================
              ADD PRODUCT
          ================================================= */}

          {activeMenu === "addProduct" &&
            canManageProducts && (
              <section
  style={{
    maxWidth: "850px",
    background: darkMode ? "#1f2937" : "#fff",
    color: darkMode ? "#fff" : "#111827",
    padding: "30px",
                  borderRadius: "14px",
                  boxShadow:
                    "0 2px 12px rgba(0,0,0,0.08)",
                  boxSizing: "border-box",
                }}
              >
                <h2
                  style={{
                    marginTop: 0,
                    marginBottom: "8px",
                  }}
                >
                  ➕ Add New Product
                </h2>

                <p
  style={{
    color: darkMode ? "#9ca3af" : "#6b7280",
    marginBottom: "25px",
  }}
>
                  এখানে নতুন product-এর তথ্য যোগ
                  করুন।
                </p>

                {/* MAIN IMAGE BOX */}

                <div
                  style={{
                    background: "#f8fafc",
                    border:
                      "1px solid #e5e7eb",
                    borderRadius: "12px",
                    padding: "20px",
                    marginBottom: "16px",
                  }}
                >
                  <label
                    style={{
                      display: "block",
                      fontWeight: "700",
                      marginBottom: "10px",
                    }}
                  >
                    📸 Product Image
                  </label>

                  <label
                    style={{
                      display:
                        "inline-block",
                      padding: "11px 16px",
                      background: "#2563eb",
                      color: "#fff",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontWeight: "600",
                    }}
                  >
                    📸 Choose Product Image

                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImage}
                      style={{
                        display: "none",
                      }}
                    />
                  </label>

                  {product.imagePreview && (
                    <img
                      src={
                        product.imagePreview
                      }
                      alt="Preview"
                      style={{
                        maxWidth: "300px",
                        maxHeight: "350px",
                        objectFit: "contain",
                        display: "block",
                        marginTop: "15px",
                        borderRadius: "10px",
                      }}
                    />
                  )}
                </div>
                {/* CATEGORY */}

<div
  style={{
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "20px",
    marginBottom: "16px",
  }}
>
  <label
    style={{
      display: "block",
      fontWeight: "700",
      marginBottom: "9px",
    }}
  >
    📂 Category
  </label>

  <select
    name="category"
    value={product.category}
    onChange={handleChange}
    style={{
      width: "100%",
      boxSizing: "border-box",
      padding: "12px 14px",
      border: "1px solid #d1d5db",
      borderRadius: "8px",
      fontSize: "15px",
      background: "#fff",
    }}
  >
    <option value="">Select Category</option>

    <option value="dress">Dress</option>
    <option value="saree">Saree</option>
  </select>
</div>

                {/* PRODUCT NAME */}

                <div
                  style={{
                    background: "#f8fafc",
                    border:
                      "1px solid #e5e7eb",
                    borderRadius: "12px",
                    padding: "20px",
                    marginBottom: "16px",
                  }}
                >
                  <label
                    style={{
                      display: "block",
                      fontWeight: "700",
                      marginBottom: "9px",
                    }}
                  >
                    Product Name
                  </label>

                  <input
                    name="name"
                    placeholder="Example: Premium Jamdani Dress"
                    value={product.name}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      boxSizing:
                        "border-box",
                      padding: "12px 14px",
                      border:
                        "1px solid #d1d5db",
                      borderRadius: "8px",
                      fontSize: "15px",
                    }}
                  />
                </div>

                {/* SELLING PRICE */}

                <div
                  style={{
                    background: "#f8fafc",
                    border:
                      "1px solid #e5e7eb",
                    borderRadius: "12px",
                    padding: "20px",
                    marginBottom: "16px",
                  }}
                >
                  <label
                    style={{
                      display: "block",
                      fontWeight: "700",
                      marginBottom: "9px",
                    }}
                  >
                    Selling Price
                  </label>

                  <input
                    name="price"
                    type="number"
                    placeholder="Example: 1850"
                    value={product.price}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      boxSizing:
                        "border-box",
                      padding: "12px 14px",
                      border:
                        "1px solid #d1d5db",
                      borderRadius: "8px",
                      fontSize: "15px",
                    }}
                  />
                </div>

                {/* BUYING PRICE */}

                {canViewBuyingPrice && (
                  <div
                    style={{
                      background: "#fff7ed",
                      border:
                        "1px solid #fed7aa",
                      borderRadius: "12px",
                      padding: "20px",
                      marginBottom: "16px",
                    }}
                  >
                    <label
                      style={{
                        display: "block",
                        fontWeight: "700",
                        marginBottom: "9px",
                      }}
                    >
                      💰 Buying Price
                    </label>

                    <input
                      name="buying_price"
                      type="number"
                      placeholder="Example: 1200"
                      value={
                        product.buying_price
                      }
                      onChange={
                        handleChange
                      }
                      style={{
                        width: "100%",
                        boxSizing:
                          "border-box",
                        padding: "12px 14px",
                        border:
                          "1px solid #d1d5db",
                        borderRadius: "8px",
                        fontSize: "15px",
                      }}
                    />
                  </div>
                )}

                {/* MAIN COLOR */}

                <div
                  style={{
                    background: "#f8fafc",
                    border:
                      "1px solid #e5e7eb",
                    borderRadius: "12px",
                    padding: "20px",
                    marginBottom: "16px",
                  }}
                >
                  <label
                    style={{
                      display: "block",
                      fontWeight: "700",
                      marginBottom: "9px",
                    }}
                  >
                    🎨 Main Color
                  </label>

                  <input
                    name="color"
                    placeholder="Example: Black"
                    value={product.color}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      boxSizing:
                        "border-box",
                      padding: "12px 14px",
                      border:
                        "1px solid #d1d5db",
                      borderRadius: "8px",
                      fontSize: "15px",
                    }}
                  />
                </div>
                {/* =====================================================
    MAIN COLOR — STOCK / SIZES & STOCK
===================================================== */}

{product.category === "saree" ? (
  <div
    style={{
      background: "#f8fafc",
      border: "1px solid #e5e7eb",
      borderRadius: "12px",
      padding: "20px",
      marginBottom: "16px",
    }}
  >
    <label
      style={{
        display: "block",
        fontWeight: "700",
        marginBottom: "9px",
      }}
    >
      📦 Stock
    </label>

    <input
      type="number"
      min="0"
      placeholder="Stock"
      value={
        product.stock ?? ""
      }
      onChange={(e) =>
        setProduct((prev) => ({
          ...prev,
          stock: e.target.value,
        }))
      }
      style={{
        width: "100%",
        boxSizing: "border-box",
        padding: "11px 13px",
        border: "1px solid #d1d5db",
        borderRadius: "8px",
        fontSize: "15px",
      }}
    />
  </div>
) : (
  <div
    style={{
      background: "#f8fafc",
      border: "1px solid #e5e7eb",
      borderRadius: "12px",
      padding: "20px",
      marginBottom: "16px",
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "15px",
        marginBottom: "15px",
        flexWrap: "wrap",
      }}
    >
      <div>
        <h3
          style={{
            margin: "0 0 5px",
          }}
        >
          📏 Sizes & Stock
        </h3>

        <small
          style={{
            color: "#6b7280",
          }}
        >
          Main Color-এর প্রতিটি Size-এর আলাদা Stock দিন।
        </small>
      </div>

      <button
        type="button"
        onClick={addMainSize}
        style={{
          padding: "10px 15px",
          border: "none",
          borderRadius: "8px",
          background: "#2563eb",
          color: "#fff",
          cursor: "pointer",
          fontWeight: "600",
        }}
      >
        ➕ Add Size
      </button>
    </div>

    {product.sizes.length === 0 && (
      <div
        style={{
          padding: "18px",
          background: "#fff",
          borderRadius: "8px",
          color: "#6b7280",
          textAlign: "center",
          border: "1px dashed #d1d5db",
        }}
      >
        এখনো কোনো Size যোগ করা হয়নি।
      </div>
    )}

    {product.sizes.map((sizeItem, index) => (
      <div
        key={index}
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr auto",
          gap: "8px",
          alignItems: "center",
          marginBottom: "10px",
        }}
      >
        <input
          type="text"
          placeholder="Size (Example: 38)"
          value={sizeItem.size}
          onChange={(e) =>
            handleMainSizeChange(
              index,
              "size",
              e.target.value
            )
          }
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "11px 13px",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
          }}
        />

        <input
          type="number"
          min="0"
          placeholder="Stock"
          value={sizeItem.stock}
          onChange={(e) =>
            handleMainSizeChange(
              index,
              "stock",
              e.target.value
            )
          }
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "11px 13px",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
          }}
        />

        <button
          type="button"
          onClick={() => removeMainSize(index)}
          style={{
            border: "none",
            background: "#dc2626",
            color: "#fff",
            borderRadius: "6px",
            padding: "8px 10px",
            cursor: "pointer",
          }}
        >
          🗑️
        </button>
      </div>
    ))}
  </div>
)}

                {/* COLOR VARIANTS */}

                <div
                  style={{
                    background: "#f8fafc",
                    border:
                      "1px solid #e5e7eb",
                    borderRadius: "12px",
                    padding: "20px",
                    marginBottom: "16px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "space-between",
                      gap: "15px",
                      marginBottom: "15px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          margin:
                            "0 0 5px",
                        }}
                      >
                        🎨 Color Variants
                      </h3>

                      <small
                        style={{
                          color:
                            "#6b7280",
                        }}
                      >
                        সর্বোচ্চ ১৫টি Color এবং
                        প্রতিটির আলাদা ছবি দিতে
                        পারবেন।
                      </small>
                    </div>

                    <button
                      type="button"
                      onClick={
                        addColorVariant
                      }
                      disabled={
                        product
                          .color_variants
                          .length >=
                        COLOR_VARIANT_LIMIT
                      }
                      style={{
                        padding:
                          "10px 15px",
                        border: "none",
                        borderRadius: "8px",
                        background:
                          product
                            .color_variants
                            .length >=
                          COLOR_VARIANT_LIMIT
                            ? "#aaa"
                            : "#2563eb",
                        color: "#fff",
                        cursor:
                          product
                            .color_variants
                            .length >=
                          COLOR_VARIANT_LIMIT
                            ? "not-allowed"
                            : "pointer",
                        fontWeight: "600",
                      }}
                    >
                      ➕ Add Color
                    </button>
                  </div>

                  {product.color_variants
                    .length === 0 && (
                    <div
                      style={{
                        padding: "18px",
                        background: "#fff",
                        borderRadius: "8px",
                        color: "#6b7280",
                        textAlign:
                          "center",
                        border:
                          "1px dashed #d1d5db",
                      }}
                    >
                      এখনো কোনো Color Variant
                      যোগ করা হয়নি।
                    </div>
                  )}

                  {product.color_variants.map(
                    (
                      variant,
                      index
                    ) => (
                      <div
                        key={index}
                        style={{
                          background: "#fff",
                          padding: "18px",
                          borderRadius: "10px",
                          marginBottom:
                            "12px",
                          border:
                            "1px solid #e5e7eb",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent:
                              "space-between",
                            alignItems:
                              "center",
                            marginBottom:
                              "12px",
                            gap: "10px",
                          }}
                        >
                          <strong>
                            Color {index + 1}
                          </strong>

                          <button
                            type="button"
                            onClick={() =>
                              removeColorVariant(
                                index
                              )
                            }
                            style={{
                              border: "none",
                              background:
                                "#dc2626",
                              color: "#fff",
                              borderRadius:
                                "6px",
                              padding:
                                "7px 10px",
                              cursor:
                                "pointer",
                            }}
                          >
                            🗑️ Remove
                          </button>
                        </div>

                        <input
                          type="text"
                          placeholder="Example: Black"
                          value={
                            variant.color
                          }
                          onChange={(e) =>
                            handleColorVariantChange(
                              index,
                              e.target.value
                            )
                          }
                          style={{
                            width: "100%",
                            boxSizing:
                              "border-box",
                            padding:
                              "11px 13px",
                            border:
                              "1px solid #d1d5db",
                            borderRadius:
                              "8px",
                            marginBottom:
                              "12px",
                          }}
                        />

                        <label
                          style={{
                            display:
                              "block",
                            marginBottom:
                              "8px",
                            fontWeight:
                              "600",
                          }}
                        >
                          Color Image
                        </label>

                        <label
                          style={{
                            display:
                              "inline-block",
                            padding:
                              "10px 15px",
                            background:
                              "#eee",
                            borderRadius:
                              "8px",
                            cursor:
                              "pointer",
                          }}
                        >
                          📸 Choose Image

                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              handleColorVariantImage(
                                index,
                                e
                              )
                            }
                            style={{
                              display:
                                "none",
                            }}
                          />
                        </label>

                        {variant.imagePreview && (
                          <img
                            src={
                              variant.imagePreview
                            }
                            alt={
                              variant.color ||
                              "Color"
                            }
                            style={{
                              width: "150px",
                              height: "180px",
                              objectFit:
                                "cover",
                              display:
                                "block",
                              marginTop:
                                "12px",
                              borderRadius:
                                "8px",
                            }}
                          />
                        )}
                        {/* =====================================================
    COLOR VARIANT — STOCK / SIZES & STOCK
===================================================== */}

{product.category?.trim().toLowerCase() === "saree" ? (
  <div
    style={{
      marginTop: "18px",
      paddingTop: "16px",
      borderTop: "1px solid #e5e7eb",
    }}
  >
    <label
      style={{
        display: "block",
        fontWeight: "700",
        marginBottom: "8px",
      }}
    >
      📦 Stock
    </label>

    <input
      type="number"
      min="0"
      placeholder="Stock"
      value={variant.stock ?? ""}
      onChange={(e) =>
        setProduct((prev) => ({
          ...prev,
          color_variants:
            prev.color_variants.map(
              (item, variantIndex) =>
                variantIndex === index
                  ? {
                      ...item,
                      stock: e.target.value,
                    }
                  : item
            ),
        }))
      }
      style={{
        width: "100%",
        boxSizing: "border-box",
        padding: "10px 12px",
        border: "1px solid #d1d5db",
        borderRadius: "8px",
      }}
    />
  </div>
) : (
  <div
    style={{
      marginTop: "18px",
      paddingTop: "16px",
      borderTop: "1px solid #e5e7eb",
    }}
  >
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "12px",
        gap: "10px",
      }}
    >
      <strong>
        📏 Sizes & Stock
      </strong>

      <button
        type="button"
        onClick={() =>
          addColorVariantSize(index)
        }
        style={{
          padding: "8px 12px",
          border: "none",
          borderRadius: "7px",
          background: "#2563eb",
          color: "#fff",
          cursor: "pointer",
          fontWeight: "600",
        }}
      >
        ➕ Add Size
      </button>
    </div>

    {(variant.sizes || []).length === 0 && (
      <div
        style={{
          padding: "12px",
          background: "#f9fafb",
          borderRadius: "8px",
          color: "#6b7280",
          textAlign: "center",
          border: "1px dashed #d1d5db",
          fontSize: "14px",
        }}
      >
        এখনো কোনো Size যোগ করা হয়নি।
      </div>
    )}

    {(variant.sizes || []).map(
      (sizeItem, sizeIndex) => (
        <div
          key={sizeIndex}
          style={{
            display: "grid",
            gridTemplateColumns:
              "1fr 1fr auto",
            gap: "10px",
            alignItems: "center",
            marginBottom: "10px",
          }}
        >
          <input
            type="text"
            placeholder="Size (Example: M)"
            value={sizeItem.size}
            onChange={(e) =>
              handleColorVariantSizeChange(
                index,
                sizeIndex,
                e.target.value
              )
            }
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "10px 12px",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
            }}
          />

          <input
            type="number"
            min="0"
            placeholder="Stock"
            value={sizeItem.stock}
            onChange={(e) =>
              handleColorVariantStockChange(
                index,
                sizeIndex,
                e.target.value
              )
            }
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "10px 12px",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
            }}
          />

          <button
            type="button"
            onClick={() =>
              removeColorVariantSize(
                index,
                sizeIndex
              )
            }
            style={{
              border: "none",
              background: "#dc2626",
              color: "#fff",
              borderRadius: "7px",
              padding: "9px 11px",
              cursor: "pointer",
            }}
          >
            🗑️
          </button>
        </div>
      )
    )}
  </div>
)}
                      </div>
                    )
                  )}
                </div>

                {/* DETAILS */}

                <div
                  style={{
                    background: "#f8fafc",
                    border:
                      "1px solid #e5e7eb",
                    borderRadius: "12px",
                    padding: "20px",
                    marginBottom: "16px",
                  }}
                >
                  <label
                    style={{
                      display: "block",
                      fontWeight: "700",
                      marginBottom: "9px",
                    }}
                  >
                    📝 Full Product Details
                  </label>

                  <textarea
                    name="details"
                    placeholder="Write full product details..."
                    value={
                      product.details
                    }
                    onChange={
                      handleChange
                    }
                    rows="6"
                    style={{
                      width: "100%",
                      boxSizing:
                        "border-box",
                      padding: "12px 14px",
                      border:
                        "1px solid #d1d5db",
                      borderRadius: "8px",
                      fontSize: "15px",
                      resize: "vertical",
                    }}
                  />
                </div>

                {/* SAVE */}

                <button
                  onClick={addProduct}
                  disabled={saving}
                  style={{
                    width: "100%",
                    marginTop: "5px",
                    padding: "14px",
                    border: "none",
                    borderRadius: "9px",
                    background:
                      saving
                        ? "#9ca3af"
                        : "#16a34a",
                    color: "#fff",
                    cursor: saving
                      ? "not-allowed"
                      : "pointer",
                    fontWeight: "700",
                    fontSize: "16px",
                  }}
                >
                  {saving
                    ? "⏳ Saving..."
                    : "💾 Save Product"}
                </button>
              </section>
            )}

          {/* =====================================================
    ORDER HISTORY
===================================================== */}

{activeMenu === "order-history" && (
  <div
    style={{
      padding: "28px",
      minHeight: "100vh",
      background: darkMode
        ? "#111827"
        : "#f8fafc",
      color: darkMode
        ? "#f9fafb"
        : "#111827",
    }}
  >
    {/* =================================================
        HEADER
    ================================================= */}

    <div
      style={{
        marginBottom: "24px",
      }}
    >
      <h1
        style={{
          margin: 0,
          fontSize: "28px",
          fontWeight: "800",
        }}
      >
        🕒 Order History
      </h1>

      <p
        style={{
          marginTop: "6px",
          marginBottom: 0,
          color: darkMode
            ? "#9ca3af"
            : "#6b7280",
          fontSize: "14px",
        }}
      >
        Search an order number to see the complete activity history.
      </p>
    </div>

    {/* =================================================
        SEARCH BOX
    ================================================= */}

    <div
      style={{
        background: darkMode
          ? "#1f2937"
          : "#ffffff",
        borderRadius: "12px",
        padding: "18px",
        marginBottom: "24px",
        border: `1px solid ${
          darkMode
            ? "#374151"
            : "#e5e7eb"
        }`,
        boxShadow:
          "0 2px 8px rgba(0,0,0,0.05)",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: "10px",
          alignItems: "center",
        }}
      >
        <input
          type="text"
          value={orderHistorySearch}
          onChange={(e) =>
            setOrderHistorySearch(
              e.target.value
            )
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              loadOrderHistory();
            }
          }}
          placeholder="Enter Order Number..."
          style={{
            flex: 1,
            padding: "13px 15px",
            borderRadius: "8px",
            border: `1px solid ${
              darkMode
                ? "#4b5563"
                : "#d1d5db"
            }`,
            background: darkMode
              ? "#111827"
              : "#ffffff",
            color: darkMode
              ? "#f9fafb"
              : "#111827",
            fontSize: "14px",
            outline: "none",
          }}
        />

        <button
          type="button"
          onClick={loadOrderHistory}
          disabled={orderHistoryLoading}
          style={{
            padding: "13px 22px",
            border: "none",
            borderRadius: "8px",
            background: "#2563eb",
            color: "#fff",
            cursor:
              orderHistoryLoading
                ? "not-allowed"
                : "pointer",
            fontSize: "14px",
            fontWeight: "700",
            opacity:
              orderHistoryLoading
                ? 0.7
                : 1,
          }}
        >
          {orderHistoryLoading
            ? "Searching..."
            : "🔍 Search"}
        </button>

        <button
          type="button"
          onClick={() => {
            setOrderHistorySearch("");
            setOrderHistory([]);
            setOrderHistorySelectedOrder(null);
          }}
          style={{
            padding: "13px 18px",
            border: `1px solid ${
              darkMode
                ? "#4b5563"
                : "#d1d5db"
            }`,
            borderRadius: "8px",
            background: darkMode
              ? "#374151"
              : "#ffffff",
            color: darkMode
              ? "#f9fafb"
              : "#374151",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "600",
          }}
        >
          Clear
        </button>
      </div>
    </div>

    {/* =================================================
        NO SEARCH YET
    ================================================= */}

    {!orderHistorySearch.trim() &&
      orderHistory.length === 0 && (
        <div
          style={{
            background: darkMode
              ? "#1f2937"
              : "#ffffff",
            borderRadius: "12px",
            padding: "60px 20px",
            textAlign: "center",
            border: `1px solid ${
              darkMode
                ? "#374151"
                : "#e5e7eb"
            }`,
          }}
        >
          <div
            style={{
              fontSize: "48px",
              marginBottom: "12px",
            }}
          >
            🕒
          </div>

          <div
            style={{
              fontSize: "18px",
              fontWeight: "700",
              marginBottom: "6px",
            }}
          >
            Search an Order
          </div>

          <div
            style={{
              fontSize: "14px",
              color: darkMode
                ? "#9ca3af"
                : "#6b7280",
            }}
          >
            Enter an order number above to see
            its complete history.
          </div>
        </div>
      )}

    {/* =================================================
        NO RESULT
    ================================================= */}

    {orderHistorySearch.trim() &&
      !orderHistoryLoading &&
      orderHistory.length === 0 && (
        <div
          style={{
            background: darkMode
              ? "#1f2937"
              : "#ffffff",
            borderRadius: "12px",
            padding: "50px 20px",
            textAlign: "center",
            border: `1px solid ${
              darkMode
                ? "#374151"
                : "#e5e7eb"
            }`,
          }}
        >
          <div
            style={{
              fontSize: "42px",
              marginBottom: "10px",
            }}
          >
            🔎
          </div>

          <div
            style={{
              fontSize: "17px",
              fontWeight: "700",
            }}
          >
            No history found
          </div>

          <div
            style={{
              marginTop: "6px",
              fontSize: "14px",
              color: darkMode
                ? "#9ca3af"
                : "#6b7280",
            }}
          >
            No activity found for:
            <strong>
              {" "}
              {orderHistorySearch}
            </strong>
          </div>
        </div>
      )}

    {/* =================================================
        HISTORY RESULT
    ================================================= */}

    {orderHistory.length > 0 && (
      <div>
        {/* ORDER HEADER */}

        <div
          style={{
            background: darkMode
              ? "#1f2937"
              : "#ffffff",
            borderRadius: "12px",
            padding: "20px",
            marginBottom: "20px",
            border: `1px solid ${
              darkMode
                ? "#374151"
                : "#e5e7eb"
            }`,
          }}
        >
          <div
            style={{
              fontSize: "12px",
              color: darkMode
                ? "#9ca3af"
                : "#6b7280",
              marginBottom: "6px",
              textTransform:
                "uppercase",
              fontWeight: "700",
            }}
          >
            Order Number
          </div>

          <div
            style={{
              fontSize: "22px",
              fontWeight: "800",
            }}
          >
            #
            {orderHistorySelectedOrder ||
              orderHistory[0]
                ?.order_number ||
              "—"}
          </div>

          <div
            style={{
              marginTop: "8px",
              fontSize: "13px",
              color: darkMode
                ? "#9ca3af"
                : "#6b7280",
            }}
          >
            {orderHistory.length} activity
            {orderHistory.length !== 1
              ? " events"
              : " event"}{" "}
            found
          </div>
        </div>

        {/* =================================================
            TIMELINE
        ================================================= */}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          {orderHistory.map(
            (historyItem, index) => {
              const oldData =
                historyItem.old_data || {};

              const newData =
                historyItem.new_data || {};

              const actionType =
                String(
                  historyItem.action_type ||
                    ""
                ).toLowerCase();

              let icon = "📝";

              if (
                actionType ===
                "order_created"
              ) {
                icon = "🛒";
              } else if (
                actionType ===
                "product_added"
              ) {
                icon = "➕";
              } else if (
                actionType ===
                "product_removed"
              ) {
                icon = "➖";
              } else if (
                actionType ===
                "quantity_changed"
              ) {
                icon = "🔢";
              } else if (
                actionType ===
                "price_changed"
              ) {
                icon = "💰";
              } else if (
                actionType ===
                "status_changed"
              ) {
                icon = "📦";
              } else if (
                actionType ===
                "order_cancelled"
              ) {
                icon = "❌";
              } else if (
                actionType ===
                "delivery_charge_changed"
              ) {
                icon = "🚚";
              } else if (
                actionType ===
                "order_total_changed"
              ) {
                icon = "💵";
              }

              return (
                <div
                  key={historyItem.id}
                  style={{
                    display: "flex",
                    gap: "14px",
                  }}
                >
                  {/* TIMELINE ICON */}

                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      minWidth: "42px",
                      borderRadius: "50%",
                      background: darkMode
                        ? "#374151"
                        : "#eff6ff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent:
                        "center",
                      fontSize: "20px",
                    }}
                  >
                    {icon}
                  </div>

                  {/* EVENT CARD */}

                  <div
                    style={{
                      flex: 1,
                      background:
                        darkMode
                          ? "#1f2937"
                          : "#ffffff",
                      borderRadius: "12px",
                      padding: "17px",
                      border: `1px solid ${
                        darkMode
                          ? "#374151"
                          : "#e5e7eb"
                      }`,
                      boxShadow:
                        "0 2px 6px rgba(0,0,0,0.04)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        gap: "15px",
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize:
                              "16px",
                            fontWeight:
                              "800",
                          }}
                        >
                          {
                            historyItem.action_description ||
                            "Order activity"
                          }
                        </div>

                        <div
                          style={{
                            marginTop:
                              "6px",
                            fontSize:
                              "13px",
                            color:
                              darkMode
                                ? "#9ca3af"
                                : "#6b7280",
                          }}
                        >
                          👤{" "}
                          <strong
                            style={{
                              color:
                                darkMode
                                  ? "#f3f4f6"
                                  : "#374151",
                            }}
                          >
                            {historyItem.changed_by_name ||
                              "Unknown"}
                          </strong>
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize:
                            "12px",
                          color:
                            darkMode
                              ? "#9ca3af"
                              : "#6b7280",
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        {historyItem.created_at
                          ? new Date(
                              historyItem.created_at
                            ).toLocaleString(
                              "en-BD",
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute:
                                  "2-digit",
                              }
                            )
                          : "—"}
                      </div>
                    </div>

                    {/* STATUS CHANGE */}

                    {actionType ===
                      "status_changed" && (
                      <div
                        style={{
                          display:
                            "flex",
                          alignItems:
                            "center",
                          gap: "10px",
                          marginTop:
                            "15px",
                          flexWrap:
                            "wrap",
                        }}
                      >
                        <span
                          style={{
                            padding:
                              "7px 12px",
                            borderRadius:
                              "7px",
                            background:
                              darkMode
                                ? "#374151"
                                : "#f3f4f6",
                            fontSize:
                              "13px",
                            fontWeight:
                              "700",
                          }}
                        >
                          {String(
                            oldData.status ||
                              "Unknown"
                          )}
                        </span>

                        <span>
                          →
                        </span>

                        <span
                          style={{
                            padding:
                              "7px 12px",
                            borderRadius:
                              "7px",
                            background:
                              "#2563eb",
                            color: "#fff",
                            fontSize:
                              "13px",
                            fontWeight:
                              "700",
                          }}
                        >
                          {String(
                            newData.status ||
                              "Unknown"
                          )}
                        </span>
                      </div>
                    )}

                    {/* QUANTITY CHANGE */}

                    {actionType ===
                      "quantity_changed" && (
                      <div
                        style={{
                          marginTop:
                            "14px",
                          padding:
                            "12px",
                          background:
                            darkMode
                              ? "#111827"
                              : "#f9fafb",
                          borderRadius:
                            "8px",
                        }}
                      >
                        <strong>
                          {
                            newData.product_name ||
                            oldData.product_name ||
                            "Product"
                          }
                        </strong>

                        <div
                          style={{
                            marginTop:
                              "7px",
                            fontSize:
                              "14px",
                          }}
                        >
                          Quantity:{" "}
                          <strong>
                            {oldData.quantity ??
                              0}
                          </strong>{" "}
                          →{" "}
                          <strong
                            style={{
                              color:
                                "#2563eb",
                            }}
                          >
                            {newData.quantity ??
                              0}
                          </strong>
                        </div>
                      </div>
                    )}

                    {/* PRICE CHANGE */}

                    {actionType ===
                      "price_changed" && (
                      <div
                        style={{
                          marginTop:
                            "14px",
                          padding:
                            "12px",
                          background:
                            darkMode
                              ? "#111827"
                              : "#f9fafb",
                          borderRadius:
                            "8px",
                        }}
                      >
                        <strong>
                          {
                            newData.product_name ||
                            oldData.product_name ||
                            "Product"
                          }
                        </strong>

                        <div
                          style={{
                            marginTop:
                              "7px",
                            fontSize:
                              "14px",
                          }}
                        >
                          Price:{" "}
                          <strong>
                            ৳
                            {Number(
                              oldData.unit_price ||
                                0
                            ).toLocaleString()}
                          </strong>{" "}
                          →{" "}
                          <strong
                            style={{
                              color:
                                "#2563eb",
                            }}
                          >
                            ৳
                            {Number(
                              newData.unit_price ||
                                0
                            ).toLocaleString()}
                          </strong>
                        </div>
                      </div>
                    )}

                    {/* PRODUCT ADDED */}

                    {actionType ===
                      "product_added" && (
                      <div
                        style={{
                          marginTop:
                            "14px",
                          padding:
                            "12px",
                          background:
                            darkMode
                              ? "#111827"
                              : "#f9fafb",
                          borderRadius:
                            "8px",
                        }}
                      >
                        <div
                          style={{
                            fontWeight:
                              "700",
                          }}
                        >
                          {
                            newData.product_name ||
                            "Product"
                          }
                        </div>

                        <div
                          style={{
                            marginTop:
                              "6px",
                            fontSize:
                              "13px",
                            color:
                              darkMode
                                ? "#d1d5db"
                                : "#6b7280",
                          }}
                        >
                          Color:{" "}
                          {newData.color ||
                            "—"}
                          {" • "}
                          Size:{" "}
                          {newData.size ||
                            "—"}
                          {" • "}
                          Qty:{" "}
                          {newData.quantity ||
                            0}
                          {" • "}
                          Price: ৳
                          {Number(
                            newData.unit_price ||
                              0
                          ).toLocaleString()}
                        </div>
                      </div>
                    )}

                    {/* PRODUCT REMOVED */}

                    {actionType ===
                      "product_removed" && (
                      <div
                        style={{
                          marginTop:
                            "14px",
                          padding:
                            "12px",
                          background:
                            darkMode
                              ? "#111827"
                              : "#f9fafb",
                          borderRadius:
                            "8px",
                        }}
                      >
                        <div
                          style={{
                            fontWeight:
                              "700",
                          }}
                        >
                          {
                            oldData.product_name ||
                            "Product"
                          }
                        </div>

                        <div
                          style={{
                            marginTop:
                              "6px",
                            fontSize:
                              "13px",
                            color:
                              darkMode
                                ? "#d1d5db"
                                : "#6b7280",
                          }}
                        >
                          Color:{" "}
                          {oldData.color ||
                            "—"}
                          {" • "}
                          Size:{" "}
                          {oldData.size ||
                            "—"}
                          {" • "}
                          Qty:{" "}
                          {oldData.quantity ||
                            0}
                          {" • "}
                          Price: ৳
                          {Number(
                            oldData.unit_price ||
                              0
                          ).toLocaleString()}
                        </div>
                      </div>
                    )}

                    {/* DELIVERY CHARGE */}

                    {actionType ===
                      "delivery_charge_changed" && (
                      <div
                        style={{
                          marginTop:
                            "14px",
                          fontSize:
                            "14px",
                        }}
                      >
                        Delivery Charge:{" "}
                        <strong>
                          ৳
                          {Number(
                            oldData.delivery_charge ||
                              0
                          ).toLocaleString()}
                        </strong>{" "}
                        →{" "}
                        <strong
                          style={{
                            color:
                              "#2563eb",
                          }}
                        >
                          ৳
                          {Number(
                            newData.delivery_charge ||
                              0
                          ).toLocaleString()}
                        </strong>
                      </div>
                    )}

                    {/* ORDER TOTAL */}

                    {actionType ===
                      "order_total_changed" && (
                      <div
                        style={{
                          marginTop:
                            "14px",
                          padding:
                            "12px",
                          background:
                            darkMode
                              ? "#111827"
                              : "#f9fafb",
                          borderRadius:
                            "8px",
                          fontSize:
                            "13px",
                        }}
                      >
                        <div>
                          Subtotal:{" "}
                          <strong>
                            ৳
                            {Number(
                              oldData.subtotal ||
                                0
                            ).toLocaleString()}
                          </strong>{" "}
                          →{" "}
                          <strong
                            style={{
                              color:
                                "#2563eb",
                            }}
                          >
                            ৳
                            {Number(
                              newData.subtotal ||
                                0
                            ).toLocaleString()}
                          </strong>
                        </div>

                        <div
                          style={{
                            marginTop:
                              "5px",
                          }}
                        >
                          Total:{" "}
                          <strong>
                            ৳
                            {Number(
                              oldData.total_amount ||
                                0
                            ).toLocaleString()}
                          </strong>{" "}
                          →{" "}
                          <strong
                            style={{
                              color:
                                "#2563eb",
                            }}
                          >
                            ৳
                            {Number(
                              newData.total_amount ||
                                0
                            ).toLocaleString()}
                          </strong>
                        </div>
                      </div>
                    )}

                    {/* ORDER CREATED */}

                    {actionType ===
                      "order_created" && (
                      <div
                        style={{
                          marginTop:
                            "14px",
                          padding:
                            "12px",
                          background:
                            darkMode
                              ? "#111827"
                              : "#f9fafb",
                          borderRadius:
                            "8px",
                          fontSize:
                            "13px",
                        }}
                      >
                        <div
                          style={{
                            fontWeight:
                              "700",
                            marginBottom:
                              "7px",
                          }}
                        >
                          Order created
                        </div>

                        <div>
                          Status:{" "}
                          <strong>
                            {newData.status ||
                              "Pending"}
                          </strong>
                        </div>

                        <div
                          style={{
                            marginTop:
                              "4px",
                          }}
                        >
                          Subtotal: ৳
                          {Number(
                            newData.subtotal ||
                              0
                          ).toLocaleString()}
                        </div>

                        <div
                          style={{
                            marginTop:
                              "4px",
                          }}
                        >
                          Delivery: ৳
                          {Number(
                            newData.delivery_charge ||
                              0
                          ).toLocaleString()}
                        </div>

                        <div
                          style={{
                            marginTop:
                              "4px",
                            fontWeight:
                              "700",
                          }}
                        >
                          Total: ৳
                          {Number(
                            newData.total_amount ||
                              0
                          ).toLocaleString()}
                        </div>
                      </div>
                    )}

                    {/* CANCELLED */}

                    {actionType ===
                      "order_cancelled" && (
                      <div
                        style={{
                          marginTop:
                            "14px",
                          padding:
                            "12px",
                          borderRadius:
                            "8px",
                          background:
                            darkMode
                              ? "#3f1d1d"
                              : "#fef2f2",
                          color:
                            darkMode
                              ? "#fca5a5"
                              : "#b91c1c",
                          fontWeight:
                            "700",
                        }}
                      >
                        Order was cancelled.
                      </div>
                    )}
                  </div>
                </div>
              );
            }
          )}
        </div>
      </div>
    )}
  </div>
)}
{/* =====================================================
    SEARCH CUSTOMER ORDER
===================================================== */}

{activeMenu === "search-customer-order" && (
  <div
    style={{
      padding: "30px",
      color: darkMode ? "#fff" : "#111827",
    }}
  >
    <h2
      style={{
        marginTop: 0,
        marginBottom: "25px",
      }}
    >
      🔎 Search Customer Order
    </h2>

    {/* SEARCH BOXES */}

    <div
  style={{
    display: "flex",
    gap: "20px",
    marginBottom: "25px",
    alignItems: "flex-end",
  }}
>
  {/* CUSTOMER NUMBER */}

  <div
   style={{
  width: "25%",
  flexShrink: 0,
}}
  >
    <label
      style={{
        display: "block",
        marginBottom: "8px",
        fontWeight: "600",
      }}
    >
      Customer Number
    </label>

    <input
      type="text"
      value={orderSearchPhone}
      onChange={(e) => {
        const value = e.target.value;

        setOrderSearchPhone(value);

        if (value.trim() !== "") {
          setSearchedOrders([]);
        }
      }}
      placeholder="Customer mobile number"
      style={{
        width: "100%",
        padding: "13px 14px",
        borderRadius: "8px",
        border: darkMode
          ? "1px solid #4b5563"
          : "1px solid #d1d5db",
        background: darkMode
          ? "#1f2937"
          : "#fff",
        color: darkMode
          ? "#fff"
          : "#111827",
        fontSize: "15px",
        boxSizing: "border-box",
      }}
    />
  </div>

  {/* ORDER SV */}

  <div
    style={{
  width: "25%",
  flexShrink: 0,
}}
  >
    <label
      style={{
        display: "block",
        marginBottom: "8px",
        fontWeight: "600",
      }}
    >
      Order SV
    </label>

    <input
      type="text"
      value={orderSearchSV}
      onChange={(e) => {
        const value = e.target.value;

        setOrderSearchSV(value);

        if (value.trim() !== "") {
          setSearchedOrders([]);
        }
      }}
      placeholder="SV-20260908-153456-288M"
      style={{
        width: "100%",
        padding: "13px 14px",
        borderRadius: "8px",
        border: darkMode
          ? "1px solid #4b5563"
          : "1px solid #d1d5db",
        background: darkMode
          ? "#1f2937"
          : "#fff",
        color: darkMode
          ? "#fff"
          : "#111827",
        fontSize: "15px",
        boxSizing: "border-box",
      }}
    />
  </div>

  {/* CLEAR BUTTON */}

  <button
    onClick={() => {
      setOrderSearchPhone("");
      setOrderSearchSV("");
      setSearchedOrders([]);
    }}
    style={{
      height: "46px",
      padding: "0 18px",
      border: "none",
      borderRadius: "8px",
      background: "#dc2626",
      color: "#fff",
      fontSize: "15px",
      fontWeight: "600",
      cursor: "pointer",
      whiteSpace: "nowrap",
      flexShrink: 0,
    }}
  >
    ✕ Clear
  </button>
</div>

    {/* SEARCH BUTTON */}

    <button
      onClick={searchCustomerOrders}
      disabled={orderSearchLoading}
      style={{
        padding: "12px 25px",
        border: "none",
        borderRadius: "8px",
        background: "#2563eb",
        color: "#fff",
        fontSize: "15px",
        fontWeight: "600",
        cursor: orderSearchLoading
          ? "not-allowed"
          : "pointer",
      }}
    >
      {orderSearchLoading
        ? "Searching..."
        : "🔎 Search"}
    </button>

    {/* RESULTS */}

<div
  style={{
    marginTop: "30px",
    width: "100%",
  }}
>
  {searchedOrders.length > 0 && (
    <div
      style={{
        width: "100%",
        overflowX: "auto",
      }}
    >
      {/* RESULT HEADER */}

      <div
        style={{
          minWidth: "850px",
          display: "grid",
          gridTemplateColumns:
            "2fr 1.5fr 1.7fr 1fr 1fr 1fr",
          alignItems: "center",
          padding: "14px 18px",
          background: darkMode
            ? "#374151"
            : "#f3f4f6",
          border: darkMode
            ? "1px solid #4b5563"
            : "1px solid #d1d5db",
          borderRadius: "10px 10px 0 0",
          fontSize: "14px",
          fontWeight: "700",
        }}
      >
        <div>Order Number</div>
        <div>Customer Mobile</div>
        <div>Date & Time</div>
        <div>Total</div>
        <div>Status</div>
        <div
          style={{
            textAlign: "center",
          }}
        >
          Invoice
        </div>
      </div>

      {/* ORDER ROWS */}

      <div
        style={{
          minWidth: "850px",
        }}
      >
        {searchedOrders.map((order) => (
  <div
    key={order.id}
    style={{
      display: "grid",
      gridTemplateColumns:
        "2fr 1.5fr 1.7fr 1fr 1fr 1fr",
      alignItems: "center",
      padding: "16px 18px",
      marginTop: "8px",
      background: darkMode
        ? "#1f2937"
        : "#fff",
      color: darkMode
        ? "#fff"
        : "#111827",
      border: darkMode
        ? "1px solid #374151"
        : "1px solid #d1d5db",
      borderRadius: "10px",
      boxShadow:
        "0 2px 8px rgba(0,0,0,0.06)",
      fontSize: "14px",
    }}
  >
    {/* ORDER NUMBER */}

    <div
      style={{
        fontWeight: "600",
        wordBreak: "break-word",
        paddingRight: "12px",
      }}
    >
      {order.order_number}
    </div>

    {/* CUSTOMER MOBILE */}

    <div
      style={{
        paddingRight: "12px",
      }}
    >
      {order.customer_phone || "-"}
    </div>

    {/* DATE & TIME */}

    <div
      style={{
        paddingRight: "12px",
        whiteSpace: "nowrap",
      }}
    >
      {order.created_at
        ? new Date(
            order.created_at
          ).toLocaleString("en-BD", {
            dateStyle: "medium",
            timeStyle: "short",
          })
        : "-"}
    </div>

    {/* TOTAL */}

    <div
      style={{
        fontWeight: "600",
        paddingRight: "12px",
      }}
    >
      ৳
      {Number(
        order.total_amount || 0
      ).toLocaleString("en-BD")}
    </div>

    {/* STATUS */}

    <div
      style={{
        textTransform: "capitalize",
        fontWeight: "600",
        paddingRight: "12px",
      }}
    >
      {order.status || "-"}
    </div>

    {/* INVOICE */}

    <div
      style={{
        display: "flex",
        justifyContent: "center",
      }}
    >
      <button
        onClick={async (e) => {
          e.stopPropagation();

          try {
            // =====================================================
            // LOAD THIS EXACT ORDER
            // =====================================================

            const {
              data: orderItems,
              error,
            } = await supabase
              .from("order_items")
              .select("*")
              .eq("order_id", order.id)
              .order("created_at", {
                ascending: true,
              });

            if (error) {
              console.error(
                "Search invoice items load error:",
                error
              );

              alert(
                "Invoice items load করা যায়নি।"
              );

              return;
            }

            // =====================================================
            // SET THE SAME ORDER USED BY EXISTING INVOICE SYSTEM
            // =====================================================

            setSelectedOrder(order);

            setSelectedOrderItems(
              orderItems || []
            );

            // =====================================================
            // OPEN EXISTING INVOICE VIEW MODAL
            // =====================================================

            setInvoiceOpen(true);

          } catch (error) {
            console.error(
              "Search result invoice error:",
              error
            );

            alert(
              "Invoice open করার সময় সমস্যা হয়েছে।"
            );
          }
        }}
        style={{
          padding: "8px 14px",
          border: "none",
          borderRadius: "7px",
          background: "#2563eb",
          color: "#fff",
          fontSize: "13px",
          fontWeight: "600",
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        Invoice
      </button>
    </div>
  </div>
))}
      </div>
    </div>
  )}

  {!orderSearchLoading &&
    (orderSearchPhone.trim() ||
      orderSearchSV.trim()) &&
    searchedOrders.length === 0 && (
      <div
        style={{
          marginTop: "20px",
          padding: "20px",
          textAlign: "center",
          borderRadius: "8px",
          background: darkMode
            ? "#1f2937"
            : "#f3f4f6",
          border: darkMode
            ? "1px solid #374151"
            : "1px solid #d1d5db",
        }}
      >
        কোনো order পাওয়া যায়নি।
      </div>
    )}
</div>
  </div>
)}
          {/* =================================================
    PRODUCT HISTORY
================================================= */}

{activeMenu === "history" && (
  <section
    style={{
      background: darkMode ? "#1f2937" : "#fff",
color: darkMode ? "#fff" : "#111827",
padding: "25px",
borderRadius: "12px",
boxShadow: darkMode
  ? "0 2px 10px rgba(0,0,0,0.30)"
  : "0 2px 10px rgba(0,0,0,0.08)",
    }}
  >
    {/* HEADER */}

    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "15px",
        marginBottom: "20px",
        flexWrap: "wrap",
      }}
    >
      <div>
        <h2
          style={{
            margin: 0,
            marginBottom: "6px",
          }}
        >
          🕒 Product History
        </h2>

        <p
          style={{
            margin: 0,
            color: darkMode ? "#9ca3af" : "#6b7280",
          }}
        >
          কে কোন product কখন add, price change, stock change
          অথবা delete করেছে তার history এখানে দেখা যাবে।
        </p>
      </div>
      {/* =================================================
    PRODUCT HISTORY SEARCH
================================================= */}

<div
  style={{
    display: "flex",
    alignItems: "center",
    gap: "8px",
    minWidth: "280px",
    flex: "1",
    maxWidth: "420px",
  }}
>
  <input
    type="text"
    value={productHistorySearch}
    onChange={(e) =>
      setProductHistorySearch(e.target.value)
    }
    placeholder="🔍 Product name দিয়ে search করুন..."
    style={{
      width: "100%",
      height: "42px",
      padding: "0 13px",
      border: darkMode
  ? "1px solid #4b5563"
  : "1px solid #d1d5db",
background: darkMode ? "#111827" : "#fff",
color: darkMode ? "#fff" : "#111827",
borderRadius: "8px",
outline: "none",
fontSize: "14px",
boxSizing: "border-box",
    }}
  />

  {productHistorySearch && (
    <button
      type="button"
      onClick={() => setProductHistorySearch("")}
      style={{
        height: "42px",
        padding: "0 13px",
        border: darkMode
  ? "1px solid #4b5563"
  : "1px solid #d1d5db",
borderRadius: "8px",
background: darkMode ? "#374151" : "#fff",
color: darkMode ? "#fff" : "#111827",
cursor: "pointer",
fontWeight: "600",
        whiteSpace: "nowrap",
      }}
    >
      Clear
    </button>
  )}
</div>

      <button
        onClick={loadProductHistory}
        disabled={productHistoryLoading}
        style={{
          padding: "10px 16px",
          border: "none",
          borderRadius: "8px",
          background: productHistoryLoading
            ? "#9ca3af"
            : "#2563eb",
          color: "#fff",
          cursor: productHistoryLoading
            ? "not-allowed"
            : "pointer",
          fontWeight: "600",
        }}
      >
        {productHistoryLoading
          ? "⏳ Loading..."
          : "🔄 Refresh"}
      </button>
    </div>

    {/* LOADING */}

    {productHistoryLoading ? (
      <div
        style={{
          padding: "40px",
          textAlign: "center",
          color: darkMode ? "#9ca3af" : "#6b7280",
        }}
      >
        ⏳ Product History loading হচ্ছে...
      </div>
    ) : productHistory.length === 0 ? (
      /* EMPTY */

      <div
        style={{
          padding: "50px 20px",
          textAlign: "center",
          background: darkMode ? "#111827" : "#f8fafc",
border: darkMode
  ? "1px dashed #4b5563"
  : "1px dashed #d1d5db",
          borderRadius: "10px",
          color: darkMode ? "#d1d5db" : "#6b7280",
        }}
      >
        <div
          style={{
            fontSize: "40px",
            marginBottom: "10px",
          }}
        >
          🕒
        </div>

        <strong>No Product History Found</strong>

        <p
          style={{
            marginTop: "8px",
            marginBottom: 0,
          }}
        >
          Product add, price change, stock change অথবা delete
          হলে এখানে history দেখা যাবে।
        </p>
      </div>
    ) : (
      /* HISTORY TABLE */

      <div
        style={{
          width: "100%",
          overflowX: "auto",
          border: darkMode
  ? "1px solid #374151"
  : "1px solid #e5e7eb",
borderRadius: "10px",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: "950px",
          }}
        >
          <thead>
            <tr
  style={{
    background: darkMode ? "#111827" : "#f8fafc",
  }}
>
              <th
                style={{
                  padding: "14px",
                  textAlign: "left",
                  borderBottom: "1px solid #e5e7eb",
                  whiteSpace: "nowrap",
                }}
              >
                Date & Time
              </th>

              <th
                style={{
                  padding: "14px",
                  textAlign: "left",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                User
              </th>

              <th
                style={{
                  padding: "14px",
                  textAlign: "left",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                Role
              </th>

              <th
                style={{
                  padding: "14px",
                  textAlign: "left",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                Action
              </th>

              <th
                style={{
                  padding: "14px",
                  textAlign: "left",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                Product
              </th>

              <th
                style={{
                  padding: "14px",
                  textAlign: "left",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                Old Value
              </th>

              <th
                style={{
                  padding: "14px",
                  textAlign: "left",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                New Value
              </th>
              <th>Edit</th>
            </tr>
          </thead>

          <tbody>
            {filteredProductHistory.map((item) => {
              const actionLabel =
                item.action === "product_added"
                  ? "Product Added"
                  : item.action === "price_changed"
                  ? "Price Changed"
                  : item.action === "stock_changed"
                  ? "Stock Changed"
                  : item.action === "product_deleted"
                  ? "Product Deleted"
                  : item.action;

              const actionBackground =
                item.action === "product_added"
                  ? "#dcfce7"
                  : item.action === "price_changed"
                  ? "#dbeafe"
                  : item.action === "stock_changed"
                  ? "#fef3c7"
                  : item.action === "product_deleted"
                  ? "#fee2e2"
                  : "#f3f4f6";

              const actionColor =
                item.action === "product_added"
                  ? "#166534"
                  : item.action === "price_changed"
                  ? "#1d4ed8"
                  : item.action === "stock_changed"
                  ? "#92400e"
                  : item.action === "product_deleted"
                  ? "#b91c1c"
                  : "#374151";

              return (
                <tr key={item.id}>
                  {/* DATE */}

                  <td
                    style={{
                      padding: "14px",
                      borderBottom: darkMode
  ? "1px solid #374151"
  : "1px solid #f1f5f9",
                      whiteSpace: "nowrap",
                      fontSize: "14px",
                    }}
                  >
                    {item.created_at
                      ? new Date(
                          item.created_at
                        ).toLocaleString("en-BD", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : "N/A"}
                  </td>

                  {/* USER */}

                  <td
                    style={{
                      padding: "14px",
                      borderBottom: darkMode
  ? "1px solid #374151"
  : "1px solid #f1f5f9",
                      minWidth: "180px",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: "700",
                        marginBottom: "4px",
                      }}
                    >
                      {item.user_name || "No Name"}
                    </div>

                    <div
                      style={{
                        fontSize: "13px",
                        color: darkMode ? "#9ca3af" : "#6b7280",
                        wordBreak: "break-word",
                      }}
                    >
                      {item.user_email || "No Email"}
                    </div>
                  </td>

                  {/* ROLE */}

                  <td
                    style={{
                      padding: "14px",
                      borderBottom: darkMode
  ? "1px solid #374151"
  : "1px solid #f1f5f9",
                    }}
                  >
                    <span
                      style={{
                        textTransform: "capitalize",
                        fontWeight: "600",
                      }}
                    >
                      {item.user_role || "N/A"}
                    </span>
                  </td>

                  {/* ACTION */}

                  <td
                    style={{
                      padding: "14px",
                      borderBottom: darkMode
  ? "1px solid #374151"
  : "1px solid #f1f5f9",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-block",
                        padding: "6px 10px",
                        borderRadius: "20px",
                        background:
                          actionBackground,
                        color: actionColor,
                        fontSize: "13px",
                        fontWeight: "700",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {actionLabel}
                    </span>
                  </td>

                  {/* PRODUCT */}

<td
  style={{
    padding: "14px",
    borderBottom: darkMode
  ? "1px solid #374151"
  : "1px solid #f1f5f9",
    fontWeight: "600",
    minWidth: "260px",
  }}
>
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: "12px",
    }}
  >
    {item.product_image_url ? (
      <img
        src={item.product_image_url}
        alt={item.product_name || "Product"}
        style={{
          width: "80px",
          height: "80px",
          objectFit: "cover",
          borderRadius: "8px",
          border: "1px solid #e5e7eb",
          flexShrink: 0,
          background: "#f8fafc",
        }}
      />
    ) : (
      <div
        style={{
          width: "80px",
          height: "80px",
          borderRadius: "8px",
          border: darkMode
  ? "1px solid #374151"
  : "1px solid #e5e7eb",
background: darkMode ? "#111827" : "#f8fafc",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "28px",
          flexShrink: 0,
        }}
      >
        🖼️
      </div>
    )}

    <div
      style={{
        wordBreak: "break-word",
      }}
    >
      {item.product_name || "Deleted Product"}
    </div>
  </div>
</td>

                  {/* OLD VALUE */}

                  <td
                    style={{
                      padding: "14px",
                      borderBottom: darkMode
  ? "1px solid #374151"
  : "1px solid #f1f5f9",
                      color: darkMode ? "#9ca3af" : "#6b7280",
                      maxWidth: "220px",
                      wordBreak: "break-word",
                    }}
                  >
                    {item.old_value || "—"}
                  </td>

                  {/* NEW VALUE */}

                  <td
                    style={{
                      padding: "14px",
                      borderBottom: darkMode
  ? "1px solid #374151"
  : "1px solid #f1f5f9",
                      fontWeight: "600",
                      maxWidth: "220px",
                      wordBreak: "break-word",
                    }}
                  >
                    {item.new_value || "—"}
                  </td>
                  <td
  style={{
    padding: "14px",
    borderBottom: darkMode
  ? "1px solid #374151"
  : "1px solid #f1f5f9",
    textAlign: "center",
  }}
>
  {item.action === "product_deleted" ? (
    <span
      style={{
        color: "#9ca3af",
        fontSize: "13px",
        fontWeight: "600",
      }}
    >
      Deleted
    </span>
  ) : (
    <button
      type="button"
      onClick={() =>
        editProductFromHistory(item)
      }
      style={{
        padding: "8px 12px",
        border: "none",
        borderRadius: "7px",
        background: "#2563eb",
        color: "#fff",
        cursor: "pointer",
        fontSize: "13px",
        fontWeight: "600",
        whiteSpace: "nowrap",
      }}
    >
      ✏️ Edit
    </button>
  )}
</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )}
  </section>
)}
{/* =====================================================
    ORDERS MANAGEMENT
===================================================== */}

{activeMenu === "orders" && (
  <section
    style={{
      background: darkMode ? "#1e293b" : "#ffffff",
      borderRadius: "14px",
      padding: "24px",
      boxShadow: darkMode
        ? "0 4px 18px rgba(0,0,0,0.25)"
        : "0 4px 18px rgba(0,0,0,0.08)",
      color: darkMode ? "#f8fafc" : "#111827",
    }}
  >

    {/* =================================================
        ORDERS HEADER
    ================================================= */}

    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "15px",
        marginBottom: "24px",
        flexWrap: "wrap",
      }}
    >
      <div>
        <h2
          style={{
            margin: 0,
            fontSize: "24px",
            fontWeight: "700",
          }}
        >
          🛒 Orders
        </h2>

        <p
          style={{
            margin: "6px 0 0",
            color: darkMode ? "#94a3b8" : "#6b7280",
            fontSize: "14px",
          }}
        >
          Manage all customer orders
        </p>
      </div>

      <button
        onClick={() => {
          setActiveOrderPage("create-order");
        }}
        style={{
          border: "none",
          borderRadius: "8px",
          padding: "11px 17px",
          background: "#2563eb",
          color: "#fff",
          cursor: "pointer",
          fontSize: "14px",
          fontWeight: "600",
        }}
      >
        ➕ Create New Order
      </button>
    </div>


    {/* =================================================
        SEARCH + FILTERS
    ================================================= */}

    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "minmax(220px, 2fr) minmax(150px, 1fr) minmax(150px, 1fr) auto",
        gap: "12px",
        marginBottom: "20px",
      }}
    >

      {/* SEARCH */}

      <input
        type="text"
        placeholder="🔎 Search mobile number / order number / customer..."
        value={orderSearchTerm}
        onChange={(e) => setOrderSearchTerm(e.target.value)}
        style={{
          width: "100%",
          padding: "11px 13px",
          borderRadius: "8px",
          border: darkMode
            ? "1px solid #475569"
            : "1px solid #d1d5db",
          background: darkMode ? "#0f172a" : "#fff",
          color: darkMode ? "#f8fafc" : "#111827",
          outline: "none",
        }}
      />

      {/* STATUS */}

      <select
        value={orderStatusFilter}
        onChange={(e) =>
          setOrderStatusFilter(e.target.value)
        }
        style={{
          padding: "11px 13px",
          borderRadius: "8px",
          border: darkMode
            ? "1px solid #475569"
            : "1px solid #d1d5db",
          background: darkMode ? "#0f172a" : "#fff",
          color: darkMode ? "#f8fafc" : "#111827",
        }}
      >
        <option value="all">All Status</option>
<option value="pending">Pending</option>
<option value="packaging">Packaging</option>
<option value="shipped">Shipped</option>
<option value="delivered">Delivered</option>
<option value="cancelled">Cancelled</option>
      </select>

      {/* DATE */}

      <input
        type="date"
        value={orderDateFilter}
        onChange={(e) =>
          setOrderDateFilter(e.target.value)
        }
        style={{
          padding: "11px 13px",
          borderRadius: "8px",
          border: darkMode
            ? "1px solid #475569"
            : "1px solid #d1d5db",
          background: darkMode ? "#0f172a" : "#fff",
          color: darkMode ? "#f8fafc" : "#111827",
        }}
      />

      {/* CLEAR */}

      <button
        onClick={() => {
          setOrderSearchTerm("");
          setOrderStatusFilter("all");
          setOrderDateFilter("");
        }}
        style={{
          padding: "11px 16px",
          borderRadius: "8px",
          border: "none",
          background: darkMode ? "#475569" : "#e5e7eb",
          color: darkMode ? "#fff" : "#111827",
          cursor: "pointer",
          fontWeight: "600",
        }}
      >
        Clear
      </button>

    </div>
    {/* =================================================
    BARCODE SCANNER BUTTON
================================================= */}

<div
  style={{
    display: "flex",
    justifyContent: "flex-end",
    marginBottom: "20px",
  }}
>
  <button
    onClick={() => setBarcodeScannerOpen(true)}
    style={{
      border: "none",
      borderRadius: "9px",
      padding: "11px 18px",
      background: "#2563eb",
      color: "#fff",
      cursor: "pointer",
      fontWeight: "700",
      fontSize: "14px",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      boxShadow: "0 2px 6px rgba(37, 99, 235, 0.25)",
    }}
  >
    ▥ Barcode Scanner
  </button>
</div>


{/* =================================================
    BARCODE SCANNER POPUP
================================================= */}

{barcodeScannerOpen && (
  <div
    onClick={(e) => {
      if (e.target === e.currentTarget) {
        setBarcodeScannerOpen(false);
      }
    }}
    style={{
      position: "fixed",
      inset: 0,
      zIndex: 9999,
      background: "rgba(0, 0, 0, 0.55)",
      backdropFilter: "blur(4px)",
      WebkitBackdropFilter: "blur(4px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      boxSizing: "border-box",
    }}
  >

    {/* =================================================
        POPUP CONTAINER
    ================================================= */}

    <div
      style={{
        width: "100%",
        maxWidth: "1150px",
        maxHeight: "90vh",
        display: "flex",
        flexDirection: "column",
        background: darkMode
          ? "#111827"
          : "#ffffff",
        color: darkMode
          ? "#f8fafc"
          : "#111827",
        borderRadius: "16px",
        overflow: "hidden",
        boxShadow:
          "0 25px 60px rgba(0, 0, 0, 0.35)",
        border: darkMode
          ? "1px solid #334155"
          : "1px solid #e5e7eb",
      }}
    >

      {/* =================================================
          POPUP HEADER
      ================================================= */}

      <div
        style={{
          padding: "17px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "15px",
          borderBottom: darkMode
            ? "1px solid #334155"
            : "1px solid #e5e7eb",
          background: darkMode
            ? "#0f172a"
            : "#f8fafc",
        }}
      >

        <div>
          <div
            style={{
              fontSize: "18px",
              fontWeight: "800",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            ▥ Barcode Scanner
          </div>

          <div
            style={{
              marginTop: "4px",
              fontSize: "12px",
              color: darkMode
                ? "#94a3b8"
                : "#64748b",
            }}
          >
            Packaging orders scan করে একসাথে Shipped করুন
          </div>
        </div>


        {/* CLOSE BUTTON */}

        <button
          onClick={() =>
            setBarcodeScannerOpen(false)
          }
          style={{
            width: "36px",
            height: "36px",
            border: "none",
            borderRadius: "8px",
            background: darkMode
              ? "#334155"
              : "#e5e7eb",
            color: darkMode
              ? "#fff"
              : "#374151",
            cursor: "pointer",
            fontSize: "20px",
            fontWeight: "700",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title="Close"
        >
          ×
        </button>

      </div>


      {/* =================================================
          SCANNER INPUT AREA
      ================================================= */}

      <div
        style={{
          padding: "16px 20px",
          borderBottom: darkMode
            ? "1px solid #334155"
            : "1px solid #e5e7eb",
        }}
      >

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "minmax(200px, 1fr) auto auto",
            gap: "10px",
            alignItems: "center",
          }}
        >

          {/* BARCODE INPUT */}

          <input
            ref={barcodeScanInputRef}
            type="text"
            placeholder="▥ Scan barcode..."
            value={barcodeScanTerm}
            onChange={(e) =>
              setBarcodeScanTerm(e.target.value)
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                scanBarcodeOrder();
              }
            }}
            autoFocus
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: "9px",
              border: darkMode
                ? "1px solid #475569"
                : "1px solid #d1d5db",
              background: darkMode
                ? "#0f172a"
                : "#ffffff",
              color: darkMode
                ? "#f8fafc"
                : "#111827",
              outline: "none",
              fontSize: "14px",
              boxSizing: "border-box",
            }}
          />


          {/* SCAN BUTTON */}

          <button
            onClick={scanBarcodeOrder}
            disabled={barcodeScanning}
            style={{
              padding: "12px 18px",
              border: "none",
              borderRadius: "9px",
              background: "#2563eb",
              color: "#fff",
              cursor: barcodeScanning
                ? "not-allowed"
                : "pointer",
              fontWeight: "700",
              opacity: barcodeScanning
                ? 0.7
                : 1,
              whiteSpace: "nowrap",
            }}
          >
            {barcodeScanning
              ? "Scanning..."
              : "▥ Scan"}
          </button>


          {/* CLEAR SCAN */}

          <button
            onClick={() => {
              setScannedOrders([]);
              setSelectedScannedOrderIds([]);
              setBarcodeScanTerm("");

              setTimeout(() => {
                barcodeScanInputRef.current?.focus();
              }, 50);
            }}
            style={{
              padding: "12px 18px",
              border: "none",
              borderRadius: "9px",
              background: darkMode
                ? "#475569"
                : "#e5e7eb",
              color: darkMode
                ? "#ffffff"
                : "#111827",
              cursor: "pointer",
              fontWeight: "700",
              whiteSpace: "nowrap",
            }}
          >
            Clear Scan
          </button>

        </div>

      </div>


      {/* =================================================
          SCANNED ORDERS CONTENT
      ================================================= */}

      <div
        style={{
          flex: 1,
          overflow: "auto",
          minHeight: 0,
        }}
      >

        {scannedOrders.length === 0 ? (

          /* =================================================
              EMPTY STATE
          ================================================= */

          <div
            style={{
              minHeight: "280px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              padding: "40px 20px",
              color: darkMode
                ? "#94a3b8"
                : "#6b7280",
            }}
          >

            <div
              style={{
                fontSize: "42px",
                marginBottom: "12px",
              }}
            >
              ▥
            </div>

            <div
              style={{
                fontSize: "17px",
                fontWeight: "700",
                color: darkMode
                  ? "#e2e8f0"
                  : "#374151",
              }}
            >
              No orders scanned yet
            </div>

            <div
              style={{
                marginTop: "6px",
                fontSize: "13px",
              }}
            >
              Barcode scan করলে Packaging orders এখানে দেখা যাবে
            </div>

          </div>

        ) : (

          <>
            {/* =================================================
                SCANNED HEADER
            ================================================= */}

            <div
              style={{
                padding: "14px 18px",
                background: darkMode
                  ? "#0f172a"
                  : "#f9fafb",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "15px",
                flexWrap: "wrap",
                borderBottom: darkMode
                  ? "1px solid #334155"
                  : "1px solid #e5e7eb",
              }}
            >

              <div>

                <div
                  style={{
                    fontSize: "16px",
                    fontWeight: "800",
                  }}
                >
                  ▥ Scanned Orders{" "}
                  <span
                    style={{
                      color: "#2563eb",
                    }}
                  >
                    {scannedOrders.length}
                  </span>
                </div>

                <div
                  style={{
                    marginTop: "3px",
                    fontSize: "12px",
                    color: darkMode
                      ? "#94a3b8"
                      : "#6b7280",
                  }}
                >
                  Barcode scan করা orders
                </div>

              </div>


              {/* MARK CONTROLS */}

              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  flexWrap: "wrap",
                }}
              >

                <button
                  onClick={markAllScannedOrders}
                  style={{
                    border: "none",
                    borderRadius: "7px",
                    padding: "9px 13px",
                    background: "#2563eb",
                    color: "#fff",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: "700",
                  }}
                >
                  ☑ Mark All
                </button>

                <button
                  onClick={unmarkAllScannedOrders}
                  style={{
                    border: "none",
                    borderRadius: "7px",
                    padding: "9px 13px",
                    background: darkMode
                      ? "#475569"
                      : "#e5e7eb",
                    color: darkMode
                      ? "#fff"
                      : "#111827",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: "700",
                  }}
                >
                  Unmark All
                </button>

              </div>

            </div>


            {/* =================================================
                SCANNED TABLE
            ================================================= */}

            <div
              style={{
                overflowX: "auto",
              }}
            >

              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: "1000px",
                }}
              >

                <thead>

                  <tr
                    style={{
                      background: darkMode
                        ? "#1e293b"
                        : "#ffffff",
                    }}
                  >

                    <th
                      style={{
                        ...orderTableHeaderStyle,
                        width: "60px",
                        textAlign: "center",
                      }}
                    >
                      Mark
                    </th>

                    <th style={orderTableHeaderStyle}>
                      Order
                    </th>

                    <th style={orderTableHeaderStyle}>
                      Customer
                    </th>

                    <th style={orderTableHeaderStyle}>
                      Mobile
                    </th>

                    <th style={orderTableHeaderStyle}>
                      Date & Time
                    </th>

                    <th style={orderTableHeaderStyle}>
                      Total
                    </th>

                    <th style={orderTableHeaderStyle}>
                      Status
                    </th>

                    <th style={orderTableHeaderStyle}>
                      Action
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {scannedOrders.map((order) => {

                    const status = String(
                      order.status || "pending"
                    )
                      .trim()
                      .toLowerCase();

                    const isMarked =
                      selectedScannedOrderIds.includes(
                        order.id
                      );

                    const isPackaging =
                      status === "packaging";

                    return (

                      <tr
                        key={order.id}
                        style={{
                          borderTop: darkMode
                            ? "1px solid #334155"
                            : "1px solid #e5e7eb",
                          background: isMarked
                            ? darkMode
                              ? "#172554"
                              : "#eff6ff"
                            : "transparent",
                        }}
                      >

                        {/* MARK */}

                        <td
                          style={{
                            ...orderTableCellStyle,
                            textAlign: "center",
                          }}
                        >

                          <input
                            type="checkbox"
                            checked={isMarked}
                            disabled={!isPackaging}
                            onChange={() =>
                              toggleScannedOrderMark(
                                order.id
                              )
                            }
                            style={{
                              width: "18px",
                              height: "18px",
                              cursor: isPackaging
                                ? "pointer"
                                : "not-allowed",
                            }}
                          />

                        </td>


                        {/* ORDER */}

                        <td
                          style={orderTableCellStyle}
                        >
                          <strong>
                            {order.order_number || "—"}
                          </strong>
                        </td>


                        {/* CUSTOMER */}

                        <td
                          style={orderTableCellStyle}
                        >
                          {order.customer_name || "—"}
                        </td>


                        {/* MOBILE */}

                        <td
                          style={orderTableCellStyle}
                        >
                          {order.customer_phone || "—"}
                        </td>


                        {/* DATE */}

                        <td
                          style={orderTableCellStyle}
                        >
                          {order.created_at
                            ? new Date(
                                order.created_at
                              ).toLocaleString(
                                "en-BD",
                                {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )
                            : "—"}
                        </td>


                        {/* TOTAL */}

                        <td
                          style={orderTableCellStyle}
                        >
                          <strong>
                            ৳
                            {Number(
                              order.total_amount || 0
                            ).toLocaleString()}
                          </strong>
                        </td>


                        {/* STATUS */}

                        <td
                          style={orderTableCellStyle}
                        >

                          <span
                            style={{
                              display: "inline-block",
                              padding: "5px 10px",
                              borderRadius: "20px",
                              background:
                                status === "packaging"
                                  ? "#fef3c7"
                                  : status === "shipped"
                                  ? "#dbeafe"
                                  : "#e5e7eb",
                              color:
                                status === "packaging"
                                  ? "#b45309"
                                  : status === "shipped"
                                  ? "#1d4ed8"
                                  : "#374151",
                              fontSize: "12px",
                              fontWeight: "700",
                              textTransform:
                                "capitalize",
                            }}
                          >
                            {status}
                          </span>

                        </td>


                        {/* VIEW */}

                        <td
                          style={orderTableCellStyle}
                        >

                          <button
                            onClick={() =>
                              loadOrderDetails(order)
                            }
                            style={{
                              border: "none",
                              borderRadius: "7px",
                              padding: "8px 13px",
                              background: "#2563eb",
                              color: "#fff",
                              cursor: "pointer",
                              fontSize: "13px",
                              fontWeight: "600",
                            }}
                          >
                            👁️ View
                          </button>

                        </td>

                      </tr>

                    );
                  })}

                </tbody>

              </table>

            </div>

          </>

        )}

      </div>


      {/* =================================================
          BULK SHIPPING FOOTER
      ================================================= */}

      {scannedOrders.length > 0 && (

        <div
          style={{
            padding: "14px 18px",
            background: darkMode
              ? "#0f172a"
              : "#f9fafb",
            borderTop: darkMode
              ? "1px solid #334155"
              : "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "15px",
            flexWrap: "wrap",
          }}
        >

          {/* COURIER + SELECTED COUNT */}
<div
  style={{
    display: "flex",
    alignItems: "center",
    gap: "14px",
    flexWrap: "wrap",
  }}
>

  {/* COURIER SELECT */}
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: "8px",
    }}
  >

    <label
      style={{
        fontSize: "13px",
        fontWeight: "700",
        color: darkMode
          ? "#cbd5e1"
          : "#374151",
        whiteSpace: "nowrap",
      }}
    >
      Courier:
    </label>

    <select
      value={selectedCourier}
      onChange={(e) =>
        setSelectedCourier(e.target.value)
      }
      disabled={courierShipping}
      style={{
        minWidth: "150px",
        padding: "9px 12px",
        borderRadius: "8px",
        border: darkMode
          ? "1px solid #475569"
          : "1px solid #d1d5db",
        background: darkMode
          ? "#1e293b"
          : "#ffffff",
        color: darkMode
          ? "#f8fafc"
          : "#111827",
        outline: "none",
        cursor: courierShipping
          ? "not-allowed"
          : "pointer",
        fontSize: "13px",
        fontWeight: "600",
      }}
    >

      {courierOptions.map((courier) => (
        <option
          key={courier.id}
          value={courier.id}
        >
          {courier.name}
        </option>
      ))}

    </select>

  </div>


  {/* SELECTED COUNT */}
  <div
    style={{
      fontSize: "14px",
      fontWeight: "600",
    }}
  >
    Selected:{" "}
    <strong>
      {selectedScannedOrderIds.length}
    </strong>{" "}
    / {scannedOrders.length}
  </div>

</div>


          <button
            onClick={bulkMarkAsShipped}
            disabled={
              bulkShipping ||
              selectedScannedOrderIds.length === 0
            }
            style={{
              border: "none",
              borderRadius: "8px",
              padding: "11px 18px",
              background:
                bulkShipping ||
                selectedScannedOrderIds.length === 0
                  ? "#94a3b8"
                  : "#16a34a",
              color: "#fff",
              cursor:
                bulkShipping ||
                selectedScannedOrderIds.length === 0
                  ? "not-allowed"
                  : "pointer",
              fontWeight: "700",
              fontSize: "14px",
            }}
          >
            {bulkShipping
              ? "Shipping..."
              : `🚚 Mark as Shipped${
                  selectedScannedOrderIds.length > 0
                    ? ` (${selectedScannedOrderIds.length})`
                    : ""
                }`}
          </button>

        </div>

      )}

    </div>

  </div>
)}

    {/* =================================================
        RESULT COUNT
    ================================================= */}

    <div
      style={{
        marginBottom: "14px",
        fontSize: "14px",
        color: darkMode ? "#94a3b8" : "#6b7280",
      }}
    >
      Showing{" "}
      <strong
        style={{
          color: darkMode ? "#fff" : "#111827",
        }}
      >
        {filteredOrders.length}
      </strong>{" "}
      order{filteredOrders.length !== 1 ? "s" : ""}
    </div>


    {/* =================================================
        LOADING
    ================================================= */}

    {ordersLoading ? (
      <div
        style={{
          textAlign: "center",
          padding: "60px 20px",
          color: darkMode ? "#94a3b8" : "#6b7280",
        }}
      >
        ⏳ Loading orders...
      </div>
    ) : filteredOrders.length === 0 ? (

      /* =================================================
         EMPTY
      ================================================= */

      <div
        style={{
          textAlign: "center",
          padding: "60px 20px",
          borderRadius: "10px",
          background: darkMode ? "#0f172a" : "#f9fafb",
          color: darkMode ? "#94a3b8" : "#6b7280",
        }}
      >
        <div
          style={{
            fontSize: "42px",
            marginBottom: "10px",
          }}
        >
          📦
        </div>

        <div
          style={{
            fontSize: "16px",
            fontWeight: "600",
            marginBottom: "5px",
          }}
        >
          No orders found
        </div>

        <div style={{ fontSize: "13px" }}>
          Try another search or create a new order.
        </div>
      </div>

    ) : (

      /* =================================================
         ORDER TABLE
      ================================================= */

      <div
        style={{
          overflowX: "auto",
          borderRadius: "10px",
          border: darkMode
            ? "1px solid #334155"
            : "1px solid #e5e7eb",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: "900px",
          }}
        >

          <thead>
            <tr
              style={{
                background: darkMode
                  ? "#0f172a"
                  : "#f9fafb",
              }}
            >
              <th style={orderTableHeaderStyle}>
                Order
              </th>

              <th style={orderTableHeaderStyle}>
                Customer
              </th>

              <th style={orderTableHeaderStyle}>
                Mobile
              </th>

              <th style={orderTableHeaderStyle}>
                Date & Time
              </th>

              <th style={orderTableHeaderStyle}>
                Total
              </th>

              <th style={orderTableHeaderStyle}>
                Status
              </th>

              <th style={orderTableHeaderStyle}>
                Action
              </th>
            </tr>
          </thead>


          <tbody>

            {filteredOrders.map((order) => {

              const status =
                String(order.status || "pending")
                  .toLowerCase();

              let statusBackground =
                "#fef3c7";

              let statusColor =
                "#92400e";

              if (status === "confirmed") {
                statusBackground = "#dbeafe";
                statusColor = "#1d4ed8";
              }
              if (status === "packaging") {
  statusBackground = "#fef3c7";
  statusColor = "#b45309";
}

if (status === "shipped") {
  statusBackground = "#dbeafe";
  statusColor = "#1d4ed8";
}

              if (status === "delivered") {
                statusBackground = "#dcfce7";
                statusColor = "#166534";
              }

              if (status === "cancelled") {
                statusBackground = "#fee2e2";
                statusColor = "#991b1b";
              }

              return (
                <tr
                  key={order.id}
                  style={{
                    borderTop: darkMode
                      ? "1px solid #334155"
                      : "1px solid #e5e7eb",
                  }}
                >

                  {/* ORDER NUMBER */}

                  <td style={orderTableCellStyle}>
                    <strong>
                      {order.order_number || "—"}
                    </strong>
                  </td>


                  {/* CUSTOMER */}

                  <td style={orderTableCellStyle}>
                    {order.customer_name || "—"}
                  </td>


                  {/* MOBILE */}

                  <td style={orderTableCellStyle}>
                    {order.customer_phone || "—"}
                  </td>


                  {/* DATE */}

                  <td style={orderTableCellStyle}>
                    {order.created_at
                      ? new Date(
                          order.created_at
                        ).toLocaleString(
                          "en-BD",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )
                      : "—"}
                  </td>


                  {/* TOTAL */}

                  <td style={orderTableCellStyle}>
                    <strong>
                      ৳
                      {Number(
                        order.total_amount || 0
                      ).toLocaleString()}
                    </strong>
                  </td>


                  {/* STATUS */}

                  <td style={orderTableCellStyle}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "5px 10px",
                        borderRadius: "20px",
                        background: statusBackground,
                        color: statusColor,
                        fontSize: "12px",
                        fontWeight: "700",
                        textTransform: "capitalize",
                      }}
                    >
                      {status}
                    </span>
                  </td>


                  {/* ACTION */}

                  <td style={orderTableCellStyle}>

                    <button
  onClick={() => loadOrderDetails(order)}
  style={{
    border: "none",
    borderRadius: "7px",
    padding: "8px 13px",
    background: "#2563eb",
    color: "#fff",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
  }}
>
  👁️ View
</button>

                  </td>

                </tr>
              );
            })}

          </tbody>

        </table>
      </div>
    )}

  </section>
)}
{/* =====================================================
    COURIER PANEL
===================================================== */}

{activeMenu === "courier-panel" && (
  <section
    style={{
      background: darkMode ? "#1e293b" : "#ffffff",
      borderRadius: "14px",
      padding: "24px",
      boxShadow: darkMode
        ? "0 4px 18px rgba(0,0,0,0.25)"
        : "0 4px 18px rgba(0,0,0,0.08)",
      color: darkMode ? "#f8fafc" : "#111827",
    }}
  >

    {/* =================================================
    COURIER PANEL HEADER
================================================= */}

<div
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    marginBottom: "24px",
    flexWrap: "wrap",
  }}
>
  {/* LEFT — TITLE */}
  <div>
    <h2
      style={{
        margin: 0,
        fontSize: "24px",
        fontWeight: "700",
      }}
    >
      🚚 Courier Panel
    </h2>

    <p
      style={{
        margin: "6px 0 0",
        color: darkMode
          ? "#94a3b8"
          : "#6b7280",
        fontSize: "14px",
      }}
    >
      Manage courier shipments and tracking
    </p>
  </div>

  {/* RIGHT — SEARCH + DATE + REFRESH */}
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: "10px",
      flexWrap: "wrap",
    }}
  >

    {/* SEARCH */}
    <div
      style={{
        position: "relative",
      }}
    >
      <span
        style={{
          position: "absolute",
          left: "12px",
          top: "50%",
          transform: "translateY(-50%)",
          fontSize: "16px",
          color: "#64748b",
          pointerEvents: "none",
        }}
      >
        🔍
      </span>

      <input
        type="text"
        value={courierSearchTerm}
        onChange={(e) =>
          setCourierSearchTerm(e.target.value)
        }
        placeholder="Search"
        style={{
          width: "190px",
          padding: "10px 12px 10px 36px",
          border: darkMode
            ? "1px solid #475569"
            : "1px solid #cbd5e1",
          borderRadius: "8px",
          background: darkMode
            ? "#0f172a"
            : "#ffffff",
          color: darkMode
            ? "#f8fafc"
            : "#111827",
          fontSize: "14px",
          outline: "none",
        }}
      />
    </div>

    {/* DATE FILTER */}
<div
  style={{
    position: "relative",
  }}
>
    <button
  type="button"
  onClick={() =>
    setShowCourierDateFilter(
      (current) => !current
    )
  }
  style={{
        border: "none",
        borderRadius: "8px",
        padding: "10px 14px",
        background: darkMode
          ? "#334155"
          : "#e5e7eb",
        color: darkMode
          ? "#f8fafc"
          : "#111827",
        cursor: "pointer",
        fontSize: "14px",
        fontWeight: "600",
      }}
    >
      📅{" "}
{courierFromDate || courierToDate
  ? `${courierFromDate || "..."} - ${
      courierToDate || "..."
    }`
  : "From - To"}
    </button>
    {showCourierDateFilter && (
  <div
    style={{
      position: "absolute",
      top: "calc(100% + 8px)",
      right: 0,
      zIndex: 100,
      width: "280px",
      padding: "16px",
      borderRadius: "10px",
      background: darkMode
        ? "#1e293b"
        : "#ffffff",
      border: darkMode
        ? "1px solid #475569"
        : "1px solid #e2e8f0",
      boxShadow:
        "0 8px 25px rgba(0,0,0,0.15)",
    }}
  >
    {/* FROM DATE */}
    <div
      style={{
        marginBottom: "12px",
      }}
    >
      <label
        style={{
          display: "block",
          marginBottom: "6px",
          fontSize: "13px",
          fontWeight: "600",
          color: darkMode
            ? "#cbd5e1"
            : "#475569",
        }}
      >
        From Date
      </label>

      <input
        type="date"
        value={courierFromDate}
        onChange={(e) =>
          setCourierFromDate(e.target.value)
        }
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "9px 10px",
          borderRadius: "7px",
          border: darkMode
            ? "1px solid #475569"
            : "1px solid #cbd5e1",
          background: darkMode
            ? "#0f172a"
            : "#ffffff",
          color: darkMode
            ? "#f8fafc"
            : "#111827",
          fontSize: "13px",
        }}
      />
    </div>

    {/* TO DATE */}
    <div
      style={{
        marginBottom: "14px",
      }}
    >
      <label
        style={{
          display: "block",
          marginBottom: "6px",
          fontSize: "13px",
          fontWeight: "600",
          color: darkMode
            ? "#cbd5e1"
            : "#475569",
        }}
      >
        To Date
      </label>

      <input
        type="date"
        value={courierToDate}
        onChange={(e) =>
          setCourierToDate(e.target.value)
        }
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "9px 10px",
          borderRadius: "7px",
          border: darkMode
            ? "1px solid #475569"
            : "1px solid #cbd5e1",
          background: darkMode
            ? "#0f172a"
            : "#ffffff",
          color: darkMode
            ? "#f8fafc"
            : "#111827",
          fontSize: "13px",
        }}
      />
    </div>

    {/* CLEAR */}
    <button
      type="button"
      onClick={() => {
        setCourierFromDate("");
        setCourierToDate("");
      }}
      style={{
        width: "100%",
        border: "none",
        borderRadius: "7px",
        padding: "9px",
        background: darkMode
          ? "#334155"
          : "#e5e7eb",
        color: darkMode
          ? "#f8fafc"
          : "#111827",
        cursor: "pointer",
        fontSize: "13px",
        fontWeight: "600",
      }}
    >
      Clear Dates
    </button>
  </div>
)}
</div>

    {/* REFRESH */}
    <button
      onClick={loadCourierShipments}
      disabled={courierShipmentsLoading}
      style={{
        border: "none",
        borderRadius: "8px",
        padding: "10px 15px",
        background: "#2563eb",
        color: "#fff",
        cursor: courierShipmentsLoading
          ? "not-allowed"
          : "pointer",
        fontSize: "14px",
        fontWeight: "600",
        opacity: courierShipmentsLoading
          ? 0.7
          : 1,
      }}
    >
      {courierShipmentsLoading
        ? "Refreshing..."
        : "🔄 Refresh"}
    </button>

  </div>
</div>


    {/* =================================================
        COURIER TABS
    ================================================= */}

    <div
      style={{
        display: "flex",
        gap: "8px",
        flexWrap: "wrap",
        marginBottom: "20px",
      }}
    >

      {[
        {
          id: "all",
          label: "All",
          icon: "📦",
        },
        {
          id: "steadfast",
          label: "Steadfast",
          icon: "🚚",
        },
        {
          id: "pathao",
          label: "Pathao",
          icon: "🛵",
        },
        {
          id: "redx",
          label: "REDX",
          icon: "🚛",
        },
      ].map((courier) => (

        <button
          key={courier.id}
          onClick={() =>
            setActiveCourier(courier.id)
          }
          style={{
            border: "none",
            borderRadius: "8px",
            padding: "10px 16px",
            background:
              activeCourier === courier.id
                ? "#2563eb"
                : darkMode
                ? "#334155"
                : "#e5e7eb",
            color:
              activeCourier === courier.id
                ? "#fff"
                : darkMode
                ? "#f8fafc"
                : "#111827",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "700",
          }}
        >
          {courier.icon} {courier.label}
        </button>

      ))}

    </div>
    <div id="courier-report-print">
      {/* =====================================================
    PRINT ONLY COURIER REPORT HEADER
===================================================== */}

<div
  className="courier-print-only-header"
  style={{
    display: "none",
    textAlign: "center",
    marginBottom: "25px",
  }}
>
  <div
    style={{
      fontSize: "30px",
      fontWeight: "800",
      letterSpacing: "1px",
    }}
  >
    SANVEE'S
  </div>

  <div
    style={{
      fontSize: "13px",
      color: "#6b7280",
      marginTop: "3px",
    }}
  >
    by Tony
  </div>

  <div
    style={{
      marginTop: "10px",
      fontSize: "20px",
      fontWeight: "700",
    }}
  >
    COURIER REPORT
  </div>

  <div
    style={{
      marginTop: "12px",
      fontSize: "14px",
      fontWeight: "600",
    }}
  >
    Courier:{" "}
    {activeCourier === "all"
      ? "All Couriers"
      : activeCourier === "steadfast"
      ? "Steadfast"
      : activeCourier === "pathao"
      ? "Pathao"
      : activeCourier === "redx"
      ? "REDX"
      : activeCourier}
  </div>

  <div
    style={{
      fontSize: "13px",
      color: "#6b7280",
      marginTop: "3px",
    }}
  >
    Date: {courierFromDate || "All"} –{" "}
    {courierToDate || "Today"}
  </div>
</div>
    {/* =====================================================
    COURIER REPORT SUMMARY
===================================================== */}

<div
  className="courier-report-summary"
  style={{
    display: "flex",
    gap: "14px",
    marginBottom: "20px",
    flexWrap: "wrap",
  }}
>
  {/* TOTAL PARCELS */}
  <div
    style={{
      flex: "1 1 220px",
      padding: "16px 18px",
      borderRadius: "10px",
      background: darkMode
        ? "#1e293b"
        : "#f8fafc",
      border: darkMode
        ? "1px solid #334155"
        : "1px solid #e2e8f0",
    }}
  >
    <div
      style={{
        fontSize: "13px",
        color: darkMode
          ? "#94a3b8"
          : "#64748b",
        marginBottom: "6px",
      }}
    >
      📦 Total Parcels
    </div>

    <div
      style={{
        fontSize: "22px",
        fontWeight: "700",
        color: darkMode
          ? "#f8fafc"
          : "#111827",
      }}
    >
      {courierReportTotalParcels}
    </div>
  </div>

  {/* TOTAL AMOUNT */}
  <div
    style={{
      flex: "1 1 220px",
      padding: "16px 18px",
      borderRadius: "10px",
      background: darkMode
        ? "#1e293b"
        : "#f8fafc",
      border: darkMode
        ? "1px solid #334155"
        : "1px solid #e2e8f0",
    }}
  >
    <div
      style={{
        fontSize: "13px",
        color: darkMode
          ? "#94a3b8"
          : "#64748b",
        marginBottom: "6px",
      }}
    >
      💰 Total Amount
    </div>

    <div
      style={{
        fontSize: "22px",
        fontWeight: "700",
        color: darkMode
          ? "#f8fafc"
          : "#111827",
      }}
    >
      ৳{" "}
      {courierReportTotalAmount.toLocaleString(
        "en-BD"
      )}
    </div>
  </div>
</div>
{/* =====================================================
    PRINT COURIER REPORT
===================================================== */}

<div
  style={{
    display: "flex",
    justifyContent: "flex-end",
    marginBottom: "20px",
  }}
>
  <button
    type="button"
    onClick={() => {
      window.print();
    }}
    style={{
      border: "none",
      borderRadius: "8px",
      padding: "10px 16px",
      background: "#16a34a",
      color: "#fff",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: "700",
    }}
  >
    🖨️ Print Report
  </button>
</div>


    {/* =================================================
        EMPTY STATE
    ================================================= */}

    {filteredCourierShipments.length === 0 ? (

      <div
        style={{
          minHeight: "300px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          borderRadius: "12px",
          background: darkMode
            ? "#0f172a"
            : "#f9fafb",
          border: darkMode
            ? "1px solid #334155"
            : "1px solid #e5e7eb",
        }}
      >

        <div
          style={{
            fontSize: "46px",
            marginBottom: "12px",
          }}
        >
          🚚
        </div>

        <div
          style={{
            fontSize: "18px",
            fontWeight: "700",
          }}
        >
          No courier shipments yet
        </div>

        <div
          style={{
            marginTop: "6px",
            fontSize: "13px",
            color: darkMode
              ? "#94a3b8"
              : "#6b7280",
          }}
        >
          Barcode Scanner থেকে order Shipped করলে
          এখানে shipment দেখা যাবে।
        </div>

      </div>

    ) : (

      /* =================================================
          SHIPMENT TABLE
      ================================================= */

      <div
        style={{
          overflowX: "auto",
          borderRadius: "10px",
          border: darkMode
            ? "1px solid #334155"
            : "1px solid #e5e7eb",
        }}
      >

        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: "1100px",
          }}
        >

          <thead>

            <tr
              style={{
                background: darkMode
                  ? "#0f172a"
                  : "#f9fafb",
              }}
            >

              <th style={orderTableHeaderStyle}>
                Order
              </th>

              <th style={orderTableHeaderStyle}>
                Customer
              </th>

              <th style={orderTableHeaderStyle}>
                Courier
              </th>

              <th style={orderTableHeaderStyle}>
                Shipment Status
              </th>

              <th style={orderTableHeaderStyle}>
                API Status
              </th>

              <th style={orderTableHeaderStyle}>
                Tracking
              </th>

              <th style={orderTableHeaderStyle}>
                Consignment
              </th>

              <th style={orderTableHeaderStyle}>
                Created
              </th>
              <th>Action</th>

            </tr>

          </thead>

          <tbody>

            {filteredCourierShipments.map(
              (shipment) => {

                const shipmentStatus =
                  String(
                    shipment.shipment_status ||
                      "ready_to_ship"
                  )
                    .trim()
                    .toLowerCase();

                const apiStatus =
                  String(
                    shipment.api_status ||
                      "not_connected"
                  )
                    .trim()
                    .toLowerCase();

                return (
                  <tr
                    key={shipment.id}
                    style={{
                      borderTop: darkMode
                        ? "1px solid #334155"
                        : "1px solid #e5e7eb",
                    }}
                  >

                    {/* ORDER */}

                    <td
                      style={orderTableCellStyle}
                    >
                      <strong>
                        {shipment.orders
                          ?.order_number ||
                          shipment.metadata
                            ?.order_number ||
                          "—"}
                      </strong>
                    </td>


                    {/* CUSTOMER */}

                    <td
                      style={orderTableCellStyle}
                    >
                      <div>
                        <strong>
                          {shipment.orders
                            ?.customer_name ||
                            shipment.metadata
                              ?.customer_name ||
                            "—"}
                        </strong>

                        <div
                          style={{
                            marginTop: "3px",
                            fontSize: "12px",
                            color: darkMode
                              ? "#94a3b8"
                              : "#6b7280",
                          }}
                        >
                          {shipment.orders
                            ?.customer_phone ||
                            shipment.metadata
                              ?.customer_phone ||
                            "—"}
                        </div>
                      </div>
                    </td>


                    {/* COURIER */}

                    <td
                      style={{
                        ...orderTableCellStyle,
                        textTransform:
                          "capitalize",
                        fontWeight: "700",
                      }}
                    >
                      {shipment.courier ===
                      "steadfast"
                        ? "🚚 Steadfast"
                        : shipment.courier ===
                          "pathao"
                        ? "🛵 Pathao"
                        : shipment.courier ===
                          "redx"
                        ? "🚛 REDX"
                        : shipment.courier ||
                          "—"}
                    </td>


                    {/* SHIPMENT STATUS */}

                    <td
                      style={orderTableCellStyle}
                    >

                      <span
                        style={{
                          display:
                            "inline-block",
                          padding:
                            "5px 10px",
                          borderRadius:
                            "20px",
                          background:
                            shipmentStatus ===
                            "delivered"
                              ? "#dcfce7"
                              : shipmentStatus ===
                                "shipped"
                              ? "#dbeafe"
                              : shipmentStatus ===
                                "failed"
                              ? "#fee2e2"
                              : shipmentStatus ===
                                "cancelled"
                              ? "#e5e7eb"
                              : "#fef3c7",
                          color:
                            shipmentStatus ===
                            "delivered"
                              ? "#166534"
                              : shipmentStatus ===
                                "shipped"
                              ? "#1d4ed8"
                              : shipmentStatus ===
                                "failed"
                              ? "#b91c1c"
                              : shipmentStatus ===
                                "cancelled"
                              ? "#374151"
                              : "#92400e",
                          fontSize: "12px",
                          fontWeight: "700",
                          textTransform:
                            "capitalize",
                        }}
                      >
                        {shipmentStatus.replace(
                          /_/g,
                          " "
                        )}
                      </span>

                    </td>


                    {/* API STATUS */}

                    <td
                      style={orderTableCellStyle}
                    >

                      <span
                        style={{
                          display:
                            "inline-block",
                          padding:
                            "5px 10px",
                          borderRadius:
                            "20px",
                          background:
                            apiStatus ===
                            "success"
                              ? "#dcfce7"
                              : apiStatus ===
                                "failed"
                              ? "#fee2e2"
                              : "#e5e7eb",
                          color:
                            apiStatus ===
                            "success"
                              ? "#166534"
                              : apiStatus ===
                                "failed"
                              ? "#b91c1c"
                              : darkMode
                              ? "#e2e8f0"
                              : "#374151",
                          fontSize: "12px",
                          fontWeight: "700",
                          textTransform:
                            "capitalize",
                        }}
                      >
                        {apiStatus.replace(
                          /_/g,
                          " "
                        )}
                      </span>

                    </td>


                    {/* TRACKING */}

                    <td
                      style={orderTableCellStyle}
                    >
                      {shipment.tracking_code ||
                        "—"}
                    </td>


                    {/* CONSIGNMENT */}

                    <td
                      style={orderTableCellStyle}
                    >
                      {shipment.consignment_id ||
                        "—"}
                    </td>


                    {/* CREATED */}

                    <td
                      style={orderTableCellStyle}
                    >
                      {shipment.created_at
                        ? new Date(
                            shipment.created_at
                          ).toLocaleString(
                            "en-BD",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )
                        : "—"}
                    </td>
                    <td style={{ padding: "12px" }}>
  <button
    onClick={() => {
      setSelectedCourierShipment(shipment);
      setCourierTrackingOpen(true);
    }}
    style={{
      padding: "7px 12px",
      border: "none",
      borderRadius: "6px",
      background: "#2563eb",
      color: "#fff",
      cursor: "pointer",
      fontSize: "13px",
      fontWeight: "600",
    }}
  >
    👁 View Tracking
  </button>
</td>

                  </tr>
                );
              }
            )}

          </tbody>

        </table>

      </div>

    )}
    {/* =====================================================
    FINAL REPORT
===================================================== */}

<div
  className="courier-final-report"
  style={{
    marginTop: "28px",
    marginLeft: "auto",
    width: "300px",
    textAlign: "right",
    borderTop: "2px solid #111827",
    paddingTop: "12px",
  }}
>
  <div
    style={{
      fontSize: "16px",
      fontWeight: "800",
      marginBottom: "10px",
      letterSpacing: "0.5px",
    }}
  >
    FINAL REPORT
  </div>

  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      gap: "20px",
      fontSize: "14px",
      marginBottom: "6px",
    }}
  >
    <span>Total Parcels</span>

    <strong>
      {courierReportTotalParcels}
    </strong>
  </div>

  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      gap: "20px",
      fontSize: "14px",
      marginBottom: "6px",
    }}
  >
    <span>Total Amount</span>

    <strong>
      ৳{" "}
      {courierReportTotalAmount.toLocaleString(
        "en-BD"
      )}
    </strong>
  </div>

  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      gap: "20px",
      fontSize: "14px",
      marginBottom: "6px",
    }}
  >
    <span>Courier</span>

    <strong>
      {activeCourier === "all"
        ? "All Couriers"
        : activeCourier === "steadfast"
        ? "Steadfast"
        : activeCourier === "pathao"
        ? "Pathao"
        : activeCourier === "redx"
        ? "REDX"
        : activeCourier}
    </strong>
  </div>

  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      gap: "20px",
      fontSize: "14px",
    }}
  >
    <span>Report Date</span>

    <strong>
      {courierFromDate ||
        new Date().toLocaleDateString(
          "en-GB",
          {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }
        )}
    </strong>
  </div>
</div>
    </div>

  </section>
)}
          {/* =================================================
              PRODUCTS
          ================================================= */}

          {activeMenu === "products" && (
            <>
{/* =================================================
    PRODUCTS SEARCH + FILTERS
================================================= */}

<section
  id="product-search-section"
  style={{
    background: darkMode ? "#1f2937" : "#fff",
    color: darkMode ? "#fff" : "#111827",
    padding: "18px 20px",
    borderRadius: "12px",
    boxShadow: darkMode
      ? "0 2px 10px rgba(0,0,0,0.30)"
      : "0 2px 10px rgba(0,0,0,0.08)",
    marginBottom: "25px",
  }}
>
  <div
  style={{
    display: "grid",

    gridTemplateColumns:
      "minmax(180px, 1.5fr) minmax(150px, 1fr) minmax(150px, 1fr) minmax(150px, 1fr) auto",

    gap: "10px",

    width: "100%",

    paddingRight:
      activeMenu === "products" &&
      allProductsActive &&
      orderPanelOpen
        ? "380px"
        : "0px",

    boxSizing: "border-box",

    alignItems: "center",
  }}
>

    {/* =========================
        SEARCH PRODUCTS
    ========================= */}

    <div
      style={{
        flex: "1.4 1 220px",
        minWidth: "200px",
      }}
    >
      <input
        type="text"
        placeholder="🔍 Search Products..."
        value={searchTerm}
        onChange={(e) =>
          setSearchTerm(e.target.value)
        }
        style={{
  width: "100%",
  padding: "9px 10px",
  border: darkMode
    ? "1px solid #4b5563"
    : "1px solid #d1d5db",
  borderRadius: "8px",
  boxSizing: "border-box",
  fontSize: "14px",
  outline: "none",
  background: darkMode ? "#111827" : "#fff",
  color: darkMode ? "#fff" : "#111827",
}}
      />
    </div>


    {/* =========================
        CATEGORY
    ========================= */}

    <div
      style={{
        flex: "1 1 160px",
        minWidth: "150px",
      }}
    >
      <select
        value={categoryFilter}
        onChange={(e) =>
          setCategoryFilter(e.target.value)
        }
        style={{
  width: "100%",
  padding: "9px 10px",
  border: darkMode
    ? "1px solid #4b5563"
    : "1px solid #d1d5db",
  borderRadius: "8px",
  boxSizing: "border-box",
  background: darkMode ? "#111827" : "#fff",
  color: darkMode ? "#fff" : "#111827",
  cursor: "pointer",
  fontSize: "14px",
}}
      >
        <option value="all">
          📂 All Categories
        </option>

        <option value="dress">
          👗 Dress
        </option>

        <option value="saree">
          🥻 Saree
        </option>
      </select>
    </div>


    {/* =========================
        COLOUR
    ========================= */}

    <div
      style={{
        flex: "1 1 160px",
        minWidth: "150px",
      }}
    >
      <select
        value={colorFilter}
        onChange={(e) =>
          setColorFilter(e.target.value)
        }
        style={{
  width: "100%",
  padding: "11px 12px",
  border: darkMode
    ? "1px solid #4b5563"
    : "1px solid #d1d5db",
  borderRadius: "8px",
  boxSizing: "border-box",
  background: darkMode ? "#111827" : "#fff",
  color: darkMode ? "#fff" : "#111827",
  cursor: "pointer",
  fontSize: "14px",
}}
      >
        <option value="all">
          🎨 All Colors
        </option>

        {availableColors.map((color) => (
          <option
            key={color}
            value={color}
          >
            🎨{" "}
            {color.charAt(0).toUpperCase() +
              color.slice(1)}
          </option>
        ))}
      </select>
    </div>


    {/* =========================
        PRICE RANGE
    ========================= */}

    <div
      style={{
        position: "relative",
        flex: "1 1 170px",
        minWidth: "160px",
      }}
    >
      <button
        type="button"
        onClick={() =>
          setShowPriceRange(!showPriceRange)
        }
        style={{
  width: "100%",
  padding: "9px 10px",
  border: darkMode
    ? "1px solid #4b5563"
    : "1px solid #d1d5db",
  borderRadius: "8px",
  background: darkMode ? "#111827" : "#fff",
  color: darkMode ? "#fff" : "#111827",
  cursor: "pointer",
  fontSize: "14px",
  textAlign: "left",
}}
      >
        💰 Price Range
        <span
          style={{
            float: "right",
          }}
        >
          ▼
        </span>
      </button>

      {showPriceRange && (
        <div
          style={{
  position: "absolute",
  top: "48px",
  left: "0",
  width: "240px",
  background: darkMode ? "#1f2937" : "#fff",
  color: darkMode ? "#fff" : "#111827",
  border: darkMode
    ? "1px solid #374151"
    : "1px solid #ddd",
  borderRadius: "10px",
  padding: "15px",
  boxShadow: darkMode
    ? "0 5px 15px rgba(0,0,0,0.35)"
    : "0 5px 15px rgba(0,0,0,0.12)",
  zIndex: 100,
}}
        >
          <div
            style={{
              display: "flex",
              gap: "8px",
            }}
          >
            <input
              type="number"
              placeholder="Min"
              value={minPrice}
              onChange={(e) =>
                setMinPrice(e.target.value)
              }
              style={{
                width: "50%",
                padding: "9px",
                border: "1px solid #d1d5db",
                borderRadius: "7px",
                boxSizing: "border-box",
              }}
            />

            <input
              type="number"
              placeholder="Max"
              value={maxPrice}
              onChange={(e) =>
                setMaxPrice(e.target.value)
              }
              style={{
                width: "50%",
                padding: "9px",
                border: "1px solid #d1d5db",
                borderRadius: "7px",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>
      )}
    </div>


    {/* =========================
        CLEAR
    ========================= */}

    <button
      type="button"
      onClick={() => {
        setSearchTerm("");
        setCategoryFilter("all");
        setColorFilter("all");
        setMinPrice("");
        setMaxPrice("");
        setShowPriceRange(false);
        setCategoryColorPage(1);
      }}
      style={{
        padding: "0 14px",
        border: "none",
        borderRadius: "8px",
        background: "#ef4444",
        color: "#fff",
        cursor: "pointer",
        fontSize: "14px",
        fontWeight: "600",
        whiteSpace: "nowrap",
      }}
    >
      ✕ Clear
    </button>

  </div>
</section>
{/* =====================================================
    ORDER PANEL
===================================================== */}

{allProductsActive && (
  <div
    style={{
      position: "fixed",
      top: "0",
      right: "0",
      width: "360px",
      height: "100vh",
      background: "#fff",
      borderLeft: "1px solid #e5e7eb",
      boxShadow: "-4px 0 15px rgba(0,0,0,0.08)",
      zIndex: 1000,
      display: "flex",
      flexDirection: "column",
    }}
  >
    {/* HEADER */}
    <div
      style={{
        padding: "18px",
        borderBottom: "1px solid #e5e7eb",
        background: "#f8fafc",
      }}
    >
      <h2 style={{ margin: 0, fontSize: "20px" }}>
        🛒 Create Order
      </h2>
    </div>

    {/* CUSTOMER */}
    <div
      style={{
        padding: "18px",
        borderBottom: "1px solid #e5e7eb",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "12px",
        }}
      >
        <input
  type="tel"
  value={customerPhone}
  onChange={(e) => {
    const phone = e.target.value;

    setCustomerPhone(phone);

    findCustomerByPhone(phone);
  }}
          style={{
            flex: 1,
            padding: "11px 12px",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            fontSize: "14px",
          }}
        />

        <button
          type="button"
          onClick={() => setCustomerPopupOpen(true)}
          style={{
            width: "42px",
            height: "42px",
            border: "none",
            borderRadius: "8px",
            background: "#2563eb",
            color: "#fff",
            fontSize: "22px",
            cursor: "pointer",
          }}
        >
          +
        </button>
      </div>

      <textarea
        placeholder="Customer Address"
        value={customerAddress}
        onChange={(e) =>
          setCustomerAddress(e.target.value)
        }
        rows={3}
        style={{
          width: "100%",
          padding: "11px 12px",
          border: "1px solid #d1d5db",
          borderRadius: "8px",
          fontSize: "14px",
          resize: "vertical",
          boxSizing: "border-box",
        }}
      />
    </div>

    {/* CART */}
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "18px",
      }}
    >
      {orderCart.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            color: "#9ca3af",
            padding: "40px 10px",
          }}
        >
          🛍️
          <div style={{ marginTop: "10px" }}>
            No products added
          </div>
        </div>
      ) : (
        orderCart.map((item) => (
          <div
            key={`${item.product_id}-${item.color}`}
            style={{
              display: "flex",
              gap: "10px",
              marginBottom: "15px",
              paddingBottom: "15px",
              borderBottom: "1px solid #e5e7eb",
            }}
          >
            {item.product_image_url ? (
              <img
                src={item.product_image_url}
                alt={item.product_name}
                style={{
                  width: "65px",
                  height: "65px",
                  objectFit: "cover",
                  borderRadius: "8px",
                }}
              />
            ) : (
              <div
                style={{
                  width: "65px",
                  height: "65px",
                  borderRadius: "8px",
                  background: "#f3f4f6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                🖼️
              </div>
            )}

            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontWeight: "600",
                  fontSize: "14px",
                  marginBottom: "4px",
                }}
              >
                {item.product_name}
              </div>

              <div
                style={{
                  fontSize: "13px",
                  color: "#6b7280",
                  marginBottom: "7px",
                }}
              >
                ৳{Number(item.unit_price || 0).toFixed(0)}
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <button
                  type="button"
                  onClick={() =>
  decreaseOrderCartQuantity(
  item.product_id,
  item.color,
  item.size
)
}
                  style={{
                    width: "28px",
                    height: "28px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    background: "#fff",
                    cursor: "pointer",
                  }}
                >
                  −
                </button>

                <span
                  style={{
                    minWidth: "20px",
                    textAlign: "center",
                    fontWeight: "600",
                  }}
                >
                  {item.quantity}
                </span>

                <button
                  type="button"
                  onClick={() =>
  increaseOrderCartQuantity(
    item.product_id,
    item.color,
    item.size
  )
}
                  style={{
                    width: "28px",
                    height: "28px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    background: "#fff",
                    cursor: "pointer",
                  }}
                >
                  +
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>

    {/* TOTAL */}
    <div
      style={{
        borderTop: "1px solid #e5e7eb",
        padding: "18px",
      }}
    >
      {/* DELIVERY OPTIONS */}
<div
  style={{
    marginBottom: "16px",
  }}
>
  <div
    style={{
      fontWeight: "600",
      fontSize: "14px",
      marginBottom: "10px",
    }}
  >
    Delivery Charge
  </div>

  <div
    style={{
      display: "flex",
      gap: "8px",
    }}
  >
    <button
      type="button"
      onClick={() => setDeliveryType("free")}
      style={{
        flex: 1,
        padding: "10px 8px",
        border:
          deliveryType === "free"
            ? "2px solid #2563eb"
            : "1px solid #d1d5db",
        borderRadius: "8px",
        background:
          deliveryType === "free"
            ? "#eff6ff"
            : "#fff",
        color:
          deliveryType === "free"
            ? "#2563eb"
            : "#374151",
        fontWeight: "600",
        cursor: "pointer",
      }}
    >
      Free
    </button>

    <button
      type="button"
      onClick={() => setDeliveryType("80")}
      style={{
        flex: 1,
        padding: "10px 8px",
        border:
          deliveryType === "80"
            ? "2px solid #2563eb"
            : "1px solid #d1d5db",
        borderRadius: "8px",
        background:
          deliveryType === "80"
            ? "#eff6ff"
            : "#fff",
        color:
          deliveryType === "80"
            ? "#2563eb"
            : "#374151",
        fontWeight: "600",
        cursor: "pointer",
      }}
    >
      ৳80
    </button>

    <button
      type="button"
      onClick={() => setDeliveryType("150")}
      style={{
        flex: 1,
        padding: "10px 8px",
        border:
          deliveryType === "150"
            ? "2px solid #2563eb"
            : "1px solid #d1d5db",
        borderRadius: "8px",
        background:
          deliveryType === "150"
            ? "#eff6ff"
            : "#fff",
        color:
          deliveryType === "150"
            ? "#2563eb"
            : "#374151",
        fontWeight: "600",
        cursor: "pointer",
      }}
    >
      ৳150
    </button>
  </div>
</div>
      <div
  style={{
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "8px",
  }}
>
  <span>Delivery</span>

  <strong>
    {deliveryCharge === 0
      ? "Free"
      : `৳${deliveryCharge.toFixed(0)}`}
  </strong>
</div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "18px",
          paddingTop: "10px",
          borderTop: "1px solid #e5e7eb",
        }}
      >
        <strong>Total</strong>
        <strong>
          ৳{orderTotal.toFixed(0)}
        </strong>
      </div>
      
      <button
  type="button"
  onClick={placeOrder}
  disabled={orderSubmitting || orderCart.length === 0}
  style={{
    width: "100%",
    marginTop: "16px",
    padding: "13px",
    border: "none",
    borderRadius: "8px",
    background:
      orderSubmitting || orderCart.length === 0
        ? "#9ca3af"
        : "#16a34a",
    color: "#fff",
    fontSize: "15px",
    fontWeight: "700",
    cursor:
      orderSubmitting || orderCart.length === 0
        ? "not-allowed"
        : "pointer",
  }}
>
  {orderSubmitting ? "Placing Order..." : "✓ Place Order"}
</button>
    </div>
  </div>
)}
{/* ALL PRODUCTS */} 
 
{/* ALL PRODUCTS */}

<section
  id="all-products-section"
  style={{
    paddingRight:
      activeMenu === "products" &&
      allProductsActive &&
      orderPanelOpen
        ? "380px"
        : "0px",

    boxSizing: "border-box",
  }}
>

  {/* =====================================================
      ALL PRODUCTS HEADER
  ===================================================== */}

  <div
    className="products-header"
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: "15px",
      marginBottom: "15px",
      flexWrap: "wrap",
    }}
  >

    <h2
      style={{
        margin: 0,
      }}
    >
      📋 All Products
    </h2>

    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
      }}
    >
      <span
  style={{
    color: darkMode ? "#d1d5db" : "#6b7280",
  }}
>
  {filteredProducts.length} Products
</span>

      <button
        type="button"
        onClick={() => {
          setSearchTerm("");
          setCategoryFilter("all");
          setColorFilter("all");

          setMinPrice("");
          setMaxPrice("");

          setShowPriceRange(false);

          setCategoryColorPage(1);
        }}
        style={{
  padding: "5px 10px",
  border: darkMode
    ? "1px solid #4b5563"
    : "1px solid #d1d5db",
  borderRadius: "6px",
  background: darkMode ? "#374151" : "#fff",
  color: darkMode ? "#fff" : "#374151",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: "600",
}}
      >
        ✕ Clear
      </button>
    </div>

  </div>


  {/* =====================================================
      PRODUCTS / LOADING / EMPTY
  ===================================================== */}

  {loading ? (

    <div
      className="empty"
      style={{
  background: darkMode ? "#1f2937" : "#fff",
  color: darkMode ? "#fff" : "#111827",
  padding: "30px",
  borderRadius: "12px",
  textAlign: "center",
}}
    >
      ⏳ Products loading...
    </div>

  ) : products.length === 0 ? (

    <div
      className="empty"
      style={{
        background: "#fff",
        padding: "30px",
        borderRadius: "12px",
        textAlign: "center",
      }}
    >
      এখনো কোনো product add করা হয়নি।
    </div>

  ) : filteredProducts.length === 0 ? (

    <div
      className="empty"
      style={{
        background: "#fff",
        padding: "30px",
        borderRadius: "12px",
        textAlign: "center",
      }}
    >
      🔍 কোনো product পাওয়া যায়নি।
    </div>

  ) : (

    /* =====================================================
       PRODUCT GRID
    ===================================================== */

    <div
      className="product-grid"
      style={{
        display: "grid",
        gridTemplateColumns:
  "repeat(auto-fill,minmax(200px, 1fr))",
        gap: "20px",
        alignItems: "stretch",
      }}
    >

      {paginatedFilteredProducts.map((item) => {

  // =========================================================
  // COLOR VARIANT / SELECTED COLOR
  // =========================================================

  const hasColorVariants =
    Array.isArray(item.color_variants) &&
    item.color_variants.length > 0;

  // Product has a usable color selection only when
  // main color or color variants exist.
  const hasColor =
    Boolean(item.color) || hasColorVariants;


  // =========================================================
  // SELECTED COLOR + IMAGE
  // =========================================================

  const selectedColorData =
    getSelectedColorData(item);

  const selectedColor =
    selectedColorData.color ||
    item.color ||
    "";

  const selectedImage =
    selectedColorData.image ||
    item.image_url;


  // =========================================================
// SIZE
// =========================================================

// Main product sizes
const mainProductSizes =
  Array.isArray(item.sizes)
    ? item.sizes
        .map((sizeItem) => sizeItem.size)
        .filter(Boolean)
    : [];

// Color Variant sizes
const variantProductSizes =
  Array.isArray(item.color_variants)
    ? item.color_variants.flatMap(
        (variant) =>
          Array.isArray(variant.sizes)
            ? variant.sizes
                .map((sizeItem) => sizeItem.size)
                .filter(Boolean)
            : []
      )
    : [];

// Old products compatibility
const oldProductSizes =
  Array.isArray(item.size)
    ? item.size
    : typeof item.size === "string" &&
      item.size.trim()
    ? item.size
        .split(",")
        .map((size) => size.trim())
        .filter(Boolean)
    : [];

// Combine ALL sizes
const productSizes = [
  ...new Set([
    ...mainProductSizes,
    ...variantProductSizes,
    ...oldProductSizes,
  ]),
];

const hasSize =
  productSizes.length > 0;
  // =========================================================
// TOTAL STOCK FROM ALL COLORS + ALL SIZES
// =========================================================

const mainColorStockTotal =
  Array.isArray(item.sizes)
    ? item.sizes.reduce(
        (total, sizeItem) =>
          total + Number(sizeItem.stock || 0),
        0
      )
    : 0;

const colorVariantStockTotal =
  Array.isArray(item.color_variants)
    ? item.color_variants.reduce(
        (total, variant) =>
          total +
          (Array.isArray(variant.sizes)
            ? variant.sizes.reduce(
                (sizeTotal, sizeItem) =>
                  sizeTotal +
                  Number(sizeItem.stock || 0),
                0
              )
            : 0),
        0
      )
    : 0;

const totalProductStock =
  getProductTotalStock(item);

        // =========================================================
  // SELECTED COLOR + SIZE STOCK
  // =========================================================
 
  // =========================================================
// SELECTED COLOR + SIZE STOCK
// =========================================================

const selectedSize =
  selectedSizes[item.id] || "";

// ---------------------------------------------------------
// FIND SELECTED COLOR VARIANT
// ---------------------------------------------------------

const selectedVariant =
  hasColorVariants
    ? item.color_variants.find(
        (variant) =>
          String(
            variant.color || ""
          )
            .trim()
            .toLowerCase() ===
          String(
            selectedColor || ""
          )
            .trim()
            .toLowerCase()
      )
    : null;

// ---------------------------------------------------------
// MAIN COLOR SIZE DATA
// ---------------------------------------------------------

const mainColorSizeData =
  Array.isArray(item.sizes)
    ? item.sizes.find(
        (sizeItem) =>
          String(
            sizeItem.size || ""
          )
            .trim()
            .toLowerCase() ===
          String(
            selectedSize || ""
          )
            .trim()
            .toLowerCase()
      )
    : null;

// ---------------------------------------------------------
// VARIANT SIZE DATA
// ---------------------------------------------------------

const variantSizeData =
  selectedVariant &&
  Array.isArray(selectedVariant.sizes)
    ? selectedVariant.sizes.find(
        (sizeItem) =>
          String(
            sizeItem.size || ""
          )
            .trim()
            .toLowerCase() ===
          String(
            selectedSize || ""
          )
            .trim()
            .toLowerCase()
      )
    : null;

// =========================================================
// EXACT SELECTED STOCK
// =========================================================

const selectedVariantStock =
  item.category?.trim().toLowerCase() === "saree"
    ? Number(item.stock || 0)
    : selectedVariant
      ? Number(variantSizeData?.stock || 0)
      : Number(mainColorSizeData?.stock || 0);
      const displayStock =
  item.category?.trim().toLowerCase() === "saree"
    ? selectedVariant
      ? Number(selectedVariant.stock || 0)
      : Number(item.stock || 0)
    : totalProductStock;


  return (

    <div
  className="product-card"
  key={item.id}
  style={{
    background: darkMode ? "#1f2937" : "#fff",
    color: darkMode ? "#fff" : "#111827",
    borderRadius: "12px",
    overflow: "hidden",
    boxShadow: darkMode
      ? "0 2px 10px rgba(0,0,0,0.30)"
      : "0 2px 10px rgba(0,0,0,0.08)",
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  }}
>

      {/* =====================================================
          PRODUCT IMAGE
      ===================================================== */}

      <div
        style={{
          position: "relative",
          width: "100%",
          height: "230px",
          flexShrink: 0,
        }}
      >

        {/* PRICE */}

        <div
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            zIndex: 2,
            background: "rgba(0,0,0,0.75)",
            color: "#fff",
            padding: "6px 9px",
            borderRadius: "7px",
            fontSize: "14px",
            fontWeight: "700",
          }}
        >
          ৳{item.price}
        </div>


        {/* STOCK */}

        <div
          style={{
            position: "absolute",
            top: "10px",
            left: "10px",
            zIndex: 2,
            background: "rgba(0,0,0,0.75)",
            color: "#fff",
            padding: "6px 9px",
            borderRadius: "7px",
            fontSize: "13px",
            fontWeight: "600",
          }}
        >
          Stock: {displayStock}
        </div>


        {/* IMAGE */}

        <img
          src={selectedImage}
          alt={item.name}
          className="product-image"
          onClick={() =>
            setDetailModalProduct({
              ...item,

              main_image_url:
                item.image_url,

              selectedVariantImage:
                selectedImage,

              selectedVariantColor:
                selectedColor,

              selectedColor:
                selectedColor,
            })
          }
          style={{
            width: "100%",
            height: "230px",
            minHeight: "230px",
            objectFit: "cover",
            objectPosition: "center",
            display: "block",
            cursor: "pointer",
            background: "#f8f8f8",
          }}
        />

      </div>


      {/* =====================================================
          PRODUCT INFO
      ===================================================== */}

      <div
        className="product-info"
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          padding: "12px",
          minWidth: 0,
          gap: "10px",
        }}
      >

        {/* ===================================================
            PRODUCT NAME
        =================================================== */}

        <h3
          style={{
  margin: 0,
  height: "43px",
  minHeight: "43px",
  fontSize: "16px",
  lineHeight: "1.35",
  fontWeight: "700",
  overflow: "hidden",
  textOverflow: "ellipsis",
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
}}
        >
          {item.name}
        </h3>


        {/* ===================================================
            BUYING PRICE
            ONLY OWNER + ADMIN
        =================================================== */}

        {(isOwner || isAdmin) && (
          <div
            style={{
              color: "#dc2626",
              fontWeight: "600",
              fontSize: "13px",
              marginTop: "-3px",
            }}
          >
            💰 Buying: ৳
            {item.buying_price ?? "N/A"}
          </div>
        )}


        {/* ===================================================
            COLOR + SIZE ROW
        =================================================== */}

        {(hasColor || hasSize) && (

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                hasColor && hasSize
                  ? "1fr 1fr"
                  : "1fr",
              gap: "7px",
              width: "100%",
            }}
          >

            {/* =================================================
                COLOR DROPDOWN
            ================================================= */}

            {hasColor && (

              <select
                value={selectedColor}
                onChange={(e) => {

                  const newColor =
                    e.target.value;

                  setSelectedColors(
                    (prev) => ({
                      ...prev,
                      [item.id]:
                        newColor,
                    })
                  );

                }}
                style={{
                  width: "100%",
                  height: "38px",
                  padding: "7px 9px",
                  border:
                    "1px solid #d1d5db",
                  borderRadius: "7px",
                  background: "#fff",
                  cursor: "pointer",
                  fontSize: "13px",
                  boxSizing:
                    "border-box",
                  minWidth: 0,
                }}
              >

                {/* MAIN COLOR */}

                {item.color && (
                  <option 
  value={item.color}
>
  {item.color}
</option>
                )}


                {/* COLOR VARIANTS */}

                {hasColorVariants &&
                  item.color_variants.map(
                    (
                      variant,
                      index
                    ) => (

                      <option 
  key={`${item.id}-variant-${index}`}
  value={variant.color}
>
  {variant.color}
</option>
                    )
                  )}

              </select>

            )}


            {/* =================================================
                SIZE DROPDOWN
            ================================================= */}

            {hasSize && (

              <select
                value={
                  selectedSizes[item.id] || ""
                }
                onChange={(e) => {

                  const newSize =
                    e.target.value;

                  setSelectedSizes(
                    (prev) => ({
                      ...prev,
                      [item.id]:
                        newSize,
                    })
                  );

                }}
                style={{
                  width: "100%",
                  height: "38px",
                  padding: "7px 9px",
                  border:
                    "1px solid #d1d5db",
                  borderRadius: "7px",
                  background: "#fff",
                  cursor: "pointer",
                  fontSize: "13px",
                  boxSizing:
                    "border-box",
                  minWidth: 0,
                }}
              >

                <option value="">
  Size
</option>

                {productSizes.map(
                  (
                    size,
                    index
                  ) => (

                    <option
                      key={`${item.id}-size-${index}`}
                      value={size}
                    >
                      {size}
                    </option>

                  )
                )}

              </select>

            )}

          </div>

        )}


        {/* ===================================================
            BUTTON AREA
        =================================================== */}

        <div 
  style={{ 
    display: "flex", 
    flexDirection: "column", 
    gap: "7px",
    marginTop: "auto",
  }} 
>

          {canManageProducts ? (

            <>

              {/* =============================================
                  ADD TO CART + VIEW DETAILS
              ============================================= */}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "1fr 1fr",
                  gap: "7px",
                }}
              >

                {/* ADD TO CART */}

                <button
                  type="button"
                  onClick={() => {
  // =========================================================
  // STOCK VALIDATION
  // =========================================================

  if (hasColorVariants && hasSize && !selectedSize) {
    alert("আগে Color এবং Size নির্বাচন করুন।");
    return;
  }

  if (selectedVariantStock <= 0) {
    alert("এই Color এবং Size-এর stock শেষ।");
    return;
  }

  addToOrderCart(
    item,
    selectedColor,
    selectedImage,
    selectedSize
  );
}}
                  style={{ 
  width: "100%", 
  height: "38px", 
  padding: "6px 8px", 
  border: "1px solid #7c3aed", 
  borderRadius: "7px", 
  cursor: "pointer", 
  background: "#fff", 
  color: "#7c3aed", 
  fontWeight: "600", 
  fontSize: "12px", 
  lineHeight: "1",
  whiteSpace: "nowrap",
  boxSizing: "border-box", 
}}
                >
                  🛒 Add Items
                </button>


                {/* VIEW DETAILS */}

                <button
                  type="button"
                  onClick={() => {

                    setDetailModalProduct({
                      ...item,

                      main_image_url:
                        item.image_url,

                      selectedVariantImage:
                        selectedImage ||
                        item.image_url,

                      selectedVariantColor:
                        selectedColor ||
                        item.color ||
                        "",

                      selectedColor:
                        selectedColor ||
                        item.color ||
                        "",
                    });

                  }}
                  style={{ 
  width: "100%", 
  height: "38px", 
  padding: "6px 8px", 
  border: "1px solid #7c3aed", 
  borderRadius: "7px", 
  cursor: "pointer", 
  background: "#fff", 
  color: "#7c3aed", 
  fontWeight: "600", 
  fontSize: "12px", 
  lineHeight: "1",
  whiteSpace: "nowrap",
  boxSizing: "border-box", 
}}
                >
                  👁️ View
                </button>

              </div>


              {/* =============================================
                  EDIT + DELETE
                  OWNER / ADMIN / STAFF
              ============================================= */}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "1fr 1fr",
                  gap: "7px",
                }}
              >

                {/* EDIT */}

                <button
                  type="button"
                  onClick={() =>
                    editProduct(item)
                  }
                  style={{
                    width: "100%",
                    height: "36px",
                    padding: "7px",
                    border: "none",
                    borderRadius: "7px",
                    cursor: "pointer",
                    background: "#f59e0b",
                    color: "#fff",
                    fontWeight: "600",
                    fontSize: "13px",
                    boxSizing:
                      "border-box",
                  }}
                >
                  ✏️ Edit
                </button>


                {/* DELETE */}

                <button
                  type="button"
                  onClick={() =>
                    deleteProduct(item)
                  }
                  style={{
                    width: "100%",
                    height: "36px",
                    padding: "7px",
                    border: "none",
                    borderRadius: "7px",
                    cursor: "pointer",
                    background: "#dc2626",
                    color: "#fff",
                    fontWeight: "600",
                    fontSize: "13px",
                    boxSizing:
                      "border-box",
                  }}
                >
                  🗑️ Delete
                </button>

              </div>

            </>

          ) : (

            /* ===============================================
               NORMAL USER / VIEWER
            =============================================== */

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "1fr 1fr",
                gap: "7px",
              }}
            >

              {/* ADD TO CART */}

              <button
                type="button"
                onClick={() => {
  // =========================================================
  // STOCK VALIDATION
  // =========================================================

  if (hasColorVariants && hasSize && !selectedSize) {
    alert("আগে Color এবং Size নির্বাচন করুন।");
    return;
  }

  if (selectedVariantStock <= 0) {
    alert("এই Color এবং Size-এর stock শেষ।");
    return;
  }

  addToOrderCart(
    item,
    selectedColor,
    selectedImage,
    selectedSize
  );
}}
                style={{ 
  width: "100%", 
  height: "38px", 
  padding: "6px 8px", 
  border: "1px solid #7c3aed", 
  borderRadius: "7px", 
  cursor: "pointer", 
  background: "#fff", 
  color: "#7c3aed", 
  fontWeight: "600", 
  fontSize: "12px", 
  lineHeight: "1",
  whiteSpace: "nowrap",
  boxSizing: "border-box", 
}}
              >
                🛒 Add Items
              </button>


              {/* VIEW DETAILS */}

              <button
                type="button"
                onClick={() => {

                  setDetailModalProduct({
                    ...item,

                    main_image_url:
                      item.image_url,

                    selectedVariantImage:
                      selectedImage ||
                      item.image_url,

                    selectedVariantColor:
                      selectedColor ||
                      item.color ||
                      "",

                    selectedColor:
                      selectedColor ||
                      item.color ||
                      "",
                  });

                }}
                style={{ 
  width: "100%", 
  height: "38px", 
  padding: "6px 8px", 
  border: "1px solid #7c3aed", 
  borderRadius: "7px", 
  cursor: "pointer", 
  background: "#fff", 
  color: "#7c3aed", 
  fontWeight: "600", 
  fontSize: "12px", 
  lineHeight: "1",
  whiteSpace: "nowrap",
  boxSizing: "border-box", 
}}
              >
                👁️ View
              </button>

            </div>

          )}

        </div>

      </div>

    </div>

  );

})}


      {/* =====================================================
          MAIN PRODUCT PAGINATION
      ===================================================== */}

      {totalPages > 1 && (

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "8px",
            marginTop: "30px",
            marginBottom: "20px",
            flexWrap: "wrap",
            gridColumn: "1 / -1",
          }}
        >

          {/* PREVIOUS */}

          <button
            onClick={() =>
              changePage(currentPage - 1)
            }
            disabled={
              currentPage === 1
            }
            style={{
              padding: "9px 14px",
              border:
                "1px solid #d1d5db",
              borderRadius: "7px",
              background:
                currentPage === 1
                  ? "#f3f4f6"
                  : "#fff",
              color:
                currentPage === 1
                  ? "#9ca3af"
                  : "#111827",
              cursor:
                currentPage === 1
                  ? "not-allowed"
                  : "pointer",
              fontWeight: "600",
            }}
          >
            ← Previous
          </button>


          {/* PAGE NUMBERS */}

          {Array.from(
            {
              length: totalPages,
            },
            (_, index) =>
              index + 1
          ).map((page) => (

            <button
              key={page}
              onClick={() =>
                changePage(page)
              }
              style={{
                minWidth: "40px",
                height: "40px",
                padding: "8px 12px",
                border:
                  currentPage === page
                    ? "1px solid #2563eb"
                    : "1px solid #d1d5db",
                borderRadius: "7px",
                background:
                  currentPage === page
                    ? "#2563eb"
                    : "#fff",
                color:
                  currentPage === page
                    ? "#fff"
                    : "#111827",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              {page}
            </button>

          ))}


          {/* NEXT */}

          <button
            onClick={() =>
              changePage(
                currentPage + 1
              )
            }
            disabled={
              currentPage === totalPages
            }
            style={{
              padding: "9px 14px",
              border:
                "1px solid #d1d5db",
              borderRadius: "7px",
              background:
                currentPage === totalPages
                  ? "#f3f4f6"
                  : "#fff",
              color:
                currentPage === totalPages
                  ? "#9ca3af"
                  : "#111827",
              cursor:
                currentPage === totalPages
                  ? "not-allowed"
                  : "pointer",
              fontWeight: "600",
            }}
          >
            Next →
          </button>

        </div>

      )}

    </div>

  )}


  {/* =========================================================
      ORDER PROCESS RIGHT SIDEBAR

      IMPORTANT:
      এটা product ternary-এর বাইরে।
      তাই product grid-এর layout নষ্ট করবে না।
  ========================================================= */}

  {activeMenu === "products" &&
  allProductsActive &&
  orderPanelOpen && (

    <aside
      style={{
  position: "fixed",
  top: 0,
  right: 0,
  bottom: 0,

  width: "360px",
  height: "100vh",

  overflowY: "auto",
  overflowX: "hidden",

  background: darkMode ? "#1f2937" : "#ffffff",

  borderLeft: darkMode
    ? "1px solid #374151"
    : "1px solid #e5e7eb",

  padding: "20px",

  boxSizing: "border-box",

  zIndex: 9999,

  boxShadow: darkMode
    ? "-4px 0 15px rgba(0,0,0,0.30)"
    : "none",

  color: darkMode ? "#fff" : "#111827",
}}
    >

      {/* =====================================================
          ORDER PROCESS HEADER
      ===================================================== */}

      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
          marginBottom: "18px",
          paddingBottom: "12px",
          borderBottom: darkMode
  ? "1px solid #374151"
  : "1px solid #e5e7eb",
        }}
      >

        <h3
          style={{
            margin: 0,
            fontSize: "18px",
            fontWeight: "700",
            color: darkMode ? "#fff" : "#111827",
          }}
        >
          🛒 Order Process
        </h3>

        <span
          style={{
            background: darkMode ? "#374151" : "#f3f4f6",
color: darkMode ? "#fff" : "#374151",
            padding: "4px 9px",
            borderRadius: "20px",
            fontSize: "12px",
            fontWeight: "600",
          }}
        >
          {orderCart.length} Items
        </span>

      </div>


      {/* =====================================================
    CUSTOMER INFORMATION
===================================================== */}

<div
  style={{
    marginBottom: "20px",
  }}
>
  <h4
    style={{
      margin: "0 0 12px",
      fontSize: "14px",
      fontWeight: "700",
      color: darkMode ? "#d1d5db" : "#374151",
    }}
  >
    👤 Customer Information
  </h4>

  {/* PHONE */}
  <div
    style={{
      marginBottom: "10px",
    }}
  >
    <label
      style={{
        display: "block",
        fontSize: "12px",
        fontWeight: "600",
        color: darkMode ? "#9ca3af" : "#6b7280",
        marginBottom: "5px",
      }}
    >
      Mobile Number
    </label>

    <input
      type="tel"
      value={customerPhone}
      onChange={(e) => {
        const phone = e.target.value;

        setCustomerPhone(phone);

        // Number পুরোপুরি মুছে ফেললে
        if (!phone.trim()) {
          setCustomerName("");
          setCustomerAddress("");
          setSelectedCustomerId(null);
          return;
        }

        // 11 digit হলে customer খুঁজবে
        if (
          normalizePhoneNumber(phone).length === 11
        ) {
          findCustomerByPhone(phone);
        } else {
          // 11 digit না হওয়া পর্যন্ত আগের customer selection remove
          setSelectedCustomerId(null);
          setCustomerName("");
          setCustomerAddress("");
        }
      }}
      placeholder="01XXXXXXXXX"
      style={{
        width: "100%",
        padding: "9px 10px",
        border: darkMode
  ? "1px solid #4b5563"
  : "1px solid #d1d5db",
background: darkMode ? "#111827" : "#fff",
color: darkMode ? "#fff" : "#111827",
        borderRadius: "7px",
        fontSize: "13px",
        boxSizing: "border-box",
        outline: "none",
      }}
    />
  </div>

  {/* ADDRESS */}
  <div
    style={{
      marginBottom: "10px",
    }}
  >
    <label
      style={{
        display: "block",
        fontSize: "12px",
        fontWeight: "600",
        color: darkMode ? "#9ca3af" : "#6b7280",
        marginBottom: "5px",
      }}
    >
      Address
    </label>

    <textarea
      value={customerAddress}
      onChange={(e) =>
        setCustomerAddress(e.target.value)
      }
      placeholder="Customer address"
      rows={3}
      style={{
        width: "100%",
        padding: "9px 10px",
        border: darkMode
  ? "1px solid #4b5563"
  : "1px solid #d1d5db",
background: darkMode ? "#111827" : "#fff",
color: darkMode ? "#fff" : "#111827",
        borderRadius: "7px",
        fontSize: "13px",
        boxSizing: "border-box",
        outline: "none",
        resize: "vertical",
      }}
    />
  </div>

  {/* NEW CUSTOMER */}
  <button
    type="button"
    onClick={() =>
      setCustomerPopupOpen(true)
    }
    style={{
      width: "100%",
      padding: "9px 10px",
      border: "1px solid #d1d5db",
      borderRadius: "7px",
      background: darkMode ? "#374151" : "#fff",
color: darkMode ? "#fff" : "#374151",
border: darkMode
  ? "1px solid #4b5563"
  : "1px solid #d1d5db",
      cursor: "pointer",
      fontSize: "13px",
      fontWeight: "600",
    }}
  >
    + New Customer
  </button>
</div>
      {/* =====================================================
    NEW CUSTOMER POPUP
===================================================== */}

{customerPopupOpen && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0, 0, 0, 0.45)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 99999,
      padding: "20px",
    }}
  >
    <div
      style={{
        width: "100%",
        maxWidth: "430px",
        background: darkMode ? "#1f2937" : "#ffffff",
color: darkMode ? "#fff" : "#111827",
        borderRadius: "12px",
        padding: "20px",
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.20)",
      }}
    >
      {/* POPUP HEADER */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "18px",
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: "18px",
            fontWeight: "700",
            color: darkMode ? "#fff" : "#111827",
          }}
        >
          New Customer
        </h3>

        <button
          type="button"
          onClick={() => setCustomerPopupOpen(false)}
          disabled={customerCreating}
          style={{
            border: "none",
            background: "transparent",
            fontSize: "24px",
            lineHeight: 1,
            color: "#6b7280",
            cursor: customerCreating
              ? "not-allowed"
              : "pointer",
            padding: "2px 6px",
          }}
        >
          ×
        </button>
      </div>

      {/* CUSTOMER NAME */}
      <div style={{ marginBottom: "12px" }}>
        <label
          style={{
            display: "block",
            marginBottom: "6px",
            fontSize: "13px",
            fontWeight: "600",
            color: darkMode ? "#d1d5db" : "#374151",
          }}
        >
          Customer Name
        </label>

        <input
          type="text"
          value={newCustomerName}
          onChange={(e) =>
            setNewCustomerName(e.target.value)
          }
          placeholder="Customer name"
          disabled={customerCreating}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "10px 11px",
            border: darkMode
  ? "1px solid #4b5563"
  : "1px solid #d1d5db",
background: darkMode ? "#111827" : "#fff",
color: darkMode ? "#fff" : "#111827",
            borderRadius: "7px",
            outline: "none",
            fontSize: "14px",
            color: "#111827",
          }}
        />
      </div>

      {/* MOBILE NUMBER */}
      <div style={{ marginBottom: "12px" }}>
        <label
          style={{
            display: "block",
            marginBottom: "6px",
            fontSize: "13px",
            fontWeight: "600",
            color: darkMode ? "#d1d5db" : "#374151",
          }}
        >
          Mobile Number
        </label>

        <input
          type="tel"
          value={newCustomerPhone}
          onChange={(e) =>
            setNewCustomerPhone(e.target.value)
          }
          placeholder="01XXXXXXXXX"
          disabled={customerCreating}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "10px 11px",
            border: darkMode
  ? "1px solid #4b5563"
  : "1px solid #d1d5db",
background: darkMode ? "#111827" : "#fff",
color: darkMode ? "#fff" : "#111827",
            borderRadius: "7px",
            outline: "none",
            fontSize: "14px",
            color: "#111827",
          }}
        />
      </div>

      {/* ADDRESS */}
      <div style={{ marginBottom: "18px" }}>
        <label
          style={{
            display: "block",
            marginBottom: "6px",
            fontSize: "13px",
            fontWeight: "600",
            color: darkMode ? "#d1d5db" : "#374151",
          }}
        >
          Address
        </label>

        <textarea
          value={newCustomerAddress}
          onChange={(e) =>
            setNewCustomerAddress(e.target.value)
          }
          placeholder="Customer address"
          rows={4}
          disabled={customerCreating}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "10px 11px",
            border: darkMode
  ? "1px solid #4b5563"
  : "1px solid #d1d5db",
background: darkMode ? "#111827" : "#fff",
color: darkMode ? "#fff" : "#111827",
            borderRadius: "7px",
            outline: "none",
            fontSize: "14px",
            color: "#111827",
            resize: "vertical",
          }}
        />
      </div>

      {/* BUTTONS */}
      <div
        style={{
          display: "flex",
          gap: "10px",
        }}
      >
        {/* CANCEL */}
        <button
          type="button"
          onClick={() =>
            setCustomerPopupOpen(false)
          }
          disabled={customerCreating}
          style={{
            flex: 1,
            padding: "10px",
            border: "1px solid #d1d5db",
            borderRadius: "7px",
            background: darkMode ? "#374151" : "#ffffff",
color: darkMode ? "#fff" : "#374151",
border: darkMode
  ? "1px solid #4b5563"
  : "1px solid #d1d5db",
            cursor: customerCreating
              ? "not-allowed"
              : "pointer",
            fontSize: "13px",
            fontWeight: "600",
          }}
        >
          Cancel
        </button>

        {/* CREATE CUSTOMER */}
        <button
          type="button"
          onClick={createOrderCustomer}
          disabled={customerCreating}
          style={{
            flex: 1,
            padding: "10px",
            border: "none",
            borderRadius: "7px",
            background: darkMode ? "#4b5563" : "#111827",
color: "#ffffff",
            cursor: customerCreating
              ? "not-allowed"
              : "pointer",
            fontSize: "13px",
            fontWeight: "600",
          }}
        >
          {customerCreating
            ? "Creating..."
            : "Create Customer"}
        </button>
      </div>
    </div>
  </div>
)}


      {/* =====================================================
          CART ITEMS
      ===================================================== */}

      <div>

        <h4
          style={{
            margin: "0 0 12px",
            fontSize: "14px",
            fontWeight: "700",
            color: darkMode ? "#d1d5db" : "#374151",
          }}
        >
          🛍️ Cart Items
        </h4>


        {orderCart.length === 0 ? (

          <div
            style={{
              padding: "25px 12px",
              textAlign: "center",
              border: darkMode
  ? "1px dashed #4b5563"
  : "1px dashed #d1d5db",
              borderRadius: "8px",
              color: "#9ca3af",
              fontSize: "13px",
            }}
          >

            🛒 Cart is empty

            <div
              style={{
                marginTop: "5px",
                fontSize: "12px",
              }}
            >
              Product card থেকে Add to Cart করুন
            </div>

          </div>

        ) : (

          <div
            style={{
              display: "flex",
              flexDirection:
                "column",
              gap: "10px",
            }}
          >

            {orderCart.map((item) => (

              <div
                key={`${item.product_id}-${item.color}-${item.size}`}
                style={{
                  border: darkMode
  ? "1px solid #374151"
  : "1px solid #e5e7eb",
borderRadius: "9px",
padding: "10px",
background: darkMode ? "#111827" : "#fafafa",
                }}
              >

                {/* PRODUCT TOP */}

                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                  }}
                >

                  {/* IMAGE */}

                  {item.product_image_url ? (

                    <img
                      src={
                        item.product_image_url
                      }
                      alt={
                        item.product_name
                      }
                      style={{
                        width: "58px",
                        height: "68px",
                        objectFit:
                          "cover",
                        borderRadius: "6px",
                        border: darkMode
  ? "1px solid #374151"
  : "1px solid #e5e7eb",
                        flexShrink: 0,
                      }}
                    />

                  ) : (

                    <div
                      style={{
                        width: "58px",
                        height: "68px",
                        borderRadius: "6px",
                        background: darkMode ? "#374151" : "#f3f4f6",
                        display: "flex",
                        alignItems:
                          "center",
                        justifyContent:
                          "center",
                        fontSize: "20px",
                        flexShrink: 0,
                      }}
                    >
                      🛍️
                    </div>

                  )}


                  {/* DETAILS */}

                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                    }}
                  >

                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: "700",
                        color: darkMode ? "#fff" : "#111827",
                        marginBottom:
                          "4px",
                      }}
                    >
                      {item.product_name}
                    </div>


                    <div
                      style={{
                        fontSize: "11px",
                        color: darkMode ? "#9ca3af" : "#6b7280",
                        marginBottom:
                          "3px",
                      }}
                    >
                      Color:{" "}
                      {item.color ||
                        "N/A"}
                    </div>


                    {item.size && (

                      <div
                        style={{
                          fontSize: "11px",
                          color: darkMode ? "#9ca3af" : "#6b7280",
                        }}
                      >
                        Size: {item.size}
                      </div>

                    )}


                    <div
                      style={{
                        marginTop: "5px",
                        fontSize: "13px",
                        fontWeight: "700",
                        color: darkMode ? "#fff" : "#111827",
                      }}
                    >
                      ৳
                      {Number(
                        item.unit_price ||
                          0
                      )}
                    </div>

                  </div>


                  {/* REMOVE */}

                  <button
  type="button"
  onClick={() =>
    removeFromOrderCart(
      item.product_id,
      item.color,
      item.size
    )
  }
  style={{
    border: "none",
    background: "transparent",
    color: "#ef4444",
    cursor: "pointer",
    fontSize: "16px",
    height: "25px",
    padding: "0 3px",
  }}
  title="Remove"
>
  ✕
</button>
                </div>


                {/* QUANTITY */}

                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems:
                      "center",
                    marginTop: "10px",
                    paddingTop: "8px",
                    borderTop: darkMode
  ? "1px solid #374151"
  : "1px solid #e5e7eb",
                  }}
                >

                  <div
                    style={{
                      display: "flex",
                      alignItems:
                        "center",
                      gap: "5px",
                    }}
                  >

                    {/* DECREASE */}

                    <button
  type="button"
  onClick={() =>
    decreaseOrderCartQuantity(
      item.product_id,
      item.color,
      item.size
    )
  }
  style={{
    width: "26px",
    height: "26px",
    border: darkMode
  ? "1px solid #4b5563"
  : "1px solid #d1d5db",
    borderRadius: "5px",
    background: darkMode ? "#374151" : "#fff",
color: darkMode ? "#fff" : "#111827",
    cursor: "pointer",
    fontWeight: "700",
  }}
>
  −
</button>


                    {/* QUANTITY */}

                    <span
                      style={{
                        minWidth: "25px",
                        textAlign:
                          "center",
                        fontSize:
                          "13px",
                        fontWeight:
                          "700",
                      }}
                    >
                      {item.quantity}
                    </span>


                    {/* INCREASE */}

                    <button
                      type="button"
                      onClick={() =>
                        increaseOrderCartQuantity(
  item.product_id,
  item.color,
  item.size
)
                      }
                      style={{
                        width: "26px",
                        height: "26px",
                        border: darkMode
  ? "1px solid #4b5563"
  : "1px solid #d1d5db",
                        borderRadius: "5px",
                        background: darkMode ? "#374151" : "#fff",
color: darkMode ? "#fff" : "#111827",
                        cursor:
                          "pointer",
                        fontWeight:
                          "700",
                      }}
                    >
                      +
                    </button>

                  </div>


                  {/* ITEM TOTAL */}

                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: "700",
                    }}
                  >
                    ৳
                    {Number(
                      item.total_price ||
                        0
                    )}
                  </div>

                </div>

              </div>

            ))}

          </div>

        )}

      </div>


      {/* =====================================================
          ORDER TOTAL
      ===================================================== */}

      {orderCart.length > 0 && (

        <div
          style={{
            marginTop: "18px",
            paddingTop: "15px",
            borderTop: darkMode
  ? "1px solid #374151"
  : "1px solid #d1d5db",
          }}
        >

          {/* SUBTOTAL */}

          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              marginBottom: "8px",
              fontSize: "13px",
              color: darkMode ? "#d1d5db" : "#4b5563",
            }}
          >

            <span>
              Subtotal
            </span>

            <span>
              ৳{orderSubtotal}
            </span>

          </div>


          {/* DELIVERY */}

          <div
            style={{
              marginBottom: "10px",
            }}
          >

            <div
              style={{
                fontSize: "12px",
                fontWeight: "600",
                color: darkMode ? "#9ca3af" : "#6b7280",
                marginBottom: "5px",
              }}
            >
              Delivery Charge
            </div>


            <select
  value={deliveryType}
  onChange={(e) =>
    setDeliveryType(e.target.value)
  }
  style={{
    width: "100%",
    padding: "8px 9px",
    border: darkMode
  ? "1px solid #4b5563"
  : "1px solid #d1d5db",
borderRadius: "7px",
background: darkMode ? "#111827" : "#fff",
color: darkMode ? "#fff" : "#111827",
fontSize: "13px",
  }}
>
  <option value="">
    Select Delivery Charge
  </option>

  <option value="free">
    Free Delivery — ৳0
  </option>

  <option value="80">
    Delivery — ৳80
  </option>

  <option value="150">
    Delivery — ৳150
  </option>
</select>

          </div>


          {/* TOTAL */}

          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
              padding: "12px",
              marginTop: "10px",
              background: darkMode ? "#374151" : "#f3f4f6",
borderRadius: "8px",
            }}
          >

            <span
              style={{
                fontSize: "15px",
                fontWeight: "700",
                color: darkMode ? "#fff" : "#111827",
              }}
            >
              Total
            </span>

            <span
              style={{
                fontSize: "17px",
                fontWeight: "800",
                color: darkMode ? "#fff" : "#111827",
              }}
            >
              ৳{orderTotal}
            </span>

          </div>


          {/* CREATE ORDER */}

          <button
  type="button"
  onClick={placeOrder}
  disabled={
    orderSubmitting ||
    orderCart.length === 0 ||
    !deliveryType
  }
  style={{
    width: "100%",
    marginTop: "12px",
    padding: "12px",
    border: "none",
    borderRadius: "8px",
    background:
  orderSubmitting ||
  orderCart.length === 0 ||
  !deliveryType
    ? "#9ca3af"
    : darkMode
      ? "#4b5563"
      : "#111827",
    color: "#fff",
    cursor:
      orderSubmitting ||
      orderCart.length === 0 ||
      !deliveryType
        ? "not-allowed"
        : "pointer",
    fontSize: "14px",
    fontWeight: "700",
  }}
>
  {orderSubmitting
    ? "Creating Order..."
    : "✅ Create Order"}
</button>

        </div>

      )}

    </aside>

  )}

</section>
            </>
          )}
        </main>
      </div>

      {/* =====================================================
          EDIT MODAL
      ===================================================== */}

      {editModalOpen && canManageProducts && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            padding: "20px",
            zIndex: 1000,
            overflowY: "auto",
          }}
        >
          <div
            style={{
              background: "#fff",
              width: "100%",
              maxWidth: "700px",
              maxHeight:
                "90vh",
              overflowY:
                "auto",
              borderRadius:
                "14px",
              padding: "25px",
              boxSizing:
                "border-box",
            }}
          >
            <h2>
              ✏️ Edit Product
            </h2>

            {product.imagePreview && (
              <img
                src={
                  product.imagePreview
                }
                alt={
                  product.name
                }
                style={{
                  width: "100%",
                  height: "280px",
                  objectFit: "cover",
                  borderRadius: "12px",
                  marginBottom:
                    "18px",
                }}
              />
            )}

            {/* NAME */}

            <div
              style={{
                background:
                  "#f8fafc",
                border:
                  "1px solid #e5e7eb",
                borderRadius:
                  "10px",
                padding:
                  "16px",
                marginBottom:
                  "12px",
              }}
            >
              <label
                style={{
                  display:
                    "block",
                  fontWeight:
                    "700",
                  marginBottom:
                    "8px",
                }}
              >
                Product Name
              </label>

              <input
                name="name"
                value={
                  product.name
                }
                onChange={
                  handleChange
                }
                style={{
                  width:
                    "100%",
                  padding:
                    "11px",
                  boxSizing:
                    "border-box",
                  border:
                    "1px solid #d1d5db",
                  borderRadius:
                    "8px",
                }}
              />
            </div>

            {/* SELLING PRICE */}

            <div
              style={{
                background:
                  "#f8fafc",
                border:
                  "1px solid #e5e7eb",
                borderRadius:
                  "10px",
                padding:
                  "16px",
                marginBottom:
                  "12px",
              }}
            >
              <label
                style={{
                  display:
                    "block",
                  fontWeight:
                    "700",
                  marginBottom:
                    "8px",
                }}
              >
                Selling Price
              </label>

              <input
                name="price"
                type="number"
                value={
                  product.price
                }
                onChange={
                  handleChange
                }
                style={{
                  width:
                    "100%",
                  padding:
                    "11px",
                  boxSizing:
                    "border-box",
                  border:
                    "1px solid #d1d5db",
                  borderRadius:
                    "8px",
                }}
              />
            </div>

            {/* BUYING PRICE */}

            {canViewBuyingPrice && (
              <div
                style={{
                  background:
                    "#fff7ed",
                  border:
                    "1px solid #fed7aa",
                  borderRadius:
                    "10px",
                  padding:
                    "16px",
                  marginBottom:
                    "12px",
                }}
              >
                <label
                  style={{
                    display:
                      "block",
                    fontWeight:
                      "700",
                    marginBottom:
                      "8px",
                  }}
                >
                  💰 Buying Price
                </label>

                <input
                  name="buying_price"
                  type="number"
                  value={
                    product.buying_price
                  }
                  onChange={
                    handleChange
                  }
                  style={{
                    width:
                      "100%",
                    padding:
                      "11px",
                    boxSizing:
                      "border-box",
                    border:
                      "1px solid #d1d5db",
                    borderRadius:
                      "8px",
                  }}
                />
              </div>
            )}

            {/* CATEGORY */}

<div
  style={{
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "20px",
    marginBottom: "16px",
  }}
>
  <label
    style={{
      display: "block",
      fontWeight: "700",
      marginBottom: "9px",
    }}
  >
    📂 Category
  </label>

  <select
  name="category"
  value={product.category || ""}
  onChange={handleChange}
  style={{
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 14px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    fontSize: "15px",
    background: "#fff",
    cursor: "pointer",
  }}
>
  <option value="">
    Select Category
  </option>

  <option value="dress">
    Dress
  </option>

  <option value="saree">
    Saree
  </option>
</select>
</div>
{product.category?.trim().toLowerCase() === "saree" && (
  <div
    style={{
      marginTop: "15px",
      marginBottom: "15px",
    }}
  >
    <label
      style={{
        display: "block",
        fontWeight: "700",
        marginBottom: "8px",
      }}
    >
      📦 Stock
    </label>

    <input
      type="number"
      min="0"
      placeholder="Stock"
      value={product.stock ?? ""}
      onChange={(e) =>
        setProduct((prev) => ({
          ...prev,
          stock: e.target.value,
        }))
      }
      style={{
        width: "100%",
        boxSizing: "border-box",
        padding: "11px 13px",
        border: "1px solid #d1d5db",
        borderRadius: "8px",
      }}
    />
  </div>
)}
            {/* MAIN COLOR */}

            <div
              style={{
                background:
                  "#f8fafc",
                border:
                  "1px solid #e5e7eb",
                borderRadius:
                  "10px",
                padding:
                  "16px",
                marginBottom:
                  "12px",
              }}
            >
              <label
                style={{
                  display:
                    "block",
                  fontWeight:
                    "700",
                  marginBottom:
                    "8px",
                }}
              >
                🎨 Main Color
              </label>

              <input
                name="color"
                value={
                  product.color
                }
                onChange={
                  handleChange
                }
                style={{
                  width:
                    "100%",
                  padding:
                    "11px",
                  boxSizing:
                    "border-box",
                  border:
                    "1px solid #d1d5db",
                  borderRadius:
                    "8px",
                }}
              />
            </div>

            {/* =================================================
    MAIN COLOR — SIZES & STOCK
================================================= */}

<div
  style={{
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    borderRadius: "10px",
    padding: "16px",
    marginBottom: "12px",
  }}
>
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "10px",
      marginBottom: "12px",
      flexWrap: "wrap",
    }}
  >
    <div>
      <label
        style={{
          display: "block",
          fontWeight: "700",
          marginBottom: "5px",
        }}
      >
        📏 Sizes & Stock
      </label>

      <small
        style={{
          color: "#6b7280",
        }}
      >
        Main Color-এর প্রতিটি Size-এর আলাদা Stock দিন।
      </small>
    </div>

    <button
      type="button"
      onClick={addMainSize}
      style={{
        padding: "9px 13px",
        border: "none",
        borderRadius: "7px",
        background: "#2563eb",
        color: "#fff",
        cursor: "pointer",
        fontWeight: "600",
      }}
    >
      ➕ Add Size
    </button>
  </div>

  {product.sizes.length === 0 && (
    <div
      style={{
        padding: "15px",
        background: "#fff",
        borderRadius: "8px",
        color: "#6b7280",
        textAlign: "center",
        border: "1px dashed #d1d5db",
      }}
    >
      এখনো কোনো Size যোগ করা হয়নি।
    </div>
  )}

  {product.sizes.map((sizeItem, index) => (
    <div
      key={index}
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr auto",
        gap: "8px",
        alignItems: "center",
        marginBottom: "10px",
      }}
    >
      {/* SIZE */}

      <input
        type="text"
        placeholder="Size (Example: M)"
        value={sizeItem.size}
        onChange={(e) =>
          handleMainSizeChange(
            index,
            "size",
            e.target.value
          )
        }
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "11px 13px",
          border: "1px solid #d1d5db",
          borderRadius: "8px",
        }}
      />

      {/* STOCK */}

      <input
        type="number"
        min="0"
        placeholder="Stock"
        value={sizeItem.stock}
        onChange={(e) =>
          handleMainSizeChange(
            index,
            "stock",
            e.target.value
          )
        }
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "11px 13px",
          border: "1px solid #d1d5db",
          borderRadius: "8px",
        }}
      />

      {/* REMOVE SIZE */}

      <button
        type="button"
        onClick={() =>
          removeMainSize(index)
        }
        style={{
          border: "none",
          background: "#dc2626",
          color: "#fff",
          borderRadius: "6px",
          padding: "8px 10px",
          cursor: "pointer",
        }}
      >
        🗑️
      </button>
    </div>
  ))}
</div>

            {/* COLOR VARIANTS */}

<div
  style={{
    marginTop: "20px",
    padding: "18px",
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    borderRadius: "10px",
  }}
>
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "15px",
      gap: "10px",
      flexWrap: "wrap",
    }}
  >
    <h3
      style={{
        margin: 0,
      }}
    >
      🎨 Color Variants
    </h3>

    <button
      type="button"
      onClick={addColorVariant}
      disabled={
        product.color_variants.length >=
        COLOR_VARIANT_LIMIT
      }
      style={{
        padding: "8px 12px",
        border: "none",
        borderRadius: "7px",
        background:
          product.color_variants.length >=
          COLOR_VARIANT_LIMIT
            ? "#aaa"
            : "#2563eb",
        color: "#fff",
        cursor:
          product.color_variants.length >=
          COLOR_VARIANT_LIMIT
            ? "not-allowed"
            : "pointer",
      }}
    >
      ➕ Add Color
    </button>
  </div>

  {product.color_variants.map(
    (variant, index) => (
      <div
        key={index}
        style={{
          background: "#fff",
          padding: "15px",
          borderRadius: "9px",
          marginBottom: "10px",
          border: "1px solid #ddd",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "10px",
          }}
        >
          <strong>
            Color {index + 1}
          </strong>

          <button
            type="button"
            onClick={() =>
              removeColorVariant(index)
            }
            style={{
              border: "none",
              background: "#dc2626",
              color: "#fff",
              borderRadius: "6px",
              padding: "6px 10px",
              cursor: "pointer",
            }}
          >
            🗑️ Remove
          </button>
        </div>

        {/* COLOR NAME */}

        <input
          type="text"
          placeholder="Example: Black"
          value={variant.color}
          onChange={(e) =>
            handleColorVariantChange(
              index,
              e.target.value
            )
          }
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "10px",
            marginBottom: "10px",
            border: "1px solid #d1d5db",
            borderRadius: "7px",
          }}
        />

        {/* COLOR IMAGE */}

        <label
          style={{
            display: "block",
            marginBottom: "7px",
            fontWeight: "600",
          }}
        >
          Color Image
        </label>

        <label
          style={{
            display: "inline-block",
            padding: "9px 13px",
            background: "#eee",
            borderRadius: "7px",
            cursor: "pointer",
          }}
        >
          📸 Choose Image

          <input
            type="file"
            accept="image/*"
            onChange={(e) =>
              handleColorVariantImage(
                index,
                e
              )
            }
            style={{
              display: "none",
            }}
          />
        </label>

        {variant.imagePreview && (
          <img
            src={variant.imagePreview}
            alt={variant.color}
            style={{
              width: "130px",
              height: "160px",
              objectFit: "cover",
              display: "block",
              marginTop: "10px",
              borderRadius: "8px",
            }}
          />
        )}

        {/* =====================================================
            SAREE → ONLY STOCK
        ===================================================== */}

        {product.category === "saree" ? (
          <div
            style={{
              marginTop: "18px",
              paddingTop: "16px",
              borderTop: "1px solid #e5e7eb",
            }}
          >
            <label
              style={{
                display: "block",
                fontWeight: "700",
                marginBottom: "8px",
              }}
            >
              📦 Stock
            </label>

            <input
              type="number"
              min="0"
              placeholder="Stock"
              value={variant.stock ?? ""}
              onChange={(e) => {
                const value = e.target.value;

                setProduct((prev) => ({
                  ...prev,
                  color_variants:
                    prev.color_variants.map(
                      (item, i) =>
                        i === index
                          ? {
                              ...item,
                              stock: value,
                            }
                          : item
                    ),
                }));
              }}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "10px 12px",
                border:
                  "1px solid #d1d5db",
                borderRadius: "8px",
              }}
            />
          </div>
        ) : (
          /* =====================================================
             DRESS → SIZES & STOCK
          ===================================================== */

          <div
            style={{
              marginTop: "18px",
              paddingTop: "16px",
              borderTop:
                "1px solid #e5e7eb",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
                marginBottom: "12px",
                gap: "10px",
              }}
            >
              <strong>
                📏 Sizes & Stock
              </strong>

              <button
                type="button"
                onClick={() =>
                  addColorVariantSize(index)
                }
                style={{
                  padding: "8px 12px",
                  border: "none",
                  borderRadius: "7px",
                  background: "#2563eb",
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
              >
                ➕ Add Size
              </button>
            </div>

            {(variant.sizes || []).length ===
              0 && (
              <div
                style={{
                  padding: "12px",
                  background: "#f9fafb",
                  borderRadius: "8px",
                  color: "#6b7280",
                  textAlign: "center",
                  border:
                    "1px dashed #d1d5db",
                  fontSize: "14px",
                }}
              >
                এখনো কোনো Size যোগ করা হয়নি।
              </div>
            )}

            {(variant.sizes || []).map(
              (sizeItem, sizeIndex) => (
                <div
                  key={sizeIndex}
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "1fr 1fr auto",
                    gap: "10px",
                    alignItems: "center",
                    marginBottom: "10px",
                  }}
                >
                  {/* SIZE */}

                  <input
                    type="text"
                    placeholder="Size (Example: M)"
                    value={sizeItem.size}
                    onChange={(e) =>
                      handleColorVariantSizeChange(
                        index,
                        sizeIndex,
                        e.target.value
                      )
                    }
                    style={{
                      width: "100%",
                      boxSizing:
                        "border-box",
                      padding: "10px 12px",
                      border:
                        "1px solid #d1d5db",
                      borderRadius: "8px",
                    }}
                  />

                  {/* STOCK */}

                  <input
                    type="number"
                    min="0"
                    placeholder="Stock"
                    value={sizeItem.stock}
                    onChange={(e) =>
                      handleColorVariantStockChange(
                        index,
                        sizeIndex,
                        e.target.value
                      )
                    }
                    style={{
                      width: "100%",
                      boxSizing:
                        "border-box",
                      padding: "10px 12px",
                      border:
                        "1px solid #d1d5db",
                      borderRadius: "8px",
                    }}
                  />

                  {/* REMOVE SIZE */}

                  <button
                    type="button"
                    onClick={() =>
                      removeColorVariantSize(
                        index,
                        sizeIndex
                      )
                    }
                    style={{
                      border: "none",
                      background: "#dc2626",
                      color: "#fff",
                      borderRadius: "7px",
                      padding: "9px 11px",
                      cursor: "pointer",
                    }}
                  >
                    🗑️
                  </button>
                </div>
              )
            )}
          </div>
        )}
      </div>
    )
  )}

  {product.color_variants.length === 0 && (
    <p
      style={{
        color: "#6b7280",
      }}
    >
      কোনো Color Variant নেই।
    </p>
  )}
</div>

            {/* DETAILS */}

            <div
              style={{
                marginTop:
                  "18px",
              }}
            >
              <label
                style={{
                  display:
                    "block",
                  fontWeight:
                    "700",
                  marginBottom:
                    "8px",
                }}
              >
                📝 Product Details
              </label>

              <textarea
                name="details"
                value={
                  product.details
                }
                onChange={
                  handleChange
                }
                rows="5"
                style={{
                  width:
                    "100%",
                  boxSizing:
                    "border-box",
                  padding:
                    "11px",
                  marginBottom:
                    "18px",
                  resize:
                    "vertical",
                  border:
                    "1px solid #d1d5db",
                  borderRadius:
                    "8px",
                }}
              />
            </div>

            {/* MODAL BUTTONS */}

            <div
              style={{
                display:
                  "grid",
                gridTemplateColumns:
                  "1fr 1fr",
                gap: "10px",
              }}
            >
              <button
                onClick={async () => {
                  const success =
                    await updateProduct();

                  if (success) {
                    setEditModalOpen(
                      false
                    );
                  }
                }}
                disabled={saving}
                style={{
                  padding:
                    "12px",
                  border:
                    "none",
                  borderRadius:
                    "8px",
                  background:
                    saving
                      ? "#9ca3af"
                      : "#16a34a",
                  color:
                    "#fff",
                  cursor:
                    saving
                      ? "not-allowed"
                      : "pointer",
                  fontWeight:
                    "600",
                }}
              >
                {saving
                  ? "⏳ Updating..."
                  : "💾 Update"}
              </button>

              <button
  onClick={() => {
    setEditModalOpen(false);
  }}
  style={{
    padding: "12px",
    border: "none",
    borderRadius: "8px",
    background: "#777",
    color: "#fff",
    cursor: "pointer",
    fontWeight: "600",
  }}
>
  ❌ Cancel
</button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
    MY ACCOUNT - CHANGE PASSWORD MODAL
===================================================== */}
{myAccountOpen && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.65)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
      padding: "20px",
    }}
  >
    <div
      style={{
        width: "100%",
        maxWidth: "460px",
        background: darkMode ? "#1f2937" : "#ffffff",
        color: darkMode ? "#ffffff" : "#111827",
        borderRadius: "16px",
        padding: "28px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: "24px",
              fontWeight: "800",
            }}
          >
            👤 My Account
          </h2>

          <p
            style={{
              margin: "6px 0 0",
              fontSize: "13px",
              opacity: 0.7,
            }}
          >
            Change your account password
          </p>
        </div>

        <button
          type="button"
          onClick={() => setMyAccountOpen(false)}
          style={{
            border: "none",
            background: "transparent",
            fontSize: "22px",
            cursor: "pointer",
            color: darkMode ? "#fff" : "#111827",
          }}
        >
          ✕
        </button>
      </div>

      {/* Email */}
      <div style={{ marginBottom: "18px" }}>
        <label
          style={{
            display: "block",
            fontWeight: "700",
            marginBottom: "7px",
          }}
        >
          Email
        </label>

        <input
          type="text"
          value={session?.user?.email || ""}
          readOnly
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "12px",
            borderRadius: "8px",
            border: darkMode
              ? "1px solid #4b5563"
              : "1px solid #d1d5db",
            background: darkMode ? "#374151" : "#f3f4f6",
            color: darkMode ? "#d1d5db" : "#6b7280",
            cursor: "not-allowed",
          }}
        />
      </div>

      {/* Current Password */}
      <div style={{ marginBottom: "18px" }}>
        <label
          style={{
            display: "block",
            fontWeight: "700",
            marginBottom: "7px",
          }}
        >
          Current Password
        </label>

        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="Enter current password"
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "12px",
            borderRadius: "8px",
            border: darkMode
              ? "1px solid #4b5563"
              : "1px solid #d1d5db",
            background: darkMode ? "#111827" : "#fff",
            color: darkMode ? "#fff" : "#111827",
          }}
        />
      </div>

      {/* New Password */}
      <div style={{ marginBottom: "18px" }}>
        <label
          style={{
            display: "block",
            fontWeight: "700",
            marginBottom: "7px",
          }}
        >
          New Password
        </label>

        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Enter new password"
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "12px",
            borderRadius: "8px",
            border: darkMode
              ? "1px solid #4b5563"
              : "1px solid #d1d5db",
            background: darkMode ? "#111827" : "#fff",
            color: darkMode ? "#fff" : "#111827",
          }}
        />
      </div>

      {/* Confirm Password */}
      <div style={{ marginBottom: "24px" }}>
        <label
          style={{
            display: "block",
            fontWeight: "700",
            marginBottom: "7px",
          }}
        >
          Confirm New Password
        </label>

        <input
          type="password"
          value={confirmNewPassword}
          onChange={(e) => setConfirmNewPassword(e.target.value)}
          placeholder="Confirm new password"
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "12px",
            borderRadius: "8px",
            border: darkMode
              ? "1px solid #4b5563"
              : "1px solid #d1d5db",
            background: darkMode ? "#111827" : "#fff",
            color: darkMode ? "#fff" : "#111827",
          }}
        />
      </div>

      {/* Buttons */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          justifyContent: "flex-end",
        }}
      >
        <button
          type="button"
          onClick={() => {
            setCurrentPassword("");
            setNewPassword("");
            setConfirmNewPassword("");
            setMyAccountOpen(false);
          }}
          style={{
            padding: "12px 18px",
            border: "none",
            borderRadius: "8px",
            background: "#6b7280",
            color: "#fff",
            cursor: "pointer",
            fontWeight: "700",
          }}
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={handleChangePassword}
          disabled={passwordChanging}
          style={{
            padding: "12px 18px",
            border: "none",
            borderRadius: "8px",
            background: passwordChanging ? "#9ca3af" : "#2563eb",
            color: "#fff",
            cursor: passwordChanging ? "not-allowed" : "pointer",
            fontWeight: "700",
          }}
        >
          {passwordChanging ? "Changing..." : "Change Password"}
        </button>
      </div>
    </div>
  </div>
)}
      {/* RESET PASSWORD MODAL */}
{resetPasswordModalOpen && isOwner && resetPasswordUser && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.55)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 10000,
      padding: "20px",
    }}
  >
    <div
      style={{
        width: "100%",
        maxWidth: "430px",
        background: "#fff",
        borderRadius: "14px",
        padding: "24px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
      }}
    >
      <h2
        style={{
          margin: "0 0 8px",
          fontSize: "22px",
          fontWeight: "700",
        }}
      >
        🔑 Reset Password
      </h2>

      <p
        style={{
          margin: "0 0 20px",
          color: "#666",
          fontSize: "14px",
        }}
      >
        এই user-এর জন্য নতুন password সেট করুন।
      </p>

      <div
        style={{
          padding: "12px",
          background: "#f3f4f6",
          borderRadius: "8px",
          marginBottom: "18px",
        }}
      >
        <div
          style={{
            fontWeight: "600",
            wordBreak: "break-word",
          }}
        >
          {resetPasswordUser.full_name || "No Name"}
        </div>

        <div
          style={{
            marginTop: "4px",
            fontSize: "14px",
            color: "#555",
            wordBreak: "break-word",
          }}
        >
          {resetPasswordUser.email}
        </div>
      </div>

      <label
        style={{
          display: "block",
          marginBottom: "7px",
          fontWeight: "600",
        }}
      >
        New Password
      </label>

      <input
        type="password"
        value={resetNewPassword}
        onChange={(e) => setResetNewPassword(e.target.value)}
        placeholder="Enter new password"
        disabled={resetPasswordLoading}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "11px 12px",
          border: "1px solid #d1d5db",
          borderRadius: "8px",
          marginBottom: "14px",
          fontSize: "15px",
        }}
      />

      <label
        style={{
          display: "block",
          marginBottom: "7px",
          fontWeight: "600",
        }}
      >
        Confirm New Password
      </label>

      <input
        type="password"
        value={resetConfirmPassword}
        onChange={(e) => setResetConfirmPassword(e.target.value)}
        placeholder="Confirm new password"
        disabled={resetPasswordLoading}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "11px 12px",
          border: "1px solid #d1d5db",
          borderRadius: "8px",
          marginBottom: "20px",
          fontSize: "15px",
        }}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "10px",
        }}
      >
        <button
          type="button"
          onClick={() => {
            setResetPasswordUser(null);
            setResetNewPassword("");
            setResetConfirmPassword("");
            setResetPasswordModalOpen(false);
          }}
          disabled={resetPasswordLoading}
          style={{
            padding: "10px 16px",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            background: "#fff",
            color: "#333",
            cursor: resetPasswordLoading
              ? "not-allowed"
              : "pointer",
            fontWeight: "600",
          }}
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={handleOwnerResetPassword}
          disabled={resetPasswordLoading}
          style={{
            padding: "10px 16px",
            border: "none",
            borderRadius: "8px",
            background: resetPasswordLoading
              ? "#9ca3af"
              : "#2563eb",
            color: "#fff",
            cursor: resetPasswordLoading
              ? "not-allowed"
              : "pointer",
            fontWeight: "600",
          }}
        >
          {resetPasswordLoading
            ? "Resetting..."
            : "🔑 Reset Password"}
        </button>
      </div>
    </div>
  </div>
)}
      {/* =====================================================
          USER MANAGEMENT MODAL
      ===================================================== */}

      {userModalOpen && canManageUsers && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 1200,
            overflowY: "auto",
          }}
        >
          <div
            style={{
              background: "#fff",
              width: "100%",
              maxWidth: "720px",
              maxHeight: "90vh",
              overflowY: "auto",
              borderRadius: "14px",
              padding: "25px",
              boxSizing: "border-box",
            }}
          >
            <h2 style={{ marginTop: 0 }}>
              👥 Manage Users
            </h2>

            <p style={{ marginTop: 0, color: "#444" }}>
              {isOwner
                ? "এখানে Admin, Staff অথবা Viewer account তৈরি করতে পারবেন।"
                : "এখানে Staff অথবা Viewer account তৈরি করতে পারবেন।"}
            </p>

            {/* CREATE USER FORM */}
            <div
              style={{
                display: "grid",
                gap: "12px",
              }}
            >
              {/* SHORT NAME */}
<div>
  <label
    style={{
      display: "block",
      marginBottom: "6px",
    }}
  >
    Short Name
  </label>

  <input
    type="text"
    placeholder="e.g. Sujon"
    value={newUserShortName}
    onChange={(e) =>
      setNewUserShortName(e.target.value)
    }
    style={{
      width: "100%",
      padding: "10px",
      boxSizing: "border-box",
      border: "1px solid #d1d5db",
      borderRadius: "7px",
    }}
  />
</div>

{/* EMAIL */}
<div>
  <label
    style={{
      display: "block",
      marginBottom: "6px",
    }}
  >
    Email Address
  </label>

  <input
    type="email"
    placeholder="example@email.com"
    value={newUserEmail}
    onChange={(e) =>
      setNewUserEmail(e.target.value)
    }
    style={{
      width: "100%",
      padding: "10px",
      boxSizing: "border-box",
      border: "1px solid #d1d5db",
      borderRadius: "7px",
    }}
  />
</div>

              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  Password
                </label>
                <input
                  type="password"
                  placeholder="Password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    boxSizing: "border-box",
                    border: "1px solid #d1d5db",
                    borderRadius: "7px",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  Access Role
                </label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #d1d5db",
                    borderRadius: "7px",
                  }}
                >
                  {isOwner && <option value="admin">Admin</option>}
                  <option value="staff">Staff</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "10px",
                  marginTop: "5px",
                }}
              >
                <button
                  onClick={createNewUser}
                  disabled={saving}
                  style={{
                    padding: "12px",
                    border: "none",
                    borderRadius: "8px",
                    background: saving ? "#9ca3af" : "#16a34a",
                    color: "#fff",
                    cursor: saving ? "not-allowed" : "pointer",
                    fontWeight: "600",
                  }}
                >
                  {saving ? "⏳ Creating..." : "➕ Create User"}
                </button>

                <button
                  onClick={() => {
                    setUserModalOpen(false);
                    setNewUserEmail("");
                    setNewUserPassword("");
                    setNewUserRole("staff");
                  }}
                  style={{
                    padding: "12px",
                    border: "none",
                    borderRadius: "8px",
                    background: "#777",
                    color: "#fff",
                    cursor: "pointer",
                    fontWeight: "600",
                  }}
                >
                  ❌ Close
                </button>
              </div>
            </div>

            {/* USER LIST */}
            <div
              style={{
                marginTop: "25px",
                borderTop: "1px solid #e5e7eb",
                paddingTop: "20px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px",
                  marginBottom: "15px",
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: "18px",
                  }}
                >
                  👥 Users With Access
                </h3>

                <button
                  onClick={loadUsers}
                  disabled={usersLoading}
                  style={{
                    padding: "7px 10px",
                    border: "none",
                    borderRadius: "7px",
                    background: usersLoading ? "#9ca3af" : "#2563eb",
                    color: "#fff",
                    cursor: usersLoading ? "not-allowed" : "pointer",
                    fontWeight: "600",
                  }}
                >
                  {usersLoading ? "⏳ Loading..." : "🔄 Refresh"}
                </button>
              </div>

              {usersLoading ? (
                <p style={{ textAlign: "center", color: "#666" }}>
                  ⏳ Loading users...
                </p>
              ) : users.length === 0 ? (
                <p
                  style={{
                    textAlign: "center",
                    color: "#777",
                    padding: "20px 0",
                  }}
                >
                  কোনো user পাওয়া যায়নি।
                </p>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  {users.map((item) => {
                    const roleLabel =
                      item.role === "owner"
                        ? "👑 Owner"
                        : item.role === "admin"
                        ? "🛡️ Admin"
                        : item.role === "staff"
                        ? "👤 Staff"
                        : "👀 Viewer";

                    const isProtected =
                      item.role === "owner" ||
                      item.id === currentUserId;

                    return (
                      <div
                        key={item.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "12px",
                          padding: "12px",
                          border: "1px solid #e5e7eb",
                          borderRadius: "10px",
                          background: "#f9fafb",
                        }}
                      >
                        <div
                          style={{
                            minWidth: 0,
                            flex: 1,
                          }}
                        >
                          <div style={{ fontWeight: "600", wordBreak: "break-word" }}>
  {item.full_name || "No Name"}
</div>

<div
  style={{
    marginTop: "4px",
    fontSize: "14px",
    color: "#555",
    wordBreak: "break-word",
  }}
>
  {item.email}
</div>

<div
  style={{
    marginTop: "4px",
    fontSize: "14px",
    color: "#555",
  }}
>
  👤 {roleLabel}
  {item.id === currentUserId && " • You"}
</div>
                        </div>

                        {isProtected ? (
                          <span
                            style={{
                              fontSize: "13px",
                              color: "#777",
                              whiteSpace: "nowrap",
                            }}
                          >
                            🔒 Protected
                          </span>
                        ) : (
  <>
    {isOwner &&
      !isProtected &&
      item.role !== "owner" && (
        <button
          onClick={() => {
            setResetPasswordUser(item);
            setResetNewPassword("");
            setResetConfirmPassword("");
            setResetPasswordModalOpen(true);
          }}
          style={{
            padding: "8px 12px",
            border: "none",
            borderRadius: "7px",
            background: "#2563eb",
            color: "#fff",
            cursor: "pointer",
            fontWeight: "600",
            whiteSpace: "nowrap",
            marginRight: "8px",
          }}
        >
          🔑 Reset Password
        </button>
      )}

    <button
      onClick={() => removeUser(item.id, item.email)}
      disabled={removingUserId === item.id}
      style={{
        padding: "8px 12px",
        border: "none",
        borderRadius: "7px",
        background:
          removingUserId === item.id
            ? "#9ca3af"
            : "#dc2626",
        color: "#fff",
        cursor:
          removingUserId === item.id
            ? "not-allowed"
            : "pointer",
        fontWeight: "600",
        whiteSpace: "nowrap",
      }}
    >
      {removingUserId === item.id
        ? "Removing..."
        : "🗑 Remove"}
    </button>
  </>
)}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
                        {/* PASSWORD HISTORY */}
            {isOwner && (
              <div
                style={{
                  marginTop: "25px",
                  borderTop: "1px solid #e5e7eb",
                  paddingTop: "20px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "10px",
                    marginBottom: "15px",
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      fontSize: "18px",
                    }}
                  >
                    🔐 Password History
                  </h3>

                  <button
                    type="button"
                    onClick={loadPasswordHistory}
                    disabled={passwordHistoryLoading}
                    style={{
                      padding: "7px 10px",
                      border: "none",
                      borderRadius: "7px",
                      background: passwordHistoryLoading
                        ? "#9ca3af"
                        : "#7c3aed",
                      color: "#fff",
                      cursor: passwordHistoryLoading
                        ? "not-allowed"
                        : "pointer",
                      fontWeight: "600",
                    }}
                  >
                    {passwordHistoryLoading
                      ? "⏳ Loading..."
                      : "🔄 Refresh"}
                  </button>
                </div>

                {passwordHistoryLoading ? (
                  <p
                    style={{
                      textAlign: "center",
                      color: "#666",
                      padding: "15px 0",
                    }}
                  >
                    ⏳ Loading password history...
                  </p>
                ) : passwordHistory.length === 0 ? (
                  <p
                    style={{
                      textAlign: "center",
                      color: "#777",
                      padding: "15px 0",
                    }}
                  >
                    কোনো password history পাওয়া যায়নি।
                  </p>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                    }}
                  >
                    {passwordHistory.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          padding: "12px",
                          border: "1px solid #e5e7eb",
                          borderRadius: "10px",
                          background: "#f9fafb",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: "10px",
                            flexWrap: "wrap",
                          }}
                        >
                          <div
                            style={{
                              fontWeight: "700",
                              color:
                                item.action === "Password Reset"
                                  ? "#2563eb"
                                  : "#16a34a",
                            }}
                          >
                            {item.action === "Password Reset"
                              ? "🔑 Password Reset"
                              : "🔐 Password Changed"}
                          </div>

                          <div
                            style={{
                              fontSize: "13px",
                              color: "#777",
                            }}
                          >
                            {item.created_at
                              ? new Date(
                                  item.created_at
                                ).toLocaleString()
                              : "Unknown time"}
                          </div>
                        </div>

                        <div
                          style={{
                            marginTop: "8px",
                            fontSize: "14px",
                            color: "#444",
                          }}
                        >
                          <strong>User:</strong>{" "}
                          {item.user_short_name ||
                            item.user_email ||
                            "Unknown User"}
                        </div>

                        {item.user_email && (
                          <div
                            style={{
                              marginTop: "4px",
                              fontSize: "13px",
                              color: "#666",
                            }}
                          >
                            📧 {item.user_email}
                          </div>
                        )}

                        <div
                          style={{
                            marginTop: "4px",
                            fontSize: "14px",
                            color: "#444",
                          }}
                        >
                          <strong>Changed By:</strong>{" "}
                          {item.changed_by_short_name ||
                            item.changed_by_email ||
                            "Unknown"}
                        </div>

                        <div
                          style={{
                            marginTop: "4px",
                            fontSize: "13px",
                            color: "#666",
                          }}
                        >
                          👤 Role:{" "}
                          {item.changed_by_role || "Unknown"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      
      {/* =====================================================
    ORDER DETAILS MODAL
===================================================== */}
{selectedOrder && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.65)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      zIndex: 2000,
      overflowY: "auto",
    }}
  >
    <div
      style={{
        background: "#ffffff",
        width: "100%",
        maxWidth: "900px",
        maxHeight: "92vh",
        overflowY: "auto",
        borderRadius: "16px",
        boxSizing: "border-box",
        padding: "25px",
      }}
    >
      

      
      {/* =================================================
          HEADER
      ================================================= */}

      <div
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "15px",
    marginBottom: "22px",
    paddingBottom: "18px",
    borderBottom: "1px solid #e5e7eb",
  }}
>
  <div>
    <h2
      style={{
        margin: 0,
        fontSize: "24px",
        fontWeight: "700",
      }}
    >
      🧾 Order Details
    </h2>

    <div
      style={{
        marginTop: "7px",
        fontSize: "14px",
        color: "#6b7280",
      }}
    >
      Order #{selectedOrder.order_number || "—"}
    </div>
  </div>

  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: "8px",
    }}
  >
    <button
  type="button"
  onClick={() => setInvoiceOpen(true)}
  style={{
    border: "none",
    borderRadius: "8px",
    padding: "9px 14px",
    background: "#111827",
    color: "#fff",
    cursor: "pointer",
    fontWeight: "700",
  }}
>
  🧾 Invoice
</button>
    {(isOwner || isAdmin) &&
  orderIsEditable && (
    <button
      type="button"
      onClick={startEditOrder}
      style={{
        padding: "10px 16px",
        border: "none",
        borderRadius: "8px",
        background: "#2563eb",
        color: "#fff",
        cursor: "pointer",
        fontWeight: "700",
      }}
    >
      ✏️ Edit Order
    </button>
    
  )}
  {orderIsLocked && (
  <div
    style={{
      marginTop: "10px",
      padding: "10px 12px",
      borderRadius: "8px",
      background: darkMode
        ? "#3f1d1d"
        : "#fef2f2",
      color: darkMode
        ? "#fca5a5"
        : "#b91c1c",
      fontSize: "13px",
      fontWeight: "700",
      border: `1px solid ${
        darkMode
          ? "#7f1d1d"
          : "#fecaca"
      }`,
    }}
  >
    🔒 This order is locked after Shipped.
  </div>
)}

    <button
      type="button"
      onClick={() => {
        setSelectedOrder(null);
        setSelectedOrderItems([]);
        setEditOrderMode(false);
      }}
      style={{
        border: "none",
        background: "#f3f4f6",
        color: "#374151",
        width: "36px",
        height: "36px",
        borderRadius: "8px",
        fontSize: "22px",
        cursor: "pointer",
      }}
    >
      ×
    </button>
  </div>
</div>

      {/* =================================================
          CUSTOMER INFORMATION
      ================================================= */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "12px",
          marginBottom: "22px",
        }}
      >

        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e5e7eb",
            borderRadius: "10px",
            padding: "14px",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              color: "#6b7280",
              marginBottom: "5px",
            }}
          >
            👤 Customer Name
          </div>

          <strong>
            {selectedOrder.customer_name || "—"}
          </strong>
        </div>

        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e5e7eb",
            borderRadius: "10px",
            padding: "14px",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              color: "#6b7280",
              marginBottom: "5px",
            }}
          >
            📱 Mobile Number
          </div>

          <strong>
            {selectedOrder.customer_phone || "—"}
          </strong>
        </div>

        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e5e7eb",
            borderRadius: "10px",
            padding: "14px",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              color: "#6b7280",
              marginBottom: "5px",
            }}
          >
            📅 Date & Time
          </div>

          <strong>
            {selectedOrder.created_at
              ? new Date(
                  selectedOrder.created_at
                ).toLocaleString("en-BD", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })
              : "—"}
          </strong>
        </div>

        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e5e7eb",
            borderRadius: "10px",
            padding: "14px",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              color: "#6b7280",
              marginBottom: "5px",
            }}
          >
            📦 Status
          </div>

          <strong
            style={{
              textTransform: "capitalize",
            }}
          >
            {selectedOrder.status || "pending"}
          </strong>
        </div>

      </div>
      <div
  style={{
    marginTop: "14px",
    padding: "10px 12px",
    background: "#f8fafc",
    borderRadius: "8px",
    border: "1px solid #e5e7eb",
  }}
>
  <div
    style={{
      fontSize: "12px",
      color: "#6b7280",
      marginBottom: "4px",
    }}
  >
    Created By
  </div>

  <div
    style={{
      fontWeight: 700,
      color: "#111827",
    }}
  >
    {selectedOrder.created_by_name || "Unknown"}
  </div>
</div>

      {/* ADDRESS */}

      <div
        style={{
          background: "#f8fafc",
          border: "1px solid #e5e7eb",
          borderRadius: "10px",
          padding: "14px",
          marginBottom: "22px",
        }}
      >
        <div
          style={{
            fontSize: "12px",
            color: "#6b7280",
            marginBottom: "5px",
          }}
        >
          📍 Customer Address
        </div>

        <div
          style={{
            whiteSpace: "pre-wrap",
            lineHeight: "1.5",
          }}
        >
          {selectedOrder.customer_address || "—"}
        </div>
      </div>
      {/* =================================================
    ORDER STATUS WORKFLOW
================================================= */}

<div
  style={{
    marginBottom: "22px",
    padding: "16px",
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    borderRadius: "10px",
  }}
>
  <div
    style={{
      fontSize: "13px",
      color: "#6b7280",
      marginBottom: "10px",
      fontWeight: "700",
    }}
  >
    📦 Order Status
  </div>

  {/* CURRENT STATUS */}

  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: "10px",
      marginBottom: "14px",
      flexWrap: "wrap",
    }}
  >
    <strong
      style={{
        fontSize: "18px",
        textTransform: "capitalize",
      }}
    >
      {selectedOrder.status || "pending"}
    </strong>
  </div>

  {/* STATUS BUTTONS */}

  {!editOrderMode &&
    (isOwner || isAdmin) && (
      <div
        style={{
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >

        {/* PENDING → PACKAGING */}

        {String(
          selectedOrder.status || "pending"
        ).toLowerCase() === "pending" && (
          <button
            type="button"
            onClick={() =>
              updateOrderStatus("packaging")
            }
            style={{
              border: "none",
              borderRadius: "8px",
              padding: "9px 13px",
              background: "#f59e0b",
              color: "#fff",
              cursor: "pointer",
              fontWeight: "700",
            }}
          >
            📦 Move to Packaging
          </button>
        )}

        {/* PACKAGING → SHIPPED */}

        {String(
          selectedOrder.status || ""
        ).toLowerCase() === "packaging" && (
          <button
            type="button"
            onClick={() =>
              updateOrderStatus("shipped")
            }
            style={{
              border: "none",
              borderRadius: "8px",
              padding: "9px 13px",
              background: "#2563eb",
              color: "#fff",
              cursor: "pointer",
              fontWeight: "700",
            }}
          >
            🚚 Mark as Shipped
          </button>
        )}

        {/* SHIPPED → LOCKED */}

{String(
  selectedOrder.status || ""
).toLowerCase() === "shipped" && (
  <div
    style={{
      padding: "9px 13px",
      borderRadius: "8px",
      background: "#e5e7eb",
      color: "#374151",
      fontWeight: "700",
    }}
  >
    🔒 Order Locked
  </div>
)}

        {/* CANCEL */}

        {(
  String(selectedOrder.status || "pending").toLowerCase() === "pending" ||
  String(selectedOrder.status || "").toLowerCase() === "packaging"
) && (
  <button
    type="button"
    onClick={cancelOrder}
    style={{
      border: "none",
      borderRadius: "8px",
      padding: "9px 13px",
      background: "#dc2626",
      color: "#fff",
      cursor: "pointer",
      fontWeight: "700",
    }}
  >
    ❌ Cancel Order
  </button>
)}

      </div>
    )}
</div>

      {/* =================================================
    ORDER ITEMS
================================================= */}

<h3
  style={{
    margin: "0 0 12px",
    fontSize: "18px",
  }}
>
  🛍️ Products
</h3>

{orderDetailsLoading ? (
  <div
    style={{
      padding: "40px 20px",
      textAlign: "center",
      color: "#6b7280",
    }}
  >
    ⏳ Loading order items...
  </div>
) : editOrderMode ? (

  /* =================================================
     EDIT MODE
  ================================================= */

  editOrderItems.length === 0 ? (

    <div
      style={{
        padding: "35px 20px",
        textAlign: "center",
        background: "#fef2f2",
        borderRadius: "10px",
        color: "#991b1b",
      }}
    >
      Order-এ কমপক্ষে একটি product থাকতে হবে।
    </div>

  ) : (

    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >

      {/* =================================================
    ADD PRODUCT TO EXISTING ORDER
================================================= */}

<div
  style={{
    position: "relative",
    marginBottom: "15px",
  }}
>
  <div
    style={{
      display: "flex",
      gap: "8px",
    }}
  >
    <input
      type="text"
      placeholder="🔎 Search product to add..."
      value={addOrderProductSearch}
      onChange={(e) => {
        setAddOrderProductSearch(e.target.value);
        setAddOrderProductOpen(true);
      }}
      onFocus={() =>
        setAddOrderProductOpen(true)
      }
      style={{
        flex: 1,
        padding: "10px 12px",
        border: "1px solid #d1d5db",
        borderRadius: "8px",
        boxSizing: "border-box",
        fontSize: "14px",
      }}
    />

    <button
      type="button"
      onClick={() =>
        setAddOrderProductOpen(
          !addOrderProductOpen
        )
      }
      style={{
        border: "none",
        borderRadius: "8px",
        padding: "10px 15px",
        background: "#2563eb",
        color: "#fff",
        cursor: "pointer",
        fontWeight: "700",
        whiteSpace: "nowrap",
      }}
    >
      ➕ Add Product
    </button>
  </div>

  {addOrderProductOpen && (
    <div
      style={{
        position: "absolute",
        top: "50px",
        left: 0,
        right: 0,
        background: "#fff",
        border: "1px solid #d1d5db",
        borderRadius: "8px",
        boxShadow:
          "0 8px 20px rgba(0,0,0,0.12)",
        zIndex: 100,
        maxHeight: "300px",
        overflowY: "auto",
      }}
    >
      {addOrderProductResults.length === 0 ? (
        <div
          style={{
            padding: "18px",
            textAlign: "center",
            color: "#6b7280",
            fontSize: "13px",
          }}
        >
          No product found.
        </div>
      ) : (
        addOrderProductResults.map(
          (product) => (
            <button
              key={product.id}
              type="button"
              onClick={() =>
                addProductToExistingOrder(
                  product
                )
              }
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px",
                border: "none",
                borderBottom:
                  "1px solid #f1f5f9",
                background: "#fff",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  style={{
                    width: "50px",
                    height: "50px",
                    objectFit: "cover",
                    borderRadius: "7px",
                    flexShrink: 0,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "50px",
                    height: "50px",
                    borderRadius: "7px",
                    background: "#f3f4f6",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    fontSize: "20px",
                  }}
                >
                  🖼️
                </div>
              )}

              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    fontWeight: "700",
                    fontSize: "13px",
                    marginBottom: "3px",
                  }}
                >
                  {product.name}
                </div>

                <div
                  style={{
                    fontSize: "12px",
                    color: "#6b7280",
                  }}
                >
                  {product.color || "No Color"}
                  {" • "}
                  ৳
                  {Number(
                    product.price || 0
                  ).toLocaleString()}
                </div>
              </div>

              <span
                style={{
                  fontSize: "12px",
                  color: "#2563eb",
                  fontWeight: "700",
                }}
              >
                Add
              </span>
            </button>
          )
        )
      )}
    </div>
  )}
</div>
      {editOrderItems.map((item) => (

        <div
          key={item.id}
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "10px",
            padding: "14px",
            background: "#fafafa",
          }}
        >

          {/* PRODUCT */}

          <div
            style={{
              display: "flex",
              gap: "12px",
              alignItems: "flex-start",
            }}
          >

            {item.product_image_url ? (
              <img
                src={item.product_image_url}
                alt={item.product_name || "Product"}
                style={{
                  width: "75px",
                  height: "75px",
                  objectFit: "cover",
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                  flexShrink: 0,
                }}
              />
            ) : (
              <div
                style={{
                  width: "75px",
                  height: "75px",
                  borderRadius: "8px",
                  background: "#f3f4f6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "25px",
                  flexShrink: 0,
                }}
              >
                🖼️
              </div>
            )}

            <div
              style={{
                flex: 1,
                minWidth: 0,
              }}
            >

              <div
                style={{
                  fontWeight: "700",
                  marginBottom: "5px",
                }}
              >
                {item.product_name || "Deleted Product"}
              </div>

              <div
                style={{
                  fontSize: "13px",
                  color: "#6b7280",
                }}
              >
                Color: {item.color || "—"}
              </div>

              <div
                style={{
                  fontSize: "13px",
                  color: "#6b7280",
                }}
              >
                Size: {item.size || "—"}
              </div>

            </div>

            {/* REMOVE */}

            <button
              type="button"
              onClick={() =>
                removeEditOrderItem(item.id)
              }
              style={{
                border: "none",
                background: "#fee2e2",
                color: "#b91c1c",
                borderRadius: "7px",
                padding: "7px 10px",
                cursor: "pointer",
                fontWeight: "700",
              }}
            >
              🗑 Remove
            </button>

          </div>

          {/* EDIT FIELDS */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "1fr 1fr 1fr",
              gap: "10px",
              marginTop: "14px",
            }}
          >

            {/* QUANTITY */}

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "700",
                  marginBottom: "5px",
                  color: "#6b7280",
                }}
              >
                Quantity
              </label>

              <input
                type="number"
                min="1"
                value={item.quantity}
                onChange={(e) =>
                  updateEditOrderItem(
                    item.id,
                    "quantity",
                    Math.max(
                      1,
                      Number(e.target.value || 1)
                    )
                  )
                }
                style={{
                  width: "100%",
                  padding: "9px 10px",
                  border:
                    "1px solid #d1d5db",
                  borderRadius: "7px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* UNIT PRICE */}

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "700",
                  marginBottom: "5px",
                  color: "#6b7280",
                }}
              >
                Unit Price
              </label>

              <input
                type="number"
                min="0"
                value={item.unit_price}
                onChange={(e) =>
                  updateEditOrderItem(
                    item.id,
                    "unit_price",
                    Math.max(
                      0,
                      Number(e.target.value || 0)
                    )
                  )
                }
                style={{
                  width: "100%",
                  padding: "9px 10px",
                  border:
                    "1px solid #d1d5db",
                  borderRadius: "7px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* ITEM TOTAL */}

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "700",
                  marginBottom: "5px",
                  color: "#6b7280",
                }}
              >
                Item Total
              </label>

              <div
                style={{
                  width: "100%",
                  padding: "9px 10px",
                  background: "#f3f4f6",
                  borderRadius: "7px",
                  boxSizing: "border-box",
                  fontWeight: "700",
                }}
              >
                ৳
                {Number(
                  item.total_price || 0
                ).toLocaleString()}
              </div>
            </div>

          </div>

        </div>

      ))}

    </div>

  )

) : (

  /* =================================================
     NORMAL VIEW MODE
  ================================================= */

  selectedOrderItems.length === 0 ? (

    <div
      style={{
        padding: "35px 20px",
        textAlign: "center",
        background: "#f8fafc",
        borderRadius: "10px",
        color: "#6b7280",
      }}
    >
      এই order-এর কোনো product পাওয়া যায়নি।
    </div>

  ) : (

    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}
    >

      {selectedOrderItems.map((item) => (

        <div
          key={item.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            padding: "12px",
            border: "1px solid #e5e7eb",
            borderRadius: "10px",
          }}
        >

          {item.product_image_url ? (
            <img
              src={item.product_image_url}
              alt={item.product_name || "Product"}
              style={{
                width: "72px",
                height: "72px",
                objectFit: "cover",
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              style={{
                width: "72px",
                height: "72px",
                borderRadius: "8px",
                background: "#f3f4f6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontSize: "25px",
              }}
            >
              🖼️
            </div>
          )}

          <div
            style={{
              flex: 1,
              minWidth: 0,
            }}
          >
            <div
              style={{
                fontWeight: "700",
                marginBottom: "5px",
              }}
            >
              {item.product_name ||
                "Deleted Product"}
            </div>

            <div
              style={{
                fontSize: "13px",
                color: "#6b7280",
              }}
            >
              Color: {item.color || "—"}
            </div>

            <div
              style={{
                fontSize: "13px",
                color: "#6b7280",
              }}
            >
              Size: {item.size || "—"}
            </div>
          </div>

          <div
            style={{
              textAlign: "center",
              minWidth: "60px",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                color: "#6b7280",
              }}
            >
              Qty
            </div>

            <strong>
              {item.quantity || 0}
            </strong>
          </div>

          <div
            style={{
              textAlign: "right",
              minWidth: "100px",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                color: "#6b7280",
              }}
            >
              Price
            </div>

            <strong>
              ৳
              {Number(
                item.unit_price || 0
              ).toLocaleString()}
            </strong>
          </div>

          <div
            style={{
              textAlign: "right",
              minWidth: "110px",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                color: "#6b7280",
              }}
            >
              Total
            </div>

            <strong
              style={{
                fontSize: "16px",
              }}
            >
              ৳
              {Number(
                item.total_price || 0
              ).toLocaleString()}
            </strong>
          </div>

        </div>

      ))}

    </div>

  )

)}

      {/* =================================================
    ORDER SUMMARY
================================================= */}

<div
  style={{
    marginTop: "22px",
    marginLeft: "auto",
    maxWidth: "360px",
    borderTop: "1px solid #e5e7eb",
    paddingTop: "16px",
  }}
>
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      marginBottom: "8px",
    }}
  >
    <span>Subtotal</span>

    <strong>
      ৳
      {(
        editOrderMode
          ? editOrderSubtotal
          : Number(
              selectedOrder.subtotal || 0
            )
      ).toLocaleString()}
    </strong>
  </div>

  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "8px",
    }}
  >
    <span>Delivery Charge</span>

    {editOrderMode ? (
      <select
        value={editOrderDeliveryCharge}
        onChange={(e) =>
          setEditOrderDeliveryCharge(
            Number(e.target.value)
          )
        }
        style={{
          padding: "7px 9px",
          border:
            "1px solid #d1d5db",
          borderRadius: "7px",
          background: "#fff",
        }}
      >
        <option value={0}>
          Free — ৳0
        </option>

        <option value={80}>
          ৳80
        </option>

        <option value={150}>
          ৳150
        </option>
      </select>
    ) : (
      <strong>
        {Number(
          selectedOrder.delivery_charge || 0
        ) === 0
          ? "Free"
          : `৳${Number(
              selectedOrder.delivery_charge || 0
            ).toLocaleString()}`}
      </strong>
    )}
  </div>

  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      marginTop: "12px",
      paddingTop: "12px",
      borderTop:
        "1px solid #e5e7eb",
      fontSize: "19px",
    }}
  >
    <strong>Total</strong>

    <strong>
      ৳
      {(
        editOrderMode
          ? editOrderTotal
          : Number(
              selectedOrder.total_amount || 0
            )
      ).toLocaleString()}
    </strong>
  </div>
</div>

      {/* =================================================
          CLOSE
      ================================================= */}

      {editOrderMode ? (
  <div
    style={{
      display: "grid",
      gridTemplateColumns:
        "1fr 1fr",
      gap: "10px",
      marginTop: "24px",
    }}
  >

    <button
      type="button"
      onClick={() => {
        setEditOrderMode(false);
        setEditOrderItems([]);
      }}
      disabled={editOrderSaving}
      style={{
        padding: "12px",
        border: "none",
        borderRadius: "8px",
        background: "#6b7280",
        color: "#fff",
        cursor: editOrderSaving
          ? "not-allowed"
          : "pointer",
        fontWeight: "700",
      }}
    >
      ❌ Cancel Edit
    </button>

    <button
      type="button"
      onClick={saveEditedOrder}
      disabled={editOrderSaving}
      style={{
        padding: "12px",
        border: "none",
        borderRadius: "8px",
        background: editOrderSaving
          ? "#9ca3af"
          : "#16a34a",
        color: "#fff",
        cursor: editOrderSaving
          ? "not-allowed"
          : "pointer",
        fontWeight: "700",
      }}
    >
      {editOrderSaving
        ? "⏳ Saving..."
        : "💾 Save Changes"}
    </button>

  </div>
) : (
  <button
    type="button"
    onClick={() => {
      setSelectedOrder(null);
      setSelectedOrderItems([]);
    }}
    style={{
      width: "100%",
      marginTop: "24px",
      padding: "12px",
      border: "none",
      borderRadius: "8px",
      background: "#374151",
      color: "#fff",
      cursor: "pointer",
      fontWeight: "700",
    }}
  >
    ✕ Close
  </button>
)}

    </div>
  </div>
)}
      {/* =====================================================
    INVOICE VIEW MODAL
===================================================== */}

{invoiceOpen && selectedOrder && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.65)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      zIndex: 3000,
      overflowY: "auto",
    }}
  >

    <div
      style={{
        background: "#fff",
        width: "100%",
        maxWidth: "850px",
        maxHeight: "92vh",
        overflowY: "auto",
        borderRadius: "16px",
        padding: "30px",
        boxSizing: "border-box",
      }}
    >

      {/* HEADER */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "15px",
          marginBottom: "25px",
        }}
      >

        <div
          style={{
            flex: 1,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "30px",
              fontWeight: "800",
              letterSpacing: "1px",
            }}
          >
            SANVEE'S
          </div>

          <div
            style={{
              fontSize: "13px",
              color: "#6b7280",
              marginTop: "3px",
            }}
          >
            by Tony
          </div>

          <div
            style={{
              marginTop: "10px",
              fontSize: "20px",
              fontWeight: "700",
            }}
          >
            ORDER INVOICE
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            setInvoiceOpen(false)
          }
          style={{
            width: "36px",
            height: "36px",
            border: "none",
            borderRadius: "8px",
            background: "#f3f4f6",
            color: "#374151",
            fontSize: "22px",
            cursor: "pointer",
          }}
        >
          ×
        </button>

      </div>

      {/* ORDER + CUSTOMER */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "1fr 1fr",
          gap: "15px",
          marginBottom: "22px",
        }}
      >

        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "10px",
            padding: "15px",
          }}
        >

          <div
            style={{
              fontSize: "12px",
              color: "#6b7280",
              marginBottom: "6px",
              textTransform: "uppercase",
              fontWeight: "700",
            }}
          >
            Order Number
          </div>

          <strong>
            {selectedOrder.order_number || "—"}
          </strong>

          <div
            style={{
              marginTop: "10px",
              fontSize: "13px",
            }}
          >
            <strong>
              Date & Time:
            </strong>

            <br />

            {selectedOrder.created_at
              ? new Date(
                  selectedOrder.created_at
                ).toLocaleString("en-BD", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—"}
          </div>

        </div>

        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "10px",
            padding: "15px",
          }}
        >

          <div
            style={{
              fontSize: "12px",
              color: "#6b7280",
              marginBottom: "6px",
              textTransform: "uppercase",
              fontWeight: "700",
            }}
          >
            Customer
          </div>

          <strong>
            {selectedOrder.customer_name || "—"}
          </strong>

          <div
            style={{
              marginTop: "7px",
              fontSize: "13px",
            }}
          >
            📱{" "}
            {selectedOrder.customer_phone || "—"}
          </div>

          <div
            style={{
              marginTop: "6px",
              fontSize: "13px",
              lineHeight: "1.5",
            }}
          >
            📍{" "}
            {selectedOrder.customer_address || "—"}
          </div>

        </div>

      </div>

      {/* PRODUCTS */}

      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: "10px",
          overflowX: "auto",
        }}
      >

        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: "650px",
          }}
        >

          <thead>

            <tr
              style={{
                background: "#f8fafc",
              }}
            >

              <th
                style={{
                  padding: "12px",
                  textAlign: "left",
                  fontSize: "13px",
                }}
              >
                Image
              </th>

              <th
                style={{
                  padding: "12px",
                  textAlign: "left",
                  fontSize: "13px",
                }}
              >
                Product
              </th>

              <th
                style={{
                  padding: "12px",
                  textAlign: "center",
                  fontSize: "13px",
                }}
              >
                Qty
              </th>

              <th
                style={{
                  padding: "12px",
                  textAlign: "right",
                  fontSize: "13px",
                }}
              >
                Price
              </th>

              <th
                style={{
                  padding: "12px",
                  textAlign: "right",
                  fontSize: "13px",
                }}
              >
                Total
              </th>

            </tr>

          </thead>

          <tbody>

            {selectedOrderItems.map(
              (item) => (
                <tr key={item.id}>

                  <td
                    style={{
                      padding: "12px",
                      borderTop:
                        "1px solid #e5e7eb",
                    }}
                  >
                    {item.product_image_url ? (
                      <img
                        src={
                          item.product_image_url
                        }
                        alt={
                          item.product_name ||
                          "Product"
                        }
                        style={{
                          width: "60px",
                          height: "70px",
                          objectFit: "cover",
                          borderRadius: "7px",
                          border:
                            "1px solid #e5e7eb",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "60px",
                          height: "70px",
                          background: "#f3f4f6",
                          borderRadius: "7px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        🖼️
                      </div>
                    )}
                  </td>

                  <td
                    style={{
                      padding: "12px",
                      borderTop:
                        "1px solid #e5e7eb",
                    }}
                  >

                    <strong>
                      {item.product_name ||
                        "Deleted Product"}
                    </strong>

                    <div
                      style={{
                        marginTop: "5px",
                        fontSize: "12px",
                        color: "#6b7280",
                      }}
                    >
                      Color:{" "}
                      {item.color || "—"}
                    </div>

                    <div
                      style={{
                        marginTop: "3px",
                        fontSize: "12px",
                        color: "#6b7280",
                      }}
                    >
                      Size:{" "}
                      {item.size || "—"}
                    </div>

                  </td>

                  <td
                    style={{
                      padding: "12px",
                      textAlign: "center",
                      borderTop:
                        "1px solid #e5e7eb",
                    }}
                  >
                    {item.quantity || 0}
                  </td>

                  <td
                    style={{
                      padding: "12px",
                      textAlign: "right",
                      borderTop:
                        "1px solid #e5e7eb",
                    }}
                  >
                    ৳
                    {Number(
                      item.unit_price || 0
                    ).toLocaleString()}
                  </td>

                  <td
                    style={{
                      padding: "12px",
                      textAlign: "right",
                      borderTop:
                        "1px solid #e5e7eb",
                      fontWeight: "700",
                    }}
                  >
                    ৳
                    {Number(
                      item.total_price || 0
                    ).toLocaleString()}
                  </td>

                </tr>
              )
            )}

          </tbody>

        </table>

      </div>

      {/* SUMMARY */}

      <div
        style={{
          maxWidth: "360px",
          marginLeft: "auto",
          marginTop: "22px",
        }}
      >

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "8px",
          }}
        >
          <span>
            Subtotal
          </span>

          <strong>
            ৳
            {Number(
              selectedOrder.subtotal || 0
            ).toLocaleString()}
          </strong>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "10px",
          }}
        >
          <span>
            Delivery Charge
          </span>

          <strong>
            {Number(
              selectedOrder.delivery_charge || 0
            ) === 0
              ? "Free"
              : `৳${Number(
                  selectedOrder.delivery_charge || 0
                ).toLocaleString()}`}
          </strong>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            paddingTop: "12px",
            borderTop:
              "2px solid #111827",
            fontSize: "20px",
            fontWeight: "800",
          }}
        >
          <span>
            TOTAL
          </span>

          <span>
            ৳
            {Number(
              selectedOrder.total_amount || 0
            ).toLocaleString()}
          </span>
        </div>

      </div>

      {/* FOOTER */}

      <div
        style={{
          textAlign: "center",
          marginTop: "30px",
          paddingTop: "18px",
          borderTop:
            "1px solid #e5e7eb",
          color: "#6b7280",
          fontSize: "13px",
        }}
      >
        Thank you for shopping with
        <strong>
          {" "}Sanvee's
        </strong>

        <br />

        We appreciate your business.
      </div>

      {/* BUTTONS */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "1fr 1fr",
          gap: "10px",
          marginTop: "25px",
        }}
      >

        <button
          type="button"
          onClick={printInvoice}
          style={{
            padding: "12px",
            border: "none",
            borderRadius: "8px",
            background: "#111827",
            color: "#fff",
            cursor: "pointer",
            fontWeight: "700",
            fontSize: "15px",
          }}
        >
          🖨️ Print Invoice
        </button>

        <button
          type="button"
          onClick={() =>
            setInvoiceOpen(false)
          }
          style={{
            padding: "12px",
            border: "none",
            borderRadius: "8px",
            background: "#6b7280",
            color: "#fff",
            cursor: "pointer",
            fontWeight: "700",
            fontSize: "15px",
          }}
        >
          ✕ Close
        </button>

      </div>

    </div>
  </div>
)}
      {/* =====================================================
    PRODUCT DETAIL MODAL
===================================================== */}

{detailModalProduct && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.6)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      zIndex: 1000,
      overflowY: "auto",
    }}
  >
    <div
      style={{
        background: "#fff",
        width: "100%",
        maxWidth: "600px",
        maxHeight: "90vh",
        overflowY: "auto",
        borderRadius: "0px",
        padding: "0",
        boxSizing: "border-box",
        boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
      }}
    >

      {/* =====================================================
          PRODUCT IMAGE
      ===================================================== */}

      <div
        style={{
          width: "100%",
          height: "400px",
          background: "#f8f8f8",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <img
          src={
            detailModalProduct.selectedVariantImage ||
            detailModalProduct.image_url
          }
          alt={
            detailModalProduct.selectedVariantColor ||
            detailModalProduct.selectedColor ||
            detailModalProduct.name
          }
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            display: "block",
          }}
        />
      </div>

      <div
        style={{
          padding: "22px 25px 25px",
        }}
      >

        {/* =====================================================
    AVAILABLE COLORS
===================================================== */}

{(
  detailModalProduct.color ||
  (
    Array.isArray(detailModalProduct.color_variants) &&
    detailModalProduct.color_variants.length > 0
  )
) && (
  <div
    style={{
      marginBottom: "22px",
    }}
  >
    <div
      style={{
        fontSize: "16px",
        fontWeight: "700",
        marginBottom: "10px",
        color: "#222",
      }}
    >
      Available Colors
    </div>

    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "10px",
      }}
    >

      {/* =================================================
          MAIN COLOR
      ================================================= */}

      {detailModalProduct.color && (
        <div
          onClick={() => {
            const mainImage =
              detailModalProduct.main_image_url ||
              detailModalProduct.image_url;

            setDetailModalProduct({
              ...detailModalProduct,

              image_url: mainImage,

              selectedVariantImage:
                mainImage,

              selectedVariantColor:
                detailModalProduct.color,

              selectedColor:
                detailModalProduct.color,
            });
          }}
          style={{
            width: "82px",
            border:
              detailModalProduct.selectedColor ===
              detailModalProduct.color
                ? "2px solid #2563eb"
                : "1px solid #d1d5db",

            borderRadius: "7px",
            padding: "4px",
            background:
              detailModalProduct.selectedColor ===
              detailModalProduct.color
                ? "#eff6ff"
                : "#fff",

            cursor: "pointer",
            boxSizing: "border-box",
            textAlign: "center",
          }}
        >

          {/* SMALL COLOR IMAGE */}

          <div
            style={{
              width: "100%",
              height: "65px",
              background: "#f3f4f6",
              borderRadius: "5px",
              overflow: "hidden",
            }}
          >
            <img
              src={
                detailModalProduct.main_image_url ||
                detailModalProduct.image_url
              }
              alt={detailModalProduct.color}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          </div>

          {/* COLOR NAME */}

          <div
            style={{
              marginTop: "5px",
              fontSize: "11px",
              fontWeight: "600",
              color: "#222",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {detailModalProduct.color}
          </div>

        </div>
      )}

      {/* =================================================
          COLOR VARIANTS
      ================================================= */}

      {Array.isArray(
        detailModalProduct.color_variants
      ) &&
        detailModalProduct.color_variants.map(
          (variant, index) => (
            <div
              key={index}
              onClick={() => {
                if (!variant.image_url) {
                  return;
                }

                setDetailModalProduct({
                  ...detailModalProduct,

                  image_url:
                    variant.image_url,

                  selectedVariantImage:
                    variant.image_url,

                  selectedVariantColor:
                    variant.color,

                  selectedColor:
                    variant.color,
                });
              }}
              style={{
                width: "82px",
                border:
                  detailModalProduct.selectedColor ===
                  variant.color
                    ? "2px solid #2563eb"
                    : "1px solid #d1d5db",

                borderRadius: "7px",
                padding: "4px",
                background:
                  detailModalProduct.selectedColor ===
                  variant.color
                    ? "#eff6ff"
                    : "#fff",

                cursor: variant.image_url
                  ? "pointer"
                  : "default",

                boxSizing: "border-box",
                textAlign: "center",
                opacity: variant.image_url
                  ? 1
                  : 0.55,
              }}
            >

              {/* SMALL COLOR IMAGE */}

              {variant.image_url ? (
                <div
                  style={{
                    width: "100%",
                    height: "65px",
                    background: "#f3f4f6",
                    borderRadius: "5px",
                    overflow: "hidden",
                  }}
                >
                  <img
                    src={variant.image_url}
                    alt={variant.color}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                </div>
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "65px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#f3f4f6",
                    borderRadius: "5px",
                    color: "#9ca3af",
                    fontSize: "10px",
                  }}
                >
                  No Image
                </div>
              )}

              {/* COLOR NAME */}

              <div
                style={{
                  marginTop: "5px",
                  fontSize: "11px",
                  fontWeight: "600",
                  color: "#222",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {variant.color}
              </div>

            </div>
          )
        )}

    </div>
  </div>
)}

        {/* =====================================================
            PRODUCT NAME
        ===================================================== */}

        <h2
          style={{
            margin: "0 0 8px",
            fontSize: "24px",
            lineHeight: "1.3",
            fontWeight: "700",
            color: "#111827",
          }}
        >
          {detailModalProduct.name}
        </h2>

        {/* =====================================================
            PRICE
        ===================================================== */}

        <div
          style={{
            fontSize: "23px",
            fontWeight: "700",
            color: "#111827",
            marginBottom: "15px",
          }}
        >
          ৳{detailModalProduct.price}
        </div>

        {/* =====================================================
            BUYING PRICE
        ===================================================== */}

        {canViewBuyingPrice && (
          <div
            style={{
              marginBottom: "20px",
              padding: "11px 13px",
              background: "#fff7ed",
              border: "1px solid #fed7aa",
              fontSize: "14px",
              color: "#c2410c",
              fontWeight: "600",
            }}
          >
            💰 Buying Price: ৳
            {detailModalProduct.buying_price ?? "N/A"}
          </div>
        )}

        {/* =====================================================
            CATEGORY + STOCK
        ===================================================== */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "20px",
            marginBottom: "20px",
            paddingBottom: "18px",
            borderBottom: "1px solid #e5e7eb",
          }}
        >

          {/* CATEGORY */}

          <div>
            <div
              style={{
                fontSize: "12px",
                color: "#6b7280",
                marginBottom: "5px",
                fontWeight: "600",
              }}
            >
              Category
            </div>

            <div
              style={{
                fontSize: "16px",
                fontWeight: "700",
                color: "#111827",
              }}
            >
              {detailModalProduct.category
                ? detailModalProduct.category
                    .charAt(0)
                    .toUpperCase() +
                  detailModalProduct.category.slice(1)
                : "N/A"}
            </div>
          </div>

          {/* STOCK */}

          <div>
            <div
              style={{
                fontSize: "12px",
                color: "#6b7280",
                marginBottom: "5px",
                fontWeight: "600",
              }}
            >
              Stock
            </div>

            <div
              style={{
                fontSize: "16px",
                fontWeight: "700",
                color: "#111827",
              }}
            >
              {detailModalProduct.stock === null ||
              detailModalProduct.stock === undefined
                ? "N/A"
                : detailModalProduct.stock}
            </div>
          </div>

        </div>

        {/* =====================================================
            SIZE
            ONLY DRESS WILL SHOW SIZE
            SAREE WILL HIDE SIZE SECTION
        ===================================================== */}

        {String(
          detailModalProduct.category || ""
        ).toLowerCase() === "dress" && (
          <div
            style={{
              marginBottom: "20px",
              paddingBottom: "18px",
              borderBottom: "1px solid #e5e7eb",
            }}
          >
            <div
              style={{
                fontSize: "14px",
                fontWeight: "700",
                color: "#374151",
                marginBottom: "8px",
              }}
            >
              Size
            </div>

            <div
              style={{
                fontSize: "15px",
                fontWeight: "600",
                color: "#111827",
                lineHeight: "1.6",
              }}
            >
              {detailModalProduct.size
                ? String(detailModalProduct.size)
                    .split(",")
                    .map((size, index, arr) => (
                      <span key={index}>
                        {size.trim()}
                        {index < arr.length - 1
                          ? " / "
                          : ""}
                      </span>
                    ))
                : "No size available"}
            </div>
          </div>
        )}

        {/* =====================================================
            PRODUCT DETAILS
        ===================================================== */}

        <div
          style={{
            marginTop: "4px",
            padding: "15px",
            background: "#f8fafc",
            border: "1px solid #e5e7eb",
            borderRadius: "0px",
            lineHeight: "1.6",
          }}
        >
          <div
            style={{
              fontSize: "14px",
              fontWeight: "700",
              color: "#111827",
              marginBottom: "8px",
            }}
          >
            Product Details
          </div>

          <div
            style={{
              fontSize: "14px",
              color: "#4b5563",
              whiteSpace: "pre-wrap",
            }}
          >
            {detailModalProduct.details ||
              "No details added."}
          </div>
        </div>

        {/* =====================================================
            CLOSE
        ===================================================== */}

        <button
          type="button"
          onClick={() =>
            setDetailModalProduct(null)
          }
          style={{
            width: "100%",
            marginTop: "18px",
            padding: "12px",
            border: "none",
            borderRadius: "0px",
            background: "#555",
            color: "#fff",
            cursor: "pointer",
            fontWeight: "600",
            fontSize: "15px",
          }}
        >
          Close
        </button>

      </div>
    </div>
  </div>
)}

      {/* =====================================================
          RESPONSIVE STYLE
      ===================================================== */}

      <style>
        {`
          * {
            box-sizing: border-box;
          }

          input,
          textarea,
          select,
          button {
            font-family: inherit;
          }

          input:focus,
          textarea:focus,
          select:focus {
            outline: none;
            border-color: #2563eb !important;
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.10);
          }

          button {
            transition: 0.15s ease;
          }

          button:hover:not(:disabled) {
            opacity: 0.92;
          }

          @media (max-width: 900px) {
            aside {
              width: 210px !important;
            }

            aside + div {
              margin-left: 210px !important;
              width: calc(100% - 210px) !important;
            }
          }

          @media (max-width: 700px) {
            aside {
              position: relative !important;
              width: 100% !important;
              min-height: auto !important;
              height: auto !important;
            }

            aside button:last-child {
              position: relative !important;
              left: auto !important;
              right: auto !important;
              bottom: auto !important;
              width: 100% !important;
              margin-top: 20px;
            }

            aside + div {
              margin-left: 0 !important;
              width: 100% !important;
            }

            main {
              padding: 18px !important;
            }

            header {
              padding: 20px !important;
            }

            header h1 {
              font-size: 22px !important;
            }
          }

          @media (max-width: 500px) {
            .product-grid {
              grid-template-columns: 1fr !important;
            }
          }
                      /* =================================================
             COURIER REPORT PRINT
          ================================================= */

          /* =================================================
   COURIER REPORT PRINT HEADER
================================================= */

.courier-print-only-header {
  display: none !important;
}

@media print {
  .courier-print-only-header {
    display: block !important;
  }
}
          @media print {

            body * {
              visibility: hidden !important;
            }

            #courier-report-print,
            #courier-report-print * {
              visibility: visible !important;
            }

            #courier-report-print {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 20px !important;
              background: #fff !important;
              color: #111827 !important;
            }

            #courier-report-print button {
              display: none !important;
            }
              .courier-report-summary {
  display: none !important;
}
              #courier-report-print th:last-child,
#courier-report-print td:last-child {
  display: none !important;
}

            #courier-report-print table {
              width: 100% !important;
              min-width: 0 !important;
              border-collapse: collapse !important;
            }

            #courier-report-print th,
            #courier-report-print td {
              color: #111827 !important;
              background: #fff !important;
              border: 1px solid #d1d5db !important;
            }
              @page {
  size: A4 landscape;
  margin: 10mm;
}

#courier-report-print table {
  width: 100% !important;
  min-width: 0 !important;
  table-layout: fixed !important;
}

#courier-report-print th,
#courier-report-print td {
  font-size: 9px !important;
  padding: 6px 5px !important;
  vertical-align: middle !important;
  overflow-wrap: anywhere !important;
}

/* Order */
#courier-report-print th:nth-child(1),
#courier-report-print td:nth-child(1) {
  width: 17% !important;
}

/* Customer */
#courier-report-print th:nth-child(2),
#courier-report-print td:nth-child(2) {
  width: 14% !important;
}

/* Courier */
#courier-report-print th:nth-child(3),
#courier-report-print td:nth-child(3) {
  width: 11% !important;
}

/* Shipment Status */
#courier-report-print th:nth-child(4),
#courier-report-print td:nth-child(4) {
  width: 14% !important;
}

/* API Status */
#courier-report-print th:nth-child(5),
#courier-report-print td:nth-child(5) {
  width: 11% !important;
}

/* Tracking */
#courier-report-print th:nth-child(6),
#courier-report-print td:nth-child(6) {
  width: 9% !important;
}

/* Consignment */
#courier-report-print th:nth-child(7),
#courier-report-print td:nth-child(7) {
  width: 10% !important;
}

/* Created */
#courier-report-print th:nth-child(8),
#courier-report-print td:nth-child(8) {
  width: 14% !important;
  white-space: nowrap !important;
}

          }
        `}
      </style>
    </div>
  );
}

export default App;