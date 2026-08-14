import { useEffect, useState } from "react";
import Login from "./Login";
import { supabase } from "./supabase";
import { pipeline } from "@huggingface/transformers";

function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);

  const [products, setProducts] = useState([]);
  const COLOR_VARIANT_LIMIT = 15;

  const [searchTerm, setSearchTerm] = useState("");

  const [searchImage, setSearchImage] = useState(null);
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
    color: "",
    size: "",
    stock: "",
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
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [removingUserId, setRemovingUserId] = useState(null);

  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [productsOpen, setProductsOpen] = useState(false);

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

const canManageProducts =
  isOwner || isAdmin || isStaff;

const canViewBuyingPrice =
  isOwner || isAdmin || isStaff;

const canManageUsers =
  isOwner || isAdmin;


  // =========================================================
  // RESET PRODUCT FORM
  // =========================================================

  const resetProductForm = () => {
    setEditingProductId(null);

    setProduct({
      name: "",
      price: "",
      buying_price: "",
      color: "",
      size: "",
      stock: "",
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
        },
      ],
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

    if (!email || !newUserPassword) {
      alert("Email এবং Password দিন।");
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
      .single();

    if (error) {
      console.error("Role load error:", error);
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
            imagePreview: variant.image_url || "",
            image_url: variant.image_url || "",
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
      size: productItem.size || "",
      stock:
        productItem.stock === null ||
        productItem.stock === undefined
          ? ""
          : productItem.stock,
      details: productItem.details || "",
      image: null,
      imagePreview: productItem.image_url || "",
      color_variants: variants,
    });

    setEditModalOpen(true);
  };

  // =========================================================
  // UPLOAD VARIANT IMAGES
  // =========================================================

  const uploadColorVariantImages = async (
    variants,
    uploadedPaths = []
  ) => {
    const finalVariants = [];

    for (let i = 0; i < variants.length; i++) {
      const variant = variants[i];

      if (!variant.color?.trim()) {
        throw new Error(
          `Color Variant ${i + 1}-এ Color দিন।`
        );
      }

      let imageUrl = variant.image_url || "";

      if (variant.image) {
        const file = variant.image;

        const fileExt = file.name.split(".").pop();

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

        imageUrl = publicUrlData.publicUrl;
      }

      finalVariants.push({
        color: variant.color.trim(),
        image_url: imageUrl || null,
      });
    }

    return finalVariants;
  };

  // =========================================================
  // ADD PRODUCT
  // =========================================================

  const addProduct = async () => {
    if (!canManageProducts) {
      alert("আপনার product add করার permission নেই।");
      return;
    }

    if (!product.name || !product.price || !product.image) {
      alert("Product Name, Price এবং Image দিন।");
      return;
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
          uploadedPaths
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

              color:
                product.color.trim() || null,

              size:
                product.size.trim() || null,

              stock:
                product.stock === ""
                  ? null
                  : Number(product.stock),

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
// AUTOMATIC AI VISUAL INDEXING
// =========================================================

try {
  console.log("🔵 Starting automatic AI visual indexing...");

  const indexResponse = await fetch(
    "https://sanvees-product-system.mohammadkowshik77.workers.dev/api/index-products",
    {
      method: "POST",
    }
  );

  const indexResult = await indexResponse.json();

  console.log("🟢 AI INDEX RESULT:", indexResult);

  if (!indexResponse.ok || !indexResult.success) {
    console.error(
      "AI visual indexing failed:",
      indexResult
    );

    alert(
      "Product save হয়েছে, কিন্তু AI image search index update করা যায়নি।"
    );
  } else {
    console.log(
      "✅ Product automatically added to AI visual search index."
    );
  }
} catch (indexError) {
  console.error(
    "Automatic AI indexing error:",
    indexError
  );

  alert(
    "Product save হয়েছে, কিন্তু AI visual search index update করা যায়নি।"
  );
}

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

      const uploadedPaths = [];

      const colorVariants =
        await uploadColorVariantImages(
          product.color_variants,
          uploadedPaths
        );

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

            color:
              product.color.trim() || null,

            size:
              product.size.trim() || null,

            stock:
              product.stock === ""
                ? null
                : Number(product.stock),

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

    const formData = new FormData();
    formData.append("image", searchImage);

    const response = await fetch(
      "https://sanvees-product-system.mohammadkowshik77.workers.dev/api/visual-search",
      {
        method: "POST",
        body: formData,
      }
    );

    const result = await response.json();

    console.log("AI VISUAL SEARCH RESULT:", result);

    if (!response.ok || !result.success) {
      throw new Error(
        result.error || "AI visual search failed."
      );
    }

    // =====================================================
    // EXACT MATCH ONLY
    // Similar products will NEVER be displayed.
    // =====================================================

    if (!result.exact_match) {
      setProducts([]);

      alert(
        "এই ছবির সাথে website-এর কোনো exact same product পাওয়া যায়নি।"
      );

      return;
    }

    const matches = result.matches || [];

    console.log("AI EXACT MATCHES:", matches);

    if (matches.length === 0) {
      setProducts([]);

      alert(
        "এই ছবির সাথে কোনো exact same product পাওয়া যায়নি।"
      );

      return;
    }

    // =====================================================
    // ONLY THE BEST / FIRST EXACT MATCH
    // =====================================================

    const exactMatch = matches[0];
    const metadata = exactMatch.metadata || {};

    const exactProduct = {
      id: metadata.product_id || exactMatch.id,
      name: metadata.name || "Unnamed Product",
      details: metadata.details || "",
      color: metadata.color || "",
      size: metadata.size || "",
      price: metadata.price ?? 0,
      stock: metadata.stock ?? 0,
      image_url: metadata.image_url || "",
      similarity_score: exactMatch.score || 0,
    };

    // Product image না থাকলে এটাকে valid result হিসেবে দেখাব না।
    if (!exactProduct.image_url) {
      setProducts([]);

      alert(
        "Exact product পাওয়া গেছে, কিন্তু product image পাওয়া যায়নি।"
      );

      return;
    }

    // =====================================================
    // SHOW ONLY EXACT PRODUCT
    // =====================================================

    setProducts([exactProduct]);

    console.log("EXACT PRODUCT SHOWN:", exactProduct);

    alert(
      `Exact same product পাওয়া গেছে।`
    );

  } catch (error) {
    console.error(
      "AI image search error:",
      error
    );

    setProducts([]);

    alert(
      "AI image search-এর সময় সমস্যা হয়েছে।"
    );
  } finally {
    setEmbeddingLoading(false);
  }
};

  // =========================================================
  // SHOW ALL PRODUCTS AGAIN
  // =========================================================

  const showAllProducts = async () => {
    setSearchTerm("");
    setSearchImage(null);
    setSearchImagePreview("");

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

  // =========================================================
  // NORMAL SEARCH
  // =========================================================

  const filteredProducts = products.filter((item) => {
  const search = searchTerm.trim().toLowerCase();
  const name = (item.name || "").toLowerCase();
  const price = String(item.price || "").trim();

  return name.includes(search) || price === search;
});

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
  // RETURN
  // =========================================================

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f6f8",
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

        {/* PRODUCTS */}

        <button
          onClick={() => {
            setProductsOpen(!productsOpen);

            setActiveMenu("products");
          }}
          style={{
            width: "100%",
            padding: "13px 15px",
            marginBottom:
              productsOpen ? "3px" : "8px",
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
            display: "flex",
            alignItems: "center",
            justifyContent:
              "space-between",
          }}
        >
          <span>📦 Products</span>

          <span
            style={{
              fontSize: "12px",
            }}
          >
            {productsOpen ? "▲" : "▼"}
          </span>
        </button>

        {/* PRODUCTS SUB MENU */}

        {productsOpen && (
          <div
            style={{
              marginBottom: "8px",
              paddingLeft: "10px",
            }}
          >
            <button
              onClick={() => {
                setActiveMenu("products");

                setProductsOpen(true);

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
                padding: "10px 12px",
                marginBottom: "3px",
                border: "none",
                borderRadius: "7px",
                textAlign: "left",
                cursor: "pointer",
                color: "#d1d5db",
                background: "transparent",
                fontSize: "14px",
              }}
            >
              🔍 Search Products
            </button>

            <button
              onClick={() => {
                setActiveMenu("products");

                setProductsOpen(true);

                setTimeout(() => {
                  document
                    .getElementById(
                      "all-products-section"
                    )
                    ?.scrollIntoView({
                      behavior: "smooth",
                    });
                }, 50);
              }}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "none",
                borderRadius: "7px",
                textAlign: "left",
                cursor: "pointer",
                color: "#d1d5db",
                background: "transparent",
                fontSize: "14px",
              }}
            >
              📋 All Products
            </button>
          </div>
        )}

        {/* MANAGE USERS */}

        {canManageUsers && (
          <button
           onClick={() => {
              setActiveMenu("users");
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
        {/* ADD NEW PRODUCT */}

{canManageProducts && (
  <button
    onClick={() => {
      setActiveMenu("addProduct");
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

        {/* USER INFO */}

        <div
          style={{
            marginTop: "25px",
            padding: "12px 14px",
            background: "#1f2937",
            borderRadius: "8px",
            fontSize: "13px",
            color: "#d1d5db",
          }}
        >
          Logged in as
          <br />

          <strong
            style={{
              color: "#fff",
              textTransform: "capitalize",
            }}
          >
            {userRole || "User"}
          </strong>
        </div>

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
        }}
      >
        {/* HEADER */}

        <header
          style={{
            background: "#fff",
            padding: "25px 30px",
            borderBottom:
              "1px solid #e5e7eb",
          }}
        >
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
              color: "#6b7280",
            }}
          >
            Product Management & Catalog
          </p>
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
              <h2>🏠 Dashboard</h2>

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
                    background: "#fff",
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
                    background: "#fff",
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
            </section>
          )}

          {/* =================================================
              ADD PRODUCT
          ================================================= */}

          {activeMenu === "addProduct" &&
            canManageProducts && (
              <section
                style={{
                  maxWidth: "850px",
                  background: "#fff",
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
                    color: "#6b7280",
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

                {/* SIZE */}

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
                    📏 Size
                  </label>

                  <input
                    name="size"
                    placeholder="Example: 38, 40, 42, 44"
                    value={product.size}
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

                {/* STOCK */}

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
                    📦 Stock
                  </label>

                  <input
                    name="stock"
                    type="number"
                    placeholder="Example: 20"
                    value={product.stock}
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

          {/* =================================================
              PRODUCTS
          ================================================= */}

          {activeMenu === "products" && (
            <>
              {/* SEARCH PRODUCTS */}

              <section
                id="product-search-section"
                style={{
                  background: "#fff",
                  padding: "25px",
                  borderRadius: "12px",
                  boxShadow:
                    "0 2px 10px rgba(0,0,0,0.08)",
                  marginBottom: "30px",
                }}
              >
                <h2>
                  🔍 Search Products
                </h2>

                <p
                  style={{
                    color: "#6b7280",
                    marginBottom: "20px",
                  }}
                >
                  Product name দিয়ে search করুন
                  অথবা dress-এর ছবি দিয়ে product
                  খুঁজুন।
                </p>

                {/* NORMAL SEARCH + IMAGE SEARCH */}

                <div
                  style={{
                    display: "flex",
                    gap: "20px",
                    alignItems: "flex-start",
                    width: "100%",
                    flexWrap: "wrap",
                  }}
                >
                  {/* NORMAL SEARCH */}

                  <div
                    style={{
                      flex: "1 1 0",
                      minWidth: "300px",
                    }}
                  >
                    <label
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        fontWeight: "600",
                      }}
                    >
                      🔍 Search by Product Name / Price
                    </label>

                    <input
                      type="text"
                      placeholder="Product name or selling price..."
                      value={searchTerm}
                      onChange={(e) =>
                        setSearchTerm(e.target.value)
                      }
                      style={{
                        width: "100%",
                        padding: "13px 15px",
                        border: "1px solid #d1d5db",
                        borderRadius: "8px",
                        boxSizing: "border-box",
                        fontSize: "15px",
                      }}
                    />
                  </div>

                  {/* IMAGE SEARCH */}

                  <div
                    style={{
                      flex: "1 1 0",
                      minWidth: "300px",
                    }}
                  >
                    <h3
                      style={{
                        marginTop: "0",
                        marginBottom: "8px",
                      }}
                    >
                      📸 Search Dress by Image
                    </h3>

                    <p
                      style={{
                        color: "#6b7280",
                        marginTop: "0",
                        marginBottom: "12px",
                      }}
                    >
                      Dress-এর ছবি Copy করে নিচের box-এ Paste করুন।
                    </p>

                    <div
                      onPaste={handlePasteImage}
                      tabIndex={0}
                      style={{
                        minHeight: "180px",
                        border: "2px dashed #999",
                        borderRadius: "12px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        textAlign: "center",
                        padding: "20px",
                        cursor: "text",
                        background: "#fafafa",
                        outline: "none",
                      }}
                    >
                      {!searchImagePreview ? (
                        <div>
                          <div
                            style={{
                              fontSize: "40px",
                            }}
                          >
                            📋
                          </div>

                          <strong>
                            এখানে Dress Image Paste করুন
                          </strong>

                          <p>
                            অন্য জায়গা থেকে ছবি Copy করে
                            <br />
                            <b>Ctrl + V</b> চাপুন
                          </p>
                        </div>
                      ) : (
                        <div>
                          <img
                            src={searchImagePreview}
                            alt="Search preview"
                            style={{
                              maxWidth: "300px",
                              maxHeight: "350px",
                              objectFit: "contain",
                              borderRadius: "10px",
                            }}
                          />

                          <div
                            style={{
                              marginTop: "12px",
                            }}
                          >
                            <button
                              onClick={() => {
                                setSearchImage(null);
                                setSearchImagePreview("");
                                loadProducts();
                              }}
                              style={{
                                padding: "8px 15px",
                                border: "none",
                                borderRadius: "7px",
                                cursor: "pointer",
                                background: "#dc3545",
                                color: "#fff",
                              }}
                            >
                              ❌ Remove Image
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: "10px",
                        flexWrap: "wrap",
                        marginTop: "15px",
                      }}
                    >
                      <button
                        onClick={searchByImage}
                        disabled={!searchImage || embeddingLoading}
                        style={{
                          padding: "12px 22px",
                          border: "none",
                          borderRadius: "8px",
                          cursor:
                            searchImage && !embeddingLoading
                              ? "pointer"
                              : "not-allowed",
                          background:
                            searchImage && !embeddingLoading
                              ? "#000"
                              : "#aaa",
                          color: "#fff",
                          fontSize: "16px",
                        }}
                      >
                        {embeddingLoading
                          ? "⏳ Searching..."
                          : "🔍 Search Dress"}
                      </button>

                      <button
                        onClick={showAllProducts}
                        style={{
                          padding: "12px 22px",
                          border: "none",
                          borderRadius: "8px",
                          cursor: "pointer",
                          background: "#2563eb",
                          color: "#fff",
                          fontSize: "16px",
                        }}
                      >
                        📋 Show All Products
                      </button>
                    </div>

                    <div
                      style={{
                        marginTop: "15px",
                      }}
                    >
                      <label
                        style={{
                          display: "inline-block",
                          padding: "10px 15px",
                          background: "#eee",
                          borderRadius: "8px",
                          cursor: "pointer",
                        }}
                      >
                        📁 অথবা ছবি নির্বাচন করুন

                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleSearchImage}
                          style={{
                            display: "none",
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </section>

              {/* ALL PRODUCTS */}

              <section id="all-products-section">
                <div
                  className="products-header"
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems:
                      "center",
                    gap: "15px",
                    marginBottom:
                      "15px",
                    flexWrap:
                      "wrap",
                  }}
                >
                  <h2
                    style={{
                      margin: 0,
                    }}
                  >
                    📋 All Products
                  </h2>

                  <span
                    style={{
                      color:
                        "#6b7280",
                    }}
                  >
                    {
                      filteredProducts.length
                    }{" "}
                    Products
                  </span>
                </div>

                <div
                  className="search-box"
                  style={{
                    marginBottom:
                      "20px",
                  }}
                >
                  <input
                    type="text"
                    placeholder="🔍 Search product..."
                    value={
                      searchTerm
                    }
                    onChange={(
                      e
                    ) =>
                      setSearchTerm(
                        e.target.value
                      )
                    }
                    style={{
                      width:
                        "100%",
                      padding:
                        "13px 15px",
                      border:
                        "1px solid #d1d5db",
                      borderRadius:
                        "8px",
                      boxSizing:
                        "border-box",
                    }}
                  />
                </div>

                {loading ? (
                  <div
                    className="empty"
                    style={{
                      background:
                        "#fff",
                      padding:
                        "30px",
                      borderRadius:
                        "12px",
                      textAlign:
                        "center",
                    }}
                  >
                    ⏳ Products
                    loading...
                  </div>
                ) : products.length ===
                  0 ? (
                  <div
                    className="empty"
                    style={{
                      background:
                        "#fff",
                      padding:
                        "30px",
                      borderRadius:
                        "12px",
                      textAlign:
                        "center",
                    }}
                  >
                    এখনো কোনো product add করা
                    হয়নি।
                  </div>
                ) : filteredProducts.length ===
                  0 ? (
                  <div
                    className="empty"
                    style={{
                      background:
                        "#fff",
                      padding:
                        "30px",
                      borderRadius:
                        "12px",
                      textAlign:
                        "center",
                    }}
                  >
                    🔍 কোনো product পাওয়া যায়নি।
                  </div>
                ) : (
                  <div
                    className="product-grid"
                    style={{
                      display:
                        "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(260px, 1fr))",
                      gap: "20px",
                      alignItems:
                        "stretch",
                    }}
                  >
                    {filteredProducts.map(
                      (item) => (
                        <div
                          className="product-card"
                          key={item.id}
                          style={{
                            background:
                              "#fff",
                            borderRadius:
                              "12px",
                            overflow:
                              "hidden",
                            boxShadow:
                              "0 2px 10px rgba(0,0,0,0.08)",
                            display:
                              "flex",
                            flexDirection:
                              "column",
                            minWidth:
                              0,
                            height:
                              "100%",
                          }}
                        >
                          <img
                            src={
                              item.image_url
                            }
                            alt={
                              item.name
                            }
                            className="product-image"
                            onClick={() =>
                              setDetailModalProduct(
                                item
                              )
                            }
                            style={{
                              width:
                                "100%",
                              height:
                                "280px",
                              objectFit:
                                "cover",
                              display:
                                "block",
                              cursor:
                                "pointer",
                            }}
                          />

                          <div
                            className="product-info"
                            style={{
                              display:
                                "flex",
                              flexDirection:
                                "column",
                              flex: 1,
                              padding:
                                "18px",
                            }}
                          >
                            <h3
                              style={{
                                marginTop:
                                  0,
                                marginBottom:
                                  "10px",
                              }}
                            >
                              {
                                item.name
                              }
                            </h3>

                            <div
                              className="price"
                              style={{
                                fontSize:
                                  "21px",
                                fontWeight:
                                  "700",
                                marginBottom:
                                  "10px",
                              }}
                            >
                              ৳
                              {
                                item.price
                              }
                            </div>

                            {/* BUYING PRICE */}

                            {canViewBuyingPrice && (
                              <div
                                style={{
                                  color:
                                    "#dc2626",
                                  fontWeight:
                                    "600",
                                  marginBottom:
                                    "10px",
                                }}
                              >
                                💰 Buying: ৳
                                {item.buying_price ??
                                  "N/A"}
                              </div>
                            )}

                            <div
                              className="short-info"
                              style={{
                                display:
                                  "flex",
                                flexDirection:
                                  "column",
                                gap:
                                  "6px",
                                color:
                                  "#374151",
                                fontSize:
                                  "14px",
                              }}
                            >
                              <span>
                                🎨{" "}
                                {item.color ||
                                  "N/A"}
                              </span>

                              <span>
                                📏{" "}
                                {item.size ||
                                  "N/A"}
                              </span>

                              <span>
                                📦{" "}
                                {item.stock ===
                                  null ||
                                item.stock ===
                                  undefined
                                  ? "N/A"
                                  : item.stock}
                              </span>
                            </div>

                            {/* COLOR VARIANT PREVIEW */}

                            {Array.isArray(
                              item.color_variants
                            ) &&
                              item
                                .color_variants
                                .length >
                                0 && (
                                <div
                                  style={{
                                    display:
                                      "flex",
                                    gap:
                                      "6px",
                                    flexWrap:
                                      "wrap",
                                    marginTop:
                                      "12px",
                                  }}
                                >
                                  {item.color_variants.map(
                                    (
                                      variant,
                                      index
                                    ) => (
                                      <div
                                        key={
                                          index
                                        }
                                        title={
                                          variant.color
                                        }
                                        style={{
                                          padding:
                                            "5px 8px",
                                          background:
                                            "#f1f5f9",
                                          borderRadius:
                                            "6px",
                                          fontSize:
                                            "12px",
                                        }}
                                      >
                                        🎨{" "}
                                        {
                                          variant.color
                                        }
                                      </div>
                                    )
                                  )}
                                </div>
                              )}

                            {/* BUTTONS */}

                            {canManageProducts ? (
                              <div
                                style={{
                                  display:
                                    "grid",
                                  gridTemplateColumns:
                                    "1fr 1fr",
                                  gap:
                                    "8px",
                                  marginTop:
                                    "18px",
                                }}
                              >
                                <button
                                  onClick={() =>
                                    editProduct(
                                      item
                                    )
                                  }
                                  style={{
                                    width:
                                      "100%",
                                    padding:
                                      "10px",
                                    border:
                                      "none",
                                    borderRadius:
                                      "7px",
                                    cursor:
                                      "pointer",
                                    background:
                                      "#16a34a",
                                    color:
                                      "#fff",
                                    fontWeight:
                                      "600",
                                  }}
                                >
                                  ✏️ Edit
                                </button>

                                <button
                                  onClick={() =>
                                    deleteProduct(
                                      item
                                    )
                                  }
                                  style={{
                                    width:
                                      "100%",
                                    padding:
                                      "10px",
                                    border:
                                      "none",
                                    borderRadius:
                                      "7px",
                                    cursor:
                                      "pointer",
                                    background:
                                      "#dc2626",
                                    color:
                                      "#fff",
                                    fontWeight:
                                      "600",
                                  }}
                                >
                                  🗑️ Delete
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() =>
                                  setDetailModalProduct(
                                    item
                                  )
                                }
                                style={{
                                  width:
                                    "100%",
                                  marginTop:
                                    "18px",
                                  padding:
                                    "10px",
                                  border:
                                    "none",
                                  borderRadius:
                                    "7px",
                                  cursor:
                                    "pointer",
                                  background:
                                    "#2563eb",
                                  color:
                                    "#fff",
                                  fontWeight:
                                    "600",
                                }}
                              >
                                👁️ View Details
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    )}
                  </div>
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

            {/* SIZE */}

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
                📏 Size
              </label>

              <input
                name="size"
                value={
                  product.size
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

            {/* STOCK */}

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
                📦 Stock
              </label>

              <input
                name="stock"
                type="number"
                value={
                  product.stock
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

            {/* COLOR VARIANTS */}

            <div
              style={{
                marginTop:
                  "20px",
                padding:
                  "18px",
                background:
                  "#f8fafc",
                border:
                  "1px solid #e5e7eb",
                borderRadius:
                  "10px",
              }}
            >
              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                  marginBottom:
                    "15px",
                  gap:
                    "10px",
                  flexWrap:
                    "wrap",
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
                      "8px 12px",
                    border:
                      "none",
                    borderRadius:
                      "7px",
                    background:
                      product
                        .color_variants
                        .length >=
                      COLOR_VARIANT_LIMIT
                        ? "#aaa"
                        : "#2563eb",
                    color:
                      "#fff",
                    cursor:
                      product
                        .color_variants
                        .length >=
                      COLOR_VARIANT_LIMIT
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  ➕ Add Color
                </button>
              </div>

              {product.color_variants.map(
                (
                  variant,
                  index
                ) => (
                  <div
                    key={index}
                    style={{
                      background:
                        "#fff",
                      padding:
                        "15px",
                      borderRadius:
                        "9px",
                      marginBottom:
                        "10px",
                      border:
                        "1px solid #ddd",
                    }}
                  >
                    <div
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        alignItems:
                          "center",
                        marginBottom:
                          "10px",
                      }}
                    >
                      <strong>
                        Color{" "}
                        {index + 1}
                      </strong>

                      <button
                        type="button"
                        onClick={() =>
                          removeColorVariant(
                            index
                          )
                        }
                        style={{
                          border:
                            "none",
                          background:
                            "#dc2626",
                          color:
                            "#fff",
                          borderRadius:
                            "6px",
                          padding:
                            "6px 10px",
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
                      onChange={(
                        e
                      ) =>
                        handleColorVariantChange(
                          index,
                          e.target
                            .value
                        )
                      }
                      style={{
                        width:
                          "100%",
                        boxSizing:
                          "border-box",
                        padding:
                          "10px",
                        marginBottom:
                          "10px",
                        border:
                          "1px solid #d1d5db",
                        borderRadius:
                          "7px",
                      }}
                    />

                    <label
                      style={{
                        display:
                          "block",
                        marginBottom:
                          "7px",
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
                          "9px 13px",
                        background:
                          "#eee",
                        borderRadius:
                          "7px",
                        cursor:
                          "pointer",
                      }}
                    >
                      📸 Choose Image

                      <input
                        type="file"
                        accept="image/*"
                        onChange={(
                          e
                        ) =>
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
                          variant.color
                        }
                        style={{
                          width:
                            "130px",
                          height:
                            "160px",
                          objectFit:
                            "cover",
                          display:
                            "block",
                          marginTop:
                            "10px",
                          borderRadius:
                            "8px",
                        }}
                      />
                    )}
                  </div>
                )
              )}

              {product.color_variants
                .length === 0 && (
                <p
                  style={{
                    color:
                      "#6b7280",
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
                  onChange={(e) => setNewUserEmail(e.target.value)}
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
                          <div
                            style={{
                              fontWeight: "600",
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
                            {roleLabel}
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
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
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
            background:
              "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            padding: "20px",
            zIndex: 1000,
            overflowY:
              "auto",
          }}
        >
          <div
            style={{
              background: "#fff",
              width: "100%",
              maxWidth: "600px",
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
            <img
              src={
                detailModalProduct.image_url
              }
              alt={
                detailModalProduct.name
              }
              style={{
                width: "100%",
                maxHeight:
                  "400px",
                objectFit:
                  "contain",
                borderRadius:
                  "12px",
                marginBottom:
                  "15px",
              }}
            />

            <h2
              style={{
                margin:
                  "5px 0 8px",
              }}
            >
              {
                detailModalProduct.name
              }
            </h2>

            <div
              style={{
                fontSize:
                  "22px",
                fontWeight:
                  "700",
                marginBottom:
                  "15px",
              }}
            >
              ৳
              {
                detailModalProduct.price
              }
            </div>

            {/* BUYING PRICE */}

            {canViewBuyingPrice && (
              <p
                style={{
                  color:
                    "#dc2626",
                  fontWeight:
                    "600",
                }}
              >
                💰{" "}
                <strong>
                  Buying Price:
                </strong>{" "}
                ৳
                {detailModalProduct.buying_price ??
                  "N/A"}
              </p>
            )}

            <p>
              🎨{" "}
              <strong>
                Color:
              </strong>{" "}
              {detailModalProduct.color ||
                "N/A"}
            </p>

            <p>
              📏{" "}
              <strong>
                Size:
              </strong>{" "}
              {detailModalProduct.size ||
                "N/A"}
            </p>

            <p>
              📦{" "}
              <strong>
                Stock:
              </strong>{" "}
              {detailModalProduct.stock ===
                null ||
              detailModalProduct.stock ===
                undefined
                ? "N/A"
                : detailModalProduct.stock}
            </p>

            {/* COLOR VARIANTS */}

            {Array.isArray(
              detailModalProduct.color_variants
            ) &&
              detailModalProduct
                .color_variants
                .length > 0 && (
                <div
                  style={{
                    marginTop:
                      "20px",
                  }}
                >
                  <h3>
                    🎨 Available Colors
                  </h3>

                  <div
                    style={{
                      display:
                        "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(120px, 1fr))",
                      gap: "12px",
                    }}
                  >
                    {detailModalProduct.color_variants.map(
                      (
                        variant,
                        index
                      ) => (
                        <div
                          key={
                            index
                          }
                          style={{
                            border:
                              "1px solid #ddd",
                            borderRadius:
                              "10px",
                            padding:
                              "8px",
                            textAlign:
                              "center",
                            background:
                              "#fff",
                          }}
                        >
                          {variant.image_url && (
                            <img
                              src={
                                variant.image_url
                              }
                              alt={
                                variant.color
                              }
                              style={{
                                width:
                                  "100%",
                                height:
                                  "130px",
                                objectFit:
                                  "cover",
                                borderRadius:
                                  "7px",
                              }}
                            />
                          )}

                          <div
                            style={{
                              marginTop:
                                "7px",
                              fontWeight:
                                "600",
                              fontSize:
                                "13px",
                            }}
                          >
                            {
                              variant.color
                            }
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

            {/* DETAILS */}

            <div
              style={{
                marginTop:
                  "15px",
                padding:
                  "14px",
                background:
                  "#f5f5f5",
                borderRadius:
                  "10px",
                lineHeight:
                  "1.6",
              }}
            >
              <strong>
                📝 Product Details
              </strong>

              <div
                style={{
                  marginTop:
                    "8px",
                  whiteSpace:
                    "pre-wrap",
                }}
              >
                {detailModalProduct.details ||
                  "No details added."}
              </div>
            </div>

            <button
              onClick={() =>
                setDetailModalProduct(
                  null
                )
              }
              style={{
                width:
                  "100%",
                marginTop:
                  "18px",
                padding:
                  "12px",
                border:
                  "none",
                borderRadius:
                  "8px",
                background:
                  "#555",
                color:
                  "#fff",
                cursor:
                  "pointer",
                fontWeight:
                  "600",
                fontSize:
                  "15px",
              }}
            >
              ✖ Close
            </button>
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
        `}
      </style>
    </div>
  );
}

export default App;