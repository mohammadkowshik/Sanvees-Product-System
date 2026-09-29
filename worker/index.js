export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // =========================================================
    // CORS
    // =========================================================

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    // Handle CORS preflight request
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // =========================================================
    // HEALTH CHECK
    // =========================================================

    if (url.pathname === "/api/test") {
      return Response.json({
        success: true,
        message: "Sanvee AI Worker is working!",
      });
    }
    // =========================================================
// COURIER API SETTINGS
// =========================================================

// Allowed courier names
const ALLOWED_COURIERS = [
  "steadfast",
  "pathao",
  "redx",
];

// Get Supabase REST headers
function getSupabaseHeaders(env) {
  return {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
  };
}

// Save encrypted courier credentials
if (
  url.pathname === "/api/courier/settings/save" &&
  request.method === "POST"
) {
  try {
    if (
      !env.SUPABASE_URL ||
      !env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      return courierJsonResponse(
        {
          success: false,
          message:
            "Supabase configuration is missing.",
        },
        500,
        corsHeaders
      );
    }

    if (!env.COURIER_ENCRYPTION_KEY) {
      return courierJsonResponse(
        {
          success: false,
          message:
            "COURIER_ENCRYPTION_KEY is not configured.",
        },
        500,
        corsHeaders
      );
    }

    const body = await request.json();

    const courier = cleanText(
      body?.courier
    ).toLowerCase();

    const credentials =
      body?.credentials;

    if (!ALLOWED_COURIERS.includes(courier)) {
      return courierJsonResponse(
        {
          success: false,
          message:
            "Invalid courier name.",
        },
        400,
        corsHeaders
      );
    }

    if (
      !credentials ||
      typeof credentials !== "object"
    ) {
      return courierJsonResponse(
        {
          success: false,
          message:
            "Courier credentials are required.",
        },
        400,
        corsHeaders
      );
    }

    // Encrypt credentials before saving
    const encryptedCredentials =
      await encryptCourierCredentials(
        credentials,
        env
      );

    const response = await fetch(
      `${env.SUPABASE_URL}/rest/v1/courier_api_settings?on_conflict=courier`,
      {
        method: "POST",
        headers: {
          ...getSupabaseHeaders(env),
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify({
          courier,
          enabled: true,
          credentials_encrypted:
            encryptedCredentials,
          connection_status:
            "not_tested",
          last_tested_at: null,
          last_error: null,
          updated_at:
            new Date().toISOString(),
        }),
      }
    );

    if (!response.ok) {
      const errorText =
        await response.text();

      console.error(
        "Courier settings save error:",
        errorText
      );

      return courierJsonResponse(
        {
          success: false,
          message:
            "Courier settings save করা যায়নি.",
        },
        500,
        corsHeaders
      );
    }

    return courierJsonResponse(
      {
        success: true,
        courier,
        message:
          "Courier API credentials securely saved.",
      },
      200,
      corsHeaders
    );
  } catch (error) {
    console.error(
      "Courier settings save exception:",
      error
    );

    return courierJsonResponse(
      {
        success: false,
        message:
          error?.message ||
          "Courier settings save করার সময় সমস্যা হয়েছে.",
      },
      500,
      corsHeaders
    );
  }
}


// =========================================================
// LOAD COURIER API SETTINGS STATUS
// =========================================================

if (
  url.pathname === "/api/courier/settings" &&
  request.method === "GET"
) {
  try {
    if (
      !env.SUPABASE_URL ||
      !env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      return courierJsonResponse(
        {
          success: false,
          message:
            "Supabase configuration is missing.",
        },
        500,
        corsHeaders
      );
    }

    const response = await fetch(
      `${env.SUPABASE_URL}/rest/v1/courier_api_settings?select=courier,enabled,connection_status,last_tested_at,last_error,updated_at&order=courier.asc`,
      {
        method: "GET",
        headers:
          getSupabaseHeaders(env),
      }
    );

    if (!response.ok) {
      const errorText =
        await response.text();

      console.error(
        "Courier settings load error:",
        errorText
      );

      return courierJsonResponse(
        {
          success: false,
          message:
            "Courier settings load করা যায়নি.",
        },
        500,
        corsHeaders
      );
    }

    const settings =
      await response.json();

    return courierJsonResponse(
      {
        success: true,
        settings,
      },
      200,
      corsHeaders
    );
  } catch (error) {
    console.error(
      "Courier settings load exception:",
      error
    );

    return courierJsonResponse(
      {
        success: false,
        message:
          error?.message ||
          "Courier settings load করার সময় সমস্যা হয়েছে.",
      },
      500,
      corsHeaders
    );
  }
}

    // =========================================================
// COURIER API SECURITY HELPERS
// =========================================================

function base64Encode(bytes) {
  let binary = "";

  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return btoa(binary);
}

function base64Decode(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

async function getCourierEncryptionKey(env) {
  const secret = cleanText(env.COURIER_ENCRYPTION_KEY);

  if (!secret) {
    throw new Error(
      "COURIER_ENCRYPTION_KEY is not configured."
    );
  }

  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(secret)
  );

  return crypto.subtle.importKey(
    "raw",
    hash,
    {
      name: "AES-GCM",
    },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptCourierCredentials(
  credentials,
  env
) {
  const key = await getCourierEncryptionKey(env);

  const iv = crypto.getRandomValues(
    new Uint8Array(12)
  );

  const plaintext = new TextEncoder().encode(
    JSON.stringify(credentials)
  );

  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    plaintext
  );

  return JSON.stringify({
    version: 1,
    iv: base64Encode(iv),
    data: base64Encode(
      new Uint8Array(encrypted)
    ),
  });
}

async function decryptCourierCredentials(
  encryptedValue,
  env
) {
  const key = await getCourierEncryptionKey(env);

  const stored =
    typeof encryptedValue === "string"
      ? JSON.parse(encryptedValue)
      : encryptedValue;

  const iv = base64Decode(stored.iv);
  const encryptedData = base64Decode(
    stored.data
  );

  const decrypted =
    await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv,
      },
      key,
      encryptedData
    );

  return JSON.parse(
    new TextDecoder().decode(decrypted)
  );
}

function courierJsonResponse(
  data,
  status = 200,
  corsHeaders = {}
) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    }
  );
}
    // =========================================================
    // HELPERS
    // =========================================================

    function cleanText(value) {
      return String(value || "")
        .replace(/\r/g, "")
        .trim();
    }

    function normalizeText(value) {
      return cleanText(value)
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }

    function normalizeColor(value) {
      const text = normalizeText(value);

      if (!text) return "";

      const groups = [
        ["orange", ["orange", "peach", "coral", "rust", "tangerine"]],
        ["red", ["red", "maroon", "burgundy", "crimson", "wine", "brick"]],
        ["pink", ["pink", "rose", "magenta", "fuchsia"]],
        ["purple", ["purple", "violet", "lavender", "plum", "mauve"]],
        ["blue", ["blue", "navy", "royal blue", "sky blue", "cyan"]],
        ["teal", ["teal", "turquoise", "aqua"]],
        ["green", ["green", "olive", "mint", "emerald", "lime"]],
        ["yellow", ["yellow", "mustard", "lemon"]],
        ["gold", ["gold", "golden", "metallic gold"]],
        ["white", ["white", "cream", "ivory", "off white", "offwhite"]],
        ["black", ["black", "jet black"]],
        ["brown", ["brown", "chocolate", "coffee", "tan"]],
        ["beige", ["beige", "nude", "sand"]],
        ["gray", ["gray", "grey", "silver"]],
      ];

      for (const [name, words] of groups) {
        for (const word of words) {
          const normalizedWord = normalizeText(word);

          if (
            text === normalizedWord ||
            text.includes(normalizedWord)
          ) {
            return name;
          }
        }
      }

      return text;
    }

    // =========================================================
    // TEXT SIMILARITY
    // =========================================================

    function normalizeSimilarityText(value) {

  let text = normalizeText(value);

  if (!text) return "";

  const replacements = [
    [/\bembroidered\b/g, "embroidery"],
    [/\bembroidering\b/g, "embroidery"],
    [/\bembroid\b/g, "embroidery"],

    [/\bneckline\b/g, "neck"],
    [/\bcuffs?\b/g, "cuff"],

    [/\bflowy\b/g, "loose"],
    [/\bflowing\b/g, "loose"],
    [/\brelaxed\b/g, "loose"],

    [/\bfloor[- ]?length\b/g, "floorlength"],
    [/\bfloor[- ]?sweeping\b/g, "floorlength"],

    [/\bdecorative\b/g, "decorated"],
    [/\bornate\b/g, "decorated"],

    [/\btassels?\b/g, "tassel"],
  ];

  for (const [pattern, replacement] of replacements) {
    text = text.replace(pattern, replacement);
  }

  return text;
}
        function similarity(a, b) {
      const A = normalizeSimilarityText(a);
const B = normalizeSimilarityText(b);

      if (!A || !B) return 0;

      if (A === B) return 1;

      const wordsA = new Set(
        A.split(" ").filter((x) => x.length >= 3)
      );

      const wordsB = new Set(
        B.split(" ").filter((x) => x.length >= 3)
      );

      if (!wordsA.size || !wordsB.size) {
        return 0;
      }

      const garmentWords = new Set([
        "salwar",
        "kameez",
        "saree",
        "sari",
        "kurti",
        "blouse",
        "dress",
        "suit",
      ]);

      if (
        (wordsA.size === 1 && wordsB.size > 1) ||
        (wordsB.size === 1 && wordsA.size > 1)
      ) {
        const singleWord =
          wordsA.size === 1
            ? [...wordsA][0]
            : [...wordsB][0];

        const largerWords =
          wordsA.size > 1
            ? wordsA
            : wordsB;

        if (
          garmentWords.has(singleWord) &&
          largerWords.has(singleWord)
        ) {
          return 0.50;
        }

        if (largerWords.has(singleWord)) {
          return 0.90;
        }
      }

      let common = 0;

      for (const word of wordsA) {
        if (wordsB.has(word)) {
          common++;
        }
      }

      const overlap =
        common /
        Math.max(wordsA.size, wordsB.size);

      return Number(
        overlap.toFixed(4)
      );
    }

    // =========================================================
    // COLOR SIMILARITY
    // =========================================================

    function colorSimilarity(a, b) {
      const A = normalizeColor(a);
      const B = normalizeColor(b);

      if (!A || !B) return 0;

      if (A === B) return 1;

      return 0;
    }

    // =========================================================
    // EXTRACT FIELD
    // =========================================================

    function extractField(text, label) {
      const source = cleanText(text);

      if (!source || !label) return "";

      const escaped = String(label)
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      const regex = new RegExp(
        "(?:^|\\n)\\s*(?:[-*�]\\s*)?\\*{0,2}" +
          escaped +
          "\\*{0,2}\\s*:\\s*(.+?)(?=\\n|$)",
        "im"
      );

      const match = source.match(regex);

      if (!match) return "";

      return cleanText(
        match[1]
          .replace(/\*\*/g, "")
          .replace(/^[-*�]\s*/, "")
      );
    }

    function extractListField(text, label) {
      const value = extractField(text, label);

      if (!value) return [];

      return value
        .split(/,\s*|\s+and\s+/i)
        .map((x) => cleanText(x))
        .filter(Boolean);
    }

    // =========================================================
    // NORMALIZE FINGERPRINT
    // =========================================================

    function normalizeFingerprint(parsed, raw) {
  const source =
    typeof raw === "string"
      ? raw
      : JSON.stringify(raw || "");

  // ---------------------------------------------------------
  // SOURCE TEXT
  // ---------------------------------------------------------

  const visualSource = cleanText(
    parsed?.visual_fingerprint
  );

  // Search both the complete raw response and the
  // visual fingerprint text.
  const combinedSource = [
    source,
    visualSource,
  ]
    .filter(Boolean)
    .join("\n");

  // ---------------------------------------------------------
  // INITIAL STRUCTURED RESULT
  // ---------------------------------------------------------

  const result = {
    garment_type: cleanText(
      parsed?.garment_type
    ),

    dominant_color: cleanText(
      parsed?.dominant_color
    ),

    secondary_colors: Array.isArray(
      parsed?.secondary_colors
    )
      ? parsed.secondary_colors
          .map(cleanText)
          .filter(Boolean)
      : [],

    pattern: cleanText(
      parsed?.pattern
    ),

    embroidery: cleanText(
      parsed?.embroidery
    ),

    neckline: cleanText(
      parsed?.neckline
    ),

    sleeves: cleanText(
      parsed?.sleeves
    ),

    cuffs: cleanText(
      parsed?.cuffs
    ),

    fit: cleanText(
      parsed?.fit
    ),

    length: cleanText(
      parsed?.length
    ),

    hem: cleanText(
      parsed?.hem
    ),

    border: cleanText(
      parsed?.border
    ),

    dupatta_or_orna: cleanText(
      parsed?.dupatta_or_orna
    ),

    fabric_appearance: cleanText(
      parsed?.fabric_appearance
    ),

    distinctive_details: cleanText(
      parsed?.distinctive_details
    ),

    visual_fingerprint: visualSource,
  };

  // =========================================================
  // MARKDOWN / LABEL FALLBACK
  // =========================================================

  if (!result.garment_type) {
    result.garment_type =
      extractField(
        combinedSource,
        "Garment Type"
      );
  }

  if (!result.dominant_color) {
    result.dominant_color =
      extractField(
        combinedSource,
        "Dominant Color"
      );
  }

  if (!result.secondary_colors.length) {
    result.secondary_colors =
      extractListField(
        combinedSource,
        "Secondary Colors"
      );
  }

  if (!result.pattern) {
    result.pattern =
      extractField(
        combinedSource,
        "Pattern"
      );
  }

  if (!result.embroidery) {
    result.embroidery =
      extractField(
        combinedSource,
        "Embroidery"
      );
  }

  if (!result.neckline) {
    result.neckline =
      extractField(
        combinedSource,
        "Neckline"
      );
  }

  if (!result.sleeves) {
    result.sleeves =
      extractField(
        combinedSource,
        "Sleeves"
      );
  }

  if (!result.cuffs) {
    result.cuffs =
      extractField(
        combinedSource,
        "Cuffs"
      );
  }

  if (!result.fit) {
    result.fit =
      extractField(
        combinedSource,
        "Fit"
      );
  }

  if (!result.length) {
    result.length =
      extractField(
        combinedSource,
        "Length"
      );
  }

  if (!result.hem) {
    result.hem =
      extractField(
        combinedSource,
        "Hem"
      );
  }

  if (!result.border) {
    result.border =
      extractField(
        combinedSource,
        "Border"
      );
  }

  if (!result.dupatta_or_orna) {
    result.dupatta_or_orna =
      extractField(
        combinedSource,
        "Dupatta/Orna"
      ) ||
      extractField(
        combinedSource,
        "Dupatta/Orna Details"
      ) ||
      extractField(
        combinedSource,
        "Dupatta or Orna"
      );
  }

  if (!result.fabric_appearance) {
    result.fabric_appearance =
      extractField(
        combinedSource,
        "Fabric Appearance"
      );
  }

  if (!result.distinctive_details) {
    result.distinctive_details =
      extractField(
        combinedSource,
        "Distinctive Details"
      );
  }

  if (!result.visual_fingerprint) {
    result.visual_fingerprint =
      extractField(
        combinedSource,
        "Visual Fingerprint"
      ) || combinedSource;
  }

    // =========================================================
  // PROSE FALLBACK
  // =========================================================
  // AI sometimes returns natural-language prose instead of JSON.
  // Recover the fingerprint fields from that prose.

  const prose =
  normalizeText(
    combinedSource
  );

  // ---------------------------------------------------------
  // GARMENT TYPE
  // ---------------------------------------------------------

  if (!result.garment_type && prose) {
    if (
      prose.includes("salwar kameez") ||
      prose.includes("salwar suit")
    ) {
      result.garment_type = "Salwar Kameez";
    } else if (
      prose.includes("three piece") ||
      prose.includes("three-piece")
    ) {
      result.garment_type = "Three-piece suit";
    } else if (
      prose.includes("saree") ||
      prose.includes("sari")
    ) {
      result.garment_type = "Saree";
    } else if (
      prose.includes("blouse")
    ) {
      result.garment_type = "Blouse";
    } else if (
      prose.includes("kurti")
    ) {
      result.garment_type = "Kurti";
    } else if (
      prose.includes("kameez")
    ) {
      result.garment_type = "Kameez";
    }
  }

  // ---------------------------------------------------------
  // DOMINANT COLOR
  // ---------------------------------------------------------
  // IMPORTANT:
  // Prefer explicit "primarily/mainly/predominantly" color
  // over border/accent colors.
  // Example:
  // "primarily orange with a green border"
  // => orange MUST be dominant.

  const colors = [
    "orange",
    "red",
    "pink",
    "purple",
    "blue",
    "teal",
    "green",
    "yellow",
    "gold",
    "white",
    "black",
    "brown",
    "beige",
    "cream",
    "gray"
  ];

  let detectedDominantColor = "";

  if (prose) {

    // -------------------------------------------------------
    // 1. EXPLICIT PRIMARY COLOR
    // -------------------------------------------------------

    const primaryPatterns = [
      "primarily",
      "mainly",
      "predominantly",
      "mostly",
      "dominant color of the garment is",
      "dominant color is",
      "main color is",
      "primary color is",
      "color of the garment is"
    ];

    for (const pattern of primaryPatterns) {

      for (const color of colors) {

        if (
          prose.includes(
            `${pattern} ${color}`
          ) ||
          prose.includes(
            `${pattern} ${color} color`
          ) ||
          prose.includes(
            `${pattern} ${color}-colored`
          )
        ) {
          detectedDominantColor =
            color;

          break;
        }
      }

      if (detectedDominantColor) {
        break;
      }
    }

    // -------------------------------------------------------
    // 2. "GARMENT IS ORANGE" / "ORANGE SALWAR KAMEEZ"
    // -------------------------------------------------------

    if (!detectedDominantColor) {

      for (const color of colors) {

        if (
          prose.includes(
            `garment is ${color}`
          ) ||
          prose.includes(
            `garment is a ${color}`
          ) ||
          prose.includes(
            `garment is an ${color}`
          ) ||
          prose.includes(
            `an ${color} salwar`
          ) ||
          prose.includes(
            `a ${color} salwar`
          ) ||
          prose.includes(
            `${color} salwar kameez`
          ) ||
          prose.includes(
            `${color} salwar suit`
          )
        ) {
          detectedDominantColor =
            color;

          break;
        }
      }
    }

    // -------------------------------------------------------
// 3. ROBUST NATURAL-LANGUAGE COLOR FALLBACK
// -------------------------------------------------------

if (!detectedDominantColor) {
  for (const color of colors) {
    if (
      prose.includes(`${color} hue`) ||
      prose.includes(`vibrant ${color}`) ||
      prose.includes(`bright ${color}`) ||
      prose.includes(`deep ${color}`) ||
      prose.includes(`rich ${color}`) ||
      prose.includes(`bold ${color}`) ||
      prose.includes(`soft ${color}`) ||
      prose.includes(`pastel ${color}`) ||
      prose.includes(`${color}-colored`) ||
      prose.includes(`${color} colored`) ||
      prose.includes(`dominant ${color}`) ||
      prose.includes(`dominant color ${color}`) ||
      prose.includes(`dominant color is ${color}`) ||
      prose.includes(`dominant color of the garment is ${color}`)
    ) {
      detectedDominantColor = color;
      break;
    }
  }
}
  }

// ---------------------------------------------------------
// APPLY DETECTED DOMINANT COLOR
// ---------------------------------------------------------

if (detectedDominantColor) {
  result.dominant_color = detectedDominantColor;
} else {
  result.dominant_color = "";
}

// ---------------------------------------------------------
// PATTERN
// ---------------------------------------------------------

  if (!result.pattern && prose) {
    if (
      prose.includes("floral")
    ) {
      result.pattern = "Floral";
    } else if (
      prose.includes("paisley")
    ) {
      result.pattern = "Paisley";
    } else if (
      prose.includes("geometric")
    ) {
      result.pattern = "Geometric";
    } else if (
      prose.includes("abstract")
    ) {
      result.pattern = "Abstract";
    } else if (
      prose.includes("pattern")
    ) {
      result.pattern = "Patterned";
    }
  }

  // ---------------------------------------------------------
  // EMBROIDERY
  // ---------------------------------------------------------

  if (!result.embroidery && prose) {
    if (
      prose.includes("intricate embroidery")
    ) {
      result.embroidery =
        "Intricate embroidery";
    } else if (
      prose.includes("gold embroidery")
    ) {
      result.embroidery =
        "Gold embroidery";
    } else if (
  prose.includes("embroidered") ||
  prose.includes("embroidery")
) {
  result.embroidery =
    "Embroidered";
}
  }

    // ---------------------------------------------------------
  // NECKLINE
  // ---------------------------------------------------------

  if (!result.neckline && prose) {
    if (
      prose.includes("round neckline") ||
      
      prose.includes("round neck")
    ) {
      result.neckline = "Round neckline";
    } else if (
      prose.includes("high neckline") ||
      prose.includes("high neck")
    ) {
      result.neckline = "High neckline";
    } else if (
      prose.includes("v neckline") ||
      prose.includes("v-shaped neckline") ||
      prose.includes("v neck")
    ) {
      result.neckline = "V neckline";
    } else if (
      prose.includes("square neckline") ||
      prose.includes("square neck")
    ) {
      result.neckline = "Square neckline";
    }
  }

// ---------------------------------------------------------
// SLEEVES
// ---------------------------------------------------------

if (!result.sleeves && prose) {
  if (
    prose.includes("long sleeves") ||
    prose.includes("long-sleeved") ||
    prose.includes("sleeves are long") ||
    prose.includes("long and flowy sleeves") ||
    prose.includes("long and flowing sleeves")
  ) {
    result.sleeves = "Long sleeves";
  } else if (
    prose.includes("short sleeves") ||
    prose.includes("short-sleeved") ||
    prose.includes("sleeves are short")
  ) {
    result.sleeves = "Short sleeves";
  } else if (
    prose.includes("three quarter sleeves") ||
    prose.includes("three-quarter sleeves") ||
    prose.includes("sleeves are three quarter") ||
    prose.includes("sleeves are three-quarter")
  ) {
    result.sleeves = "Three-quarter sleeves";
  } else if (
    prose.includes("bell-shaped sleeves") ||
    prose.includes("bell shaped sleeves")
  ) {
    result.sleeves = "Bell-shaped sleeves";
  }
}

  // ---------------------------------------------------------
  // CUFFS
  // ---------------------------------------------------------

  if (!result.cuffs && prose) {
    if (
      prose.includes("embroidered cuffs") ||
      prose.includes("cuffs are adorned with embroidery") ||
      prose.includes("cuffs are adorned with intricate embroidery")
    ) {
      result.cuffs = "Embroidered cuffs";
    } else if (
      prose.includes("decorative cuffs")
    ) {
      result.cuffs = "Decorative cuffs";
    }
  }

    // ---------------------------------------------------------
  // FIT
  // ---------------------------------------------------------

  if (!result.fit && prose) {
    if (
      prose.includes("fit is loose") ||
      prose.includes("fit is a loose") ||
      prose.includes("loose and flowing") ||
      prose.includes("loose and flowy") ||
      prose.includes("loose-fitting") ||
      prose.includes("loose fitting") ||
      prose.includes("loose fit") ||
      prose.includes("loose silhouette")
    ) {
      result.fit = "Loose";
    } else if (
      prose.includes("fitted silhouette") ||
      prose.includes("fit is fitted") ||
      prose.includes("fitted")
    ) {
      result.fit = "Fitted";
    } else if (
      prose.includes("relaxed fit") ||
      prose.includes("fit is relaxed") ||
      prose.includes("relaxed")
    ) {
      result.fit = "Relaxed";
    }
  }

  // ---------------------------------------------------------
  // LENGTH
  // ---------------------------------------------------------

  if (!result.length && prose) {
    if (
      prose.includes("floor length") ||
      prose.includes("floor-length") ||
      prose.includes("floor length")
    ) {
      result.length = "Floor-length";
    } else if (
      prose.includes("ankle length") ||
      prose.includes("ankle-length") ||
      prose.includes("reaches the ankles") ||
      prose.includes("just above the ankles")
    ) {
      result.length = "Ankle-length";
    } else if (
      prose.includes("just below the knee") ||
      prose.includes("below the knee") ||
      prose.includes("knee length") ||
      prose.includes("knee-length")
    ) {
      result.length = "Knee-length";
    } else if (
      prose.includes("just above the knee") ||
      prose.includes("above the knee")
    ) {
      result.length = "Above-knee";
    } else if (
      prose.includes("long length")
    ) {
      result.length = "Long";
    }
  }

    // ---------------------------------------------------------
  // HEM
  // ---------------------------------------------------------

  if (!result.hem && prose) {
    if (
      prose.includes("straight hem")
    ) {
      result.hem = "Straight hem";
    } else if (
      prose.includes("embroidered hem") ||
      prose.includes("embroidery along the hem") ||
      prose.includes("embroidery on the hem") ||
      prose.includes("gold embroidery along the hem") ||
      prose.includes("gold embroidery on the hem")
    ) {
      result.hem = "Embroidered hem";
    } else if (
      prose.includes("decorative hem") ||
      prose.includes("hem is finished with a decorative border") ||
      prose.includes("hem is finished with a delicate lace trim")
    ) {
      result.hem = "Decorative hem";
    }
  }

  // ---------------------------------------------------------
  // BORDER
  // ---------------------------------------------------------

  if (!result.border && prose) {
    if (
      prose.includes("gold border")
    ) {
      result.border = "Gold border";
    } else if (
      prose.includes("embroidered border")
    ) {
      result.border = "Embroidered border";
    } else if (
      prose.includes("decorative border")
    ) {
      result.border = "Decorative border";
    } else if (
      prose.includes("greenish yellow border")
    ) {
      result.border = "Greenish-yellow border";
    }
  }
  

  // ---------------------------------------------------------
  // DUPATTA / ORNA
  // ---------------------------------------------------------

  if (
    !result.dupatta_or_orna &&
    prose
  ) {
    if (
      prose.includes("dupatta/orna is not visible") ||
      prose.includes("dupatta is not visible") ||
      prose.includes("dupatta orna is not visible")
    ) {
      result.dupatta_or_orna =
        "Not Visible";
    } else if (
      prose.includes("matching dupatta")
    ) {
      result.dupatta_or_orna =
        "Matching";
    } else if (
      prose.includes("dupatta")
    ) {
      result.dupatta_or_orna =
        "Visible";
    } else if (
      prose.includes("orna")
    ) {
      result.dupatta_or_orna =
        "Visible";
    }
  }

  // ---------------------------------------------------------
  // FABRIC APPEARANCE
  // ---------------------------------------------------------

  if (
    !result.fabric_appearance &&
    prose
  ) {
    if (
      prose.includes("smooth and silky")
    ) {
      result.fabric_appearance =
        "Smooth and silky";
    } else if (
      prose.includes("smooth and shiny")
    ) {
      result.fabric_appearance =
        "Smooth and shiny";
    } else if (
      prose.includes("smooth material")
    ) {
      result.fabric_appearance =
        "Smooth";
    } else if (
      prose.includes("lightweight")
    ) {
      result.fabric_appearance =
        "Lightweight";
    } else if (
      prose.includes("shiny")
    ) {
      result.fabric_appearance =
        "Shiny";
    } else if (
      prose.includes("silky")
    ) {
      result.fabric_appearance =
        "Silky";
    }
  }

  // ---------------------------------------------------------
  // DISTINCTIVE DETAILS
  // ---------------------------------------------------------

  if (
    !result.distinctive_details &&
    prose
  ) {
    const details = [];

    if (
      prose.includes("intricate embroidery") ||
      prose.includes("embroidery")
    ) {
      details.push(
        "Intricate embroidery"
      );
    }

    if (
      prose.includes("decorative border") ||
      prose.includes("embroidered border")
    ) {
      details.push(
        "Decorative border"
      );
    }

    if (
      prose.includes("tassel")
    ) {
      details.push(
        "Tassel detail"
      );
    }

    if (
      prose.includes("paisley")
    ) {
      details.push(
        "Paisley design"
      );
    }

    result.distinctive_details =
      details.join(", ");
  }

  // ---------------------------------------------------------
  // DOMINANT COLOR
  // ---------------------------------------------------------

  if (!result.dominant_color && prose) {
    const colors = [
      "orange",
      "red",
      "pink",
      "purple",
      "blue",
      "teal",
      "green",
      "yellow",
      "gold",
      "white",
      "black",
      "brown",
      "beige",
      "gray",
    ];

    for (const color of colors) {
      if (
  prose.includes(`dominant color of the garment is ${color}`) ||
  prose.includes(`${color} color`) ||
  prose.includes(`its ${color} color`) ||
  prose.includes(`with an ${color} color`) ||
  prose.includes(`with a ${color} garment`) ||
  prose.includes(`predominantly ${color}`) ||
  prose.includes(`primarily ${color}`) ||
  prose.includes(`mostly ${color}`) ||
  prose.includes(`dominant color is ${color}`) ||
  prose.includes(`dominant color ${color}`)
) {
  result.dominant_color = color;
  break;
}
    }
  }

  // ---------------------------------------------------------
  // DUPATTA / ORNA
  // ---------------------------------------------------------

  if (
    !result.dupatta_or_orna &&
    prose
  ) {
    if (
      prose.includes("dupatta is not visible") ||
      prose.includes("dupatta orna is not visible")
    ) {
      result.dupatta_or_orna =
        "Not Visible";
    } else if (
      prose.includes("matching dupatta")
    ) {
      result.dupatta_or_orna =
        "Matching";
    } else if (
      prose.includes("dupatta")
    ) {
      result.dupatta_or_orna =
        "Visible";
    }
  }

  // ---------------------------------------------------------
  // FINAL CLEANUP
  // ---------------------------------------------------------

  result.garment_type =
    cleanText(result.garment_type);

  result.dominant_color =
    cleanText(result.dominant_color);

  result.pattern =
    cleanText(result.pattern);

  result.embroidery =
    cleanText(result.embroidery);

  result.neckline =
    cleanText(result.neckline);

  result.sleeves =
    cleanText(result.sleeves);

  result.cuffs =
    cleanText(result.cuffs);

  result.fit =
    cleanText(result.fit);

  result.length =
    cleanText(result.length);

  result.hem =
    cleanText(result.hem);

  result.border =
    cleanText(result.border);

  result.dupatta_or_orna =
    cleanText(result.dupatta_or_orna);

  result.fabric_appearance =
    cleanText(result.fabric_appearance);

  result.distinctive_details =
    cleanText(result.distinctive_details);

  return result;
}

        // =========================================================
    // AI IMAGE ANALYSIS
    // =========================================================

    async function analyzeImage(imageBytes) {
      const result = await env.AI.run(
        "@cf/meta/llama-3.2-11b-vision-instruct",
        {
          image: [
            ...new Uint8Array(imageBytes),
          ],

          prompt: `

          Return ONLY valid JSON.
Do not explain.
Do not use markdown.
Do not add any text before or after JSON.

Analyze ONLY the clothing garment shown in the image.

IGNORE COMPLETELY:
- person's face
- person's body
- skin
- hair
- hands
- background
- furniture
- room
- walls
- floor
- lighting
- shadows

Your job is to create a STRICT VISUAL FINGERPRINT of the garment.

The fingerprint will be used to determine whether another photograph
contains the SAME clothing product.

Therefore describe ONLY visible garment characteristics.

=========================================================
FIELD RULES
=========================================================

1. garment_type

Identify the clothing type precisely.

Examples:
- Salwar Kameez
- Saree
- Kurti
- Lehenga
- Blouse
- Kameez
- Anarkali
- Gown

Do not guess a more specific garment type unless visually supported.

---------------------------------------------------------

2. dominant_color

Return the main visible garment color.

Use a simple normalized color name.

Examples:
- orange
- red
- pink
- green
- blue
- black
- white
- cream
- yellow
- purple
- brown
- beige
- maroon
- navy

Do NOT describe lighting as a color.

---------------------------------------------------------

3. secondary_colors

Return ONLY clearly visible additional garment colors.

Use an array.

Example:
["green", "pink", "white"]

If none are clearly visible:

[]

---------------------------------------------------------

4. pattern

Describe the actual visible pattern.

Examples:
- floral
- paisley
- geometric
- striped
- checked
- printed
- solid
- floral paisley
- geometric floral

Do not invent a pattern.

---------------------------------------------------------

5. embroidery

Describe visible embroidery.

Examples:
- heavy floral embroidery
- gold embroidery
- thread embroidery
- geometric embroidery
- embroidered
- none

If embroidery cannot be clearly determined:

""

---------------------------------------------------------

6. neckline

Describe the visible neckline.

Examples:
- round
- V-neck
- square
- high round
- collar
- boat neck

Do not guess.

---------------------------------------------------------

7. sleeves

Describe sleeve shape and approximate length.

Examples:
- long straight
- short
- three-quarter
- bell
- sleeveless

---------------------------------------------------------

8. cuffs

Describe cuffs ONLY if clearly visible.

Examples:
- plain
- embroidered
- decorative
- flared
- buttoned

If not visible:

""

---------------------------------------------------------

9. fit

Describe silhouette.

Examples:
- fitted
- loose
- relaxed
- straight
- flared
- A-line

---------------------------------------------------------

10. length

Describe garment length.

Examples:
- short
- knee-length
- ankle-length
- floor-length

If not confidently visible:

""

---------------------------------------------------------

11. hem

Describe the bottom edge.

Examples:
- straight
- curved
- flared
- embroidered
- decorative

If not visible:

""

---------------------------------------------------------

12. border

Describe ONLY an actual visible border.

Examples:
- wide decorative border
- embroidered border
- gold border
- floral border
- narrow border

If no border is visible:

""

---------------------------------------------------------

13. dupatta_or_orna

Determine whether a dupatta/orna is visible.

Use concise values such as:
- visible
- matching
- orange matching
- patterned
- not visible

If uncertain:

""

---------------------------------------------------------

14. fabric_appearance

Describe ONLY visible surface appearance.

Examples:
- matte
- shiny
- smooth
- textured
- lightweight
- sheer

Do NOT guess the actual fabric material unless visually obvious.

---------------------------------------------------------

15. distinctive_details

This is extremely important.

List ONLY distinctive visual features that can help identify
the SAME physical product in another photograph.

Examples:
- large paisley motifs
- dense floral embroidery
- wide repeating floral border
- contrasting sleeve cuffs
- tassel details
- unusual neckline embroidery
- repeated geometric motifs

Do NOT repeat generic field names.

Do NOT write explanations.

---------------------------------------------------------

16. visual_fingerprint

Write ONE concise sentence.

It MUST describe ONLY the garment's distinctive visual design.

IMPORTANT:

DO NOT include field names.

DO NOT write JSON inside this field.

DO NOT write explanations.

DO NOT write bullet points.

DO NOT repeat information unnecessarily.

GOOD EXAMPLE:

"Orange salwar kameez with floral-paisley motifs, dense embroidery,
high round neckline, long straight sleeves, and a wide repeating
floral border."

BAD EXAMPLE:

"The garment_type is salwar kameez. The dominant_color is orange.
The pattern is floral."

The second example is FORBIDDEN.

=========================================================
STRICT OUTPUT RULES
=========================================================

RETURN ONLY VALID JSON.

No Markdown.

No code fences.

No explanations.

No bullet points.

No field names inside visual_fingerprint.

Every field MUST contain a concise value when it is visually supported.

If a field cannot be determined confidently, return an empty string.

Do NOT invent information.

Do NOT infer colors from background, skin, lighting or furniture.

Do NOT infer fabric material when only appearance is visible.

Do NOT describe the person.

=========================================================
REQUIRED JSON
=========================================================

{
  "garment_type": "",
  "dominant_color": "",
  "secondary_colors": [],
  "pattern": "",
  "embroidery": "",
  "neckline": "",
  "sleeves": "",
  "cuffs": "",
  "fit": "",
  "length": "",
  "hem": "",
  "border": "",
  "dupatta_or_orna": "",
  "fabric_appearance": "",
  "distinctive_details": "",
  "visual_fingerprint": ""
}
`,

          max_tokens: 800,

          temperature: 0,

          response_format: {
            type: "json_schema",

            json_schema: {
              type: "object",

              properties: {
                garment_type: {
                  type: "string",
                },

                dominant_color: {
                  type: "string",
                },

                secondary_colors: {
                  type: "array",
                  items: {
                    type: "string",
                  },
                },

                pattern: {
                  type: "string",
                },

                embroidery: {
                  type: "string",
                },

                neckline: {
                  type: "string",
                },

                sleeves: {
                  type: "string",
                },

                cuffs: {
                  type: "string",
                },

                fit: {
                  type: "string",
                },

                length: {
                  type: "string",
                },

                hem: {
                  type: "string",
                },

                border: {
                  type: "string",
                },

                dupatta_or_orna: {
                  type: "string",
                },

                fabric_appearance: {
                  type: "string",
                },

                distinctive_details: {
                  type: "string",
                },

                visual_fingerprint: {
                  type: "string",
                },
              },

              required: [
                "garment_type",
                "dominant_color",
                "secondary_colors",
                "pattern",
                "embroidery",
                "neckline",
                "sleeves",
                "cuffs",
                "fit",
                "length",
                "hem",
                "border",
                "dupatta_or_orna",
                "fabric_appearance",
                "distinctive_details",
                "visual_fingerprint",
              ],
            },
          },
        },
      );

      console.log(
        "FULL AI RESULT:",
        JSON.stringify(result)
      );

      let raw =
        result?.response ??
        result?.result?.response ??
        "";

      if (typeof raw !== "string") {
        raw = JSON.stringify(raw);
      }

      console.log(
  "RAW VISION:",
  raw
);

function extractJSON(text){
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if(start === -1 || end === -1){
    return null;
  }

  return text.substring(start, end + 1);
}


let parsed;

try {

  const jsonText = extractJSON(raw);

  parsed = JSON.parse(jsonText);

} catch(e){

  console.log(
    "JSON PARSE FAILED:",
    e.message
  );

  parsed = {
    visual_fingerprint: raw
  };

}


const normalized =
  normalizeFingerprint(
    parsed,
    raw
  );


console.log(
  "NORMALIZED CUSTOMER FINGERPRINT:",
  JSON.stringify(
    normalized,
    null,
    2
  )
);


return normalized;

    }

    // =========================================================
    // CREATE SEARCH TEXT
    // =========================================================

    function fingerprintText(f) {
      return [
        `Garment type: ${f.garment_type}`,
        `Dominant color: ${f.dominant_color}`,

        `Secondary colors: ${
          Array.isArray(f.secondary_colors)
            ? f.secondary_colors.join(", ")
            : f.secondary_colors || ""
        }`,

        `Pattern: ${f.pattern}`,
        `Embroidery: ${f.embroidery}`,
        `Neckline: ${f.neckline}`,
        `Sleeves: ${f.sleeves}`,
        `Cuffs: ${f.cuffs}`,
        `Fit: ${f.fit}`,
        `Length: ${f.length}`,
        `Hem: ${f.hem}`,
        `Border: ${f.border}`,
        `Dupatta or orna: ${f.dupatta_or_orna}`,
        `Fabric appearance: ${f.fabric_appearance}`,
        `Distinctive details: ${f.distinctive_details}`,
        `Visual fingerprint: ${f.visual_fingerprint}`,
      ].join(". ");
    }

    // =========================================================
    // CANDIDATE FINGERPRINT
    // =========================================================

    function candidateFingerprint(metadata) {
  const m = metadata || {};

  let secondaryColors =
    m.secondary_colors || "";

  if (Array.isArray(secondaryColors)) {
    secondaryColors =
      secondaryColors.join(", ");
  }

  const visualFingerprint =
    cleanText(m.visual_fingerprint);

  const prose =
    normalizeText(visualFingerprint);
    console.log(
  "?? CANDIDATE RAW VISUAL FINGERPRINT:",
  visualFingerprint
);

console.log(
  "?? CANDIDATE NORMALIZED PROSE:",
  prose
);

console.log(
  "?? CANDIDATE METADATA:",
  JSON.stringify(m)
);

  // =========================================================
  // HELPER: FIND FIRST MATCH
  // =========================================================

  function findValue(patterns, fallback = "") {
    for (const pattern of patterns) {
      const match = prose.match(pattern);

      if (match && match[1]) {
        return cleanText(match[1]);
      }
    }

    return fallback;
  }

  // =========================================================
  // GARMENT TYPE
  // =========================================================

  let garmentType =
    cleanText(m.garment_type);

  if (!garmentType && prose) {
    if (
      prose.includes("salwar kameez") ||
      prose.includes("salwar suit")
    ) {
      garmentType = "Salwar Kameez";
    } else if (
      prose.includes("saree") ||
      prose.includes("sari")
    ) {
      garmentType = "Saree";
    } else if (prose.includes("kurti")) {
      garmentType = "Kurti";
    } else if (prose.includes("blouse")) {
      garmentType = "Blouse";
    } else if (prose.includes("kameez")) {
      garmentType = "Kameez";
    }
  }

// =========================================================
// GARMENT TYPE ALIAS NORMALIZATION
// =========================================================

const garmentTypeLower =
  cleanText(garmentType).toLowerCase();

if (
  garmentTypeLower.includes("salwar kameez") ||
  garmentTypeLower.includes("salwar suit") ||
  garmentTypeLower.includes("three-piece salwar") ||
  garmentTypeLower.includes("three piece salwar") ||
  garmentTypeLower === "three-piece suit" ||
  garmentTypeLower === "three piece suit" ||
  garmentTypeLower === "three-piece dress" ||
  garmentTypeLower === "three piece dress" ||
  garmentTypeLower === "pakistani three-piece suit"
) {
  garmentType = "Salwar Kameez";
}

  // =========================================================
  // DOMINANT COLOR
  // =========================================================

    // =========================================================
  // DOMINANT COLOR
  // =========================================================

  let dominantColor =
    cleanText(
      m.dominant_color ||
      m.color
    );

  // ---------------------------------------------------------
  // PROSE DOMINANT COLOR HAS PRIORITY
  // ---------------------------------------------------------

  if (prose) {
    const colors = [
      "orange",
      "red",
      "pink",
      "purple",
      "blue",
      "teal",
      "green",
      "yellow",
      "gold",
      "white",
      "black",
      "brown",
      "beige",
      "cream",
      "gray"
    ];

    for (const color of colors) {
      if (
        prose.includes(
          `dominant color of the garment is ${color}`
        ) ||
        prose.includes(
          `dominant color is ${color}`
        ) ||
        prose.includes(
          `dominant color of the garment ${color}`
        ) ||
        prose.includes(
          `color of the garment is ${color}`
        )
      ) {
        dominantColor = color;
        break;
      }
    }
  }

  // ---------------------------------------------------------
  // FALLBACK COLOR RECOVERY
  // ---------------------------------------------------------

  if (
    !dominantColor ||
    dominantColor.toLowerCase() === "single" ||
    dominantColor.toLowerCase() === "single colour"
  ) {
    const colors = [
      "orange",
      "red",
      "pink",
      "purple",
      "blue",
      "teal",
      "green",
      "yellow",
      "gold",
      "white",
      "black",
      "brown",
      "beige",
      "cream",
      "gray"
    ];

    for (const color of colors) {
      if (
        prose.includes(`${color} color scheme`) ||
        prose.includes(`${color}-colored`) ||
        prose.includes(`garment is ${color}`) ||
        prose.includes(`garment is a ${color}`) ||
        prose.includes(`garment is an ${color}`)
      ) {
        dominantColor = color;
        break;
      }
    }
  }

  // =========================================================
  // PATTERN RECOVERY
  // =========================================================

  let pattern =
    cleanText(m.pattern);

  if (!pattern && prose) {
    if (
      prose.includes("floral pattern") ||
      prose.includes("floral motif") ||
      prose.includes("floral designs") ||
      prose.includes("floral embroidery") ||
      prose.includes("floral")
    ) {
      pattern = "Floral";
    } else if (
      prose.includes("geometric pattern") ||
      prose.includes("geometric shapes")
    ) {
      pattern = "Geometric";
    } else if (
      prose.includes("embroidered pattern") ||
      prose.includes("embroidered")
    ) {
      pattern = "Embroidered";
    }
  }

  // =========================================================
  // EMBROIDERY RECOVERY
  // =========================================================

  let embroidery =
    cleanText(m.embroidery);

  if (!embroidery && prose) {
    if (
      prose.includes("intricate embroidery") ||
      prose.includes("intricate floral embroidery")
    ) {
      embroidery = "Intricate embroidery";
    } else if (
      prose.includes("floral embroidery")
    ) {
      embroidery = "Floral embroidery";
    } else if (
      prose.includes("gold embroidery")
    ) {
      embroidery = "Gold embroidery";
    } else if (
      prose.includes("embroidered")
    ) {
      embroidery = "Embroidered";
    }
  }

  // =========================================================
  // NECKLINE RECOVERY
  // =========================================================

  let neckline =
    cleanText(m.neckline);

  if (!neckline && prose) {
    if (
      prose.includes("round neckline") ||
      prose.includes("round neck")
    ) {
      neckline = "Round";
    } else if (
      prose.includes("v-neck") ||
      prose.includes("v-shaped neckline")
    ) {
      neckline = "V-neck";
    } else if (
      prose.includes("high neckline") ||
      prose.includes("high neck")
    ) {
      neckline = "High";
    }
  }

  // =========================================================
  // SLEEVES RECOVERY
  // =========================================================

  let sleeves =
    cleanText(m.sleeves);

  if (!sleeves && prose) {
    if (
      prose.includes("long sleeves") ||
      prose.includes("long-sleeved")
    ) {
      sleeves = "Long";
    } else if (
      prose.includes("short sleeves") ||
      prose.includes("short-sleeved")
    ) {
      sleeves = "Short";
    } else if (
      prose.includes("sleeveless")
    ) {
      sleeves = "Sleeveless";
    }
  }

  // =========================================================
  // CUFFS RECOVERY
  // =========================================================

  let cuffs =
    cleanText(m.cuffs);

  if (!cuffs && prose) {
    if (
      prose.includes("embroidered cuffs")
    ) {
      cuffs = "Embroidered";
    } else if (
      prose.includes("decorative cuffs")
    ) {
      cuffs = "Decorative";
    } else if (
      prose.includes("cuffs")
    ) {
      cuffs = "Cuffs";
    }
  }

    // =========================================================
  // FIT RECOVERY
  // =========================================================

  let fit =
    cleanText(m.fit);

  if (!fit && prose) {
    if (
      prose.includes("loose and flowy") ||
      prose.includes("loose and flowing") ||
      prose.includes("loose fit") ||
      prose.includes("loose-fitting") ||
      prose.includes("loose silhouette") ||
      prose.includes("relaxed fit") ||
      prose.includes("relaxed silhouette")
    ) {
      fit = "Loose";
    } else if (
      prose.includes("fitted silhouette") ||
      prose.includes("fitted")
    ) {
      fit = "Fitted";
    } else if (
      prose.includes("relaxed")
    ) {
      fit = "Relaxed";
    }
  }

  // =========================================================
  // LENGTH RECOVERY
  // =========================================================

  let length =
    cleanText(m.length);

  if (!length && prose) {
    if (
      prose.includes("floor-length") ||
      prose.includes("floor length") ||
      prose.includes("falls to the floor")
    ) {
      length = "Floor-length";
    } else if (
      prose.includes("ankle-length") ||
      prose.includes("ankle length") ||
      prose.includes("above the ankles") ||
      prose.includes("falls just above the ankles")
    ) {
      length = "Ankle-length";
    } else if (
      prose.includes("knee-length") ||
      prose.includes("knee length") ||
      prose.includes("knee-length top")
    ) {
      length = "Knee-length";
    }
  }

  // =========================================================
  // HEM RECOVERY
  // =========================================================

  let hem =
    cleanText(m.hem);

  if (!hem && prose) {
    if (
      prose.includes("embroidered hem")
    ) {
      hem = "Embroidered";
    } else if (
      prose.includes("decorative hem") ||
      (
        prose.includes("decorative border") &&
        prose.includes("hem")
      )
    ) {
      hem = "Decorative";
    } else if (
      prose.includes("straight hem")
    ) {
      hem = "Straight";
    } else if (
      prose.includes("lace trim") ||
      prose.includes("delicate trim")
    ) {
      hem = "Decorative";
    }
  }

  // =========================================================
  // BORDER RECOVERY
  // =========================================================

  let border =
    cleanText(m.border);

  if (!border && prose) {
    if (
      prose.includes("gold border")
    ) {
      border = "Gold border";
    } else if (
      prose.includes("embroidered border")
    ) {
      border = "Embroidered border";
    } else if (
      prose.includes("decorative border") ||
      prose.includes("ornate border") ||
      prose.includes("wide and ornate")
    ) {
      border = "Decorative border";
    } else if (
      prose.includes("border")
    ) {
      border = "Decorative border";
    }
  }

  // =========================================================
  // DUPATTA / ORNA RECOVERY
  // =========================================================

  let dupatta =
    cleanText(m.dupatta_or_orna);

  if (!dupatta && prose) {
    if (
      prose.includes("matching dupatta") ||
      prose.includes("matching orange dupatta") ||
      prose.includes("matching orna")
    ) {
      dupatta = "Matching";
    } else if (
      prose.includes("dupatta is") ||
      prose.includes("dupatta with") ||
      prose.includes("dupatta")
    ) {
      dupatta = "Visible";
    } else if (
      prose.includes("not visible")
    ) {
      dupatta = "Not visible";
    }
  }

  // =========================================================
  // FABRIC RECOVERY
  // =========================================================

  let fabric =
    cleanText(m.fabric_appearance);

  if (!fabric && prose) {
    if (
      prose.includes("shiny") ||
      prose.includes("slightly shiny") ||
      prose.includes("subtle sheen") ||
      prose.includes("smooth and silky") ||
      prose.includes("smooth and luxurious") ||
      prose.includes("smooth and lustrous") ||
      prose.includes("semi-sheer")
    ) {
      fabric = "Smooth and shiny";
    } else if (
      prose.includes("lightweight")
    ) {
      fabric = "Lightweight";
    }
  }

  // =========================================================
  // DISTINCTIVE DETAILS RECOVERY
  // =========================================================

  let distinctive =
    cleanText(
      m.distinctive_details
    );

  if (!distinctive && prose) {
    const details = [];

    if (
      prose.includes("tassel")
    ) {
      details.push("Tassel detail");
    }

    if (
      prose.includes("intricate embroidery") ||
      prose.includes("intricate floral embroidery")
    ) {
      details.push("Intricate embroidery");
    }

    if (
      prose.includes("decorative border") ||
      prose.includes("ornate border")
    ) {
      details.push("Decorative border");
    }

    if (
      prose.includes("flared silhouette") ||
      prose.includes("flared")
    ) {
      details.push("Flared silhouette");
    }

    if (
      prose.includes("bell-shaped sleeves") ||
      prose.includes("bell shape")
    ) {
      details.push("Bell-shaped sleeves");
    }

    if (details.length) {
      distinctive =
        details.join(", ");
    }
  }

  // =========================================================
  // FINAL CANDIDATE NORMALIZATION
  // =========================================================

  console.log(
    "?? FINAL CANDIDATE RECOVERY:",
    JSON.stringify({
      garmentType,
      dominantColor,
      pattern,
      embroidery,
      neckline,
      sleeves,
      cuffs,
      fit,
      length,
      hem,
      border,
      dupatta,
      fabric,
      distinctive
    })
  );

  // =========================================================
  // RETURN NORMALIZED CANDIDATE
  // =========================================================

  return {
    garment_type:
      garmentType,

    dominant_color:
      dominantColor,

    secondary_colors:
      cleanText(secondaryColors),

    pattern:
      pattern,

    embroidery:
      embroidery,

    neckline:
      neckline,

    sleeves:
      sleeves,

    cuffs:
      cuffs,

    fit:
      fit,

    length:
      length,

    hem:
      hem,

    border:
      border,

    dupatta_or_orna:
      dupatta,

    fabric_appearance:
      fabric,

    distinctive_details:
      distinctive,

    visual_fingerprint:
      visualFingerprint,

  };
}



    // =========================================================
    // STRICT EXACT VERIFICATION
    // =========================================================

    function normalizeGarmentType(value) {
  const lower = cleanText(value).toLowerCase();

  if (
    lower.includes("salwar") ||
    lower.includes("three piece") ||
    lower.includes("three-piece") ||
    lower.includes("pakistani") ||
    lower.includes("farshi") ||
    lower.includes("kameez")
  ) {
    return "Salwar Kameez";
  }

  if (
    lower.includes("saree") ||
    lower.includes("sari")
  ) {
    return "Saree";
  }

  return cleanText(value);
}

  function verifyExact(customer, metadata) {

  const candidate = candidateFingerprint(metadata);

    customer.garment_type =
    normalizeGarmentType(
      customer.garment_type
    );

  candidate.garment_type =
    normalizeGarmentType(
      candidate.garment_type
    );

  // =========================================================
  // GARMENT TYPE NORMALIZATION
  // =========================================================




  console.log(
    "GARMENT TYPE NORMALIZATION:",
    JSON.stringify({
      customer: customer.garment_type,
      candidate: candidate.garment_type,
      rawCandidate:
        metadata.garment_type || ""
    })
  );

// =========================================================
// NORMALIZE COLORS
// =========================================================

const customerColor =
  normalizeColor(
    customer.dominant_color
  );


let candidateColorSource =
  candidate.dominant_color;


if (
  !candidateColorSource ||
  normalizeText(candidateColorSource) === "single" ||
  normalizeText(candidateColorSource) === "single colour" ||
  normalizeText(candidateColorSource) === "single color"
) {
  candidateColorSource = "";
}


const candidateColor =
  normalizeColor(
    candidateColorSource
  );


console.log(
  "COLOR CHECK:",
  JSON.stringify({
    customerColor,
    candidateColor,
    candidateColorSource
  })
);


// =========================================================
// GARMENT TYPE CHECK
// =========================================================

const customerGarment =
 normalizeGarmentType(
   customer.garment_type
 );


const candidateGarment =
 normalizeGarmentType(
   candidate.garment_type
 );


const garmentTypeSimilarity =
 similarity(
   customerGarment,
   candidateGarment
 );


console.log(
  "GARMENT TYPE CHECK:",
  JSON.stringify({
    customer: customerGarment,
    candidate: candidateGarment,
    similarity: garmentTypeSimilarity
  })
);


if (
  garmentTypeSimilarity < 0.70
) {

  return {
    exact: false,
    score: 0,
    reason: "GARMENT_TYPE_MISMATCH",
    candidate
  };
}


  // =========================================================
  // FINGERPRINT SCORING
  // =========================================================

  const checks = [
    ["garment_type", 0.18],
    ["pattern", 0.18],
    ["embroidery", 0.15],
    ["neckline", 0.08],
    ["sleeves", 0.08],
    ["cuffs", 0.05],
    ["fit", 0.04],
    ["length", 0.04],
    ["hem", 0.03],
    ["border", 0.05],
    ["dupatta_or_orna", 0.05],
    ["fabric_appearance", 0.03],
    ["distinctive_details", 0.04]
  ];


  let total = 0;
  let weight = 0;


  for (
    const [field, fieldWeight]
    of checks
  ) {

    const a =
  field === "garment_type"
    ? customerGarment
    : cleanText(customer[field]);


const b =
  field === "garment_type"
    ? candidateGarment
    : cleanText(candidate[field]);


    if (
      !a ||
      !b
    ) {
      continue;
    }


    const sim =
      similarity(a, b);


    console.log(
      "FIELD CHECK:",
      JSON.stringify({
        field,
        customer: a,
        candidate: b,
        similarity: sim,
        weight: fieldWeight
      })
    );


    total +=
      sim * fieldWeight;

    weight +=
      fieldWeight;
  }


  const score =
    weight > 0
      ? total / weight
      : 0;


  console.log(
    "FINAL FINGERPRINT SCORE:",
    JSON.stringify({
      score,
      weight
    })
  );


  // =========================================================
  // EXACT DECISION
  // =========================================================

  const exact =
    score >= 0.68 &&
    garmentTypeSimilarity >= 0.70;


  return {
    exact,
    score,
    reason:
      exact
        ? "EXACT_MATCH"
        : "FINGERPRINT_MISMATCH",
    candidate
  };
}

    // =========================================================
    // ANALYZE TEST
    // =========================================================

    if (
      url.pathname ===
        "/api/analyze-test" &&
      request.method === "POST"
    ) {
      try {
        const formData =
          await request.formData();

        const image =
          formData.get("image");

        if (
          !(image instanceof File)
        ) {
          return Response.json(
            {
              success: false,
              error:
                "Please upload an image.",
            },
            { status: 400 }
          );
        }

        const bytes =
          await image.arrayBuffer();

        const fingerprint =
          await analyzeImage(
            bytes
          );

        return Response.json({
          success: true,
          fingerprint,
        });
      } catch (error) {
        console.error(
          "Analyze test error:",
          error
        );

        return Response.json(
          {
            success: false,
            error:
              error instanceof Error
                ? error.message
                : String(error),
          },
          { status: 500 }
        );
      }
    }

    // =========================================================
    // INDEX ALL PRODUCTS
    // =========================================================

    if (
      url.pathname ===
        "/api/index-products" &&
      request.method === "POST"
    ) {
      try {
        if (
          !env.SUPABASE_URL ||
          !env.SUPABASE_SERVICE_ROLE_KEY
        ) {
          return Response.json(
            {
              success: false,
              error:
                "Supabase secrets are not configured.",
            },
            { status: 500 }
          );
        }

        if (!env.VECTORIZE) {
          return Response.json(
            {
              success: false,
              error:
                "VECTORIZE binding is not configured.",
            },
            { status: 500 }
          );
        }

        // =====================================================
// GET PRODUCTS IN SMALL BATCH
// =====================================================

const urlObj = new URL(request.url);

const offset = Number(
  urlObj.searchParams.get("offset") || 0
);

const limit = Math.min(
  Number(
    urlObj.searchParams.get("limit") || 5
  ),
  5
);
const nextOffset = offset + limit;

const response =
  await fetch(
    `${env.SUPABASE_URL}/rest/v1/products` +
    `?select=id,name,details,color,size,price,image_url,stock,category,normalized_color,color_variants` +
    `&offset=${offset}` +
    `&limit=${limit}`,
    {
      headers: {
        apikey:
          env.SUPABASE_SERVICE_ROLE_KEY,

        Authorization:
          `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    }
  );

        if (!response.ok) {
          return Response.json(
            {
              success: false,
              error:
                `Supabase error ${response.status}`,

              details:
                await response.text(),
            },
            { status: 500 }
          );
        }

        const products =
          await response.json();

        console.log(
          "TOTAL PRODUCTS:",
          products.length
        );

        const vectors = [];
        const failed = [];

        for (
          const product of products
        ) {
          try {
            if (
              !product.image_url
            ) {
              failed.push({
                id: product.id,
                reason:
                  "No image_url",
              });

              continue;
            }

            console.log(
              "INDEXING PRODUCT:",
              product.id,
              product.name
            );

            const imageResponse =
              await fetch(
                product.image_url
              );

            if (
              !imageResponse.ok
            ) {
              failed.push({
                id: product.id,

                reason:
                  `Image download failed: ${imageResponse.status}`,
              });

              continue;
            }

            const bytes =
              await imageResponse.arrayBuffer();

            // ---------------------------------------------------
            // AI ANALYZE PRODUCT IMAGE
            // ---------------------------------------------------

            const fingerprint =
              await analyzeImage(
                bytes
              );

            console.log(
              "PRODUCT FINGERPRINT:",
              product.id,
              fingerprint
            );

            // ---------------------------------------------------
            // CREATE TEXT VECTOR
            // ---------------------------------------------------

            const text =
              fingerprintText(
                fingerprint
              );

            const embedding =
              await env.AI.run(
                "@cf/baai/bge-base-en-v1.5",
                {
                  text: [text],
                }
              );

            const vector =
              embedding?.data?.[0];

            if (
              !vector ||
              vector.length !== 768
            ) {
              failed.push({
                id: product.id,

                reason:
                  "Invalid 768 vector",
              });

              continue;
            }

            // ---------------------------------------------------
            // VECTOR METADATA
            // ---------------------------------------------------

            vectors.push({
              id: String(
                product.id
              ),

              values: vector,

              metadata: {
  product_id:
    String(product.id || ""),

  name:
    String(product.name || ""),

  details:
    String(product.details || ""),

  color:
    String(product.color || ""),

  category:
    String(product.category || ""),

  normalized_color:
    String(
      product.normalized_color ||
      product.color?.trim().toLowerCase() ||
      ""
    ),

  color_variants:
  JSON.stringify(
    Array.isArray(product.color_variants)
      ? product.color_variants.map((variant) => ({
          color: variant?.color || "",

          normalized_color:
            variant?.normalized_color ||
            variant?.color?.trim().toLowerCase() ||
            "",

          image_url:
            variant?.image_url || "",
        }))
      : []
  ),

  size:
    String(product.size || ""),

  price:
    product.price ?? null,

  stock:
    product.stock ?? null,

  image_url:
    String(product.image_url || ""),

  garment_type:
    String(
      fingerprint.garment_type || ""
    ),

  dominant_color:
    String(
      fingerprint.dominant_color || ""
    ),

  secondary_colors:
    Array.isArray(
      fingerprint.secondary_colors
    )
      ? fingerprint.secondary_colors
          .map(String)
          .join(", ")
      : String(
          fingerprint.secondary_colors || ""
        ),

  pattern:
    String(fingerprint.pattern || ""),

  embroidery:
    String(
      fingerprint.embroidery || ""
    ),

  neckline:
    String(
      fingerprint.neckline || ""
    ),

  sleeves:
    String(
      fingerprint.sleeves || ""
    ),

  cuffs:
    String(
      fingerprint.cuffs || ""
    ),

  fit:
    String(fingerprint.fit || ""),

  length:
    String(
      fingerprint.length || ""
    ),

  hem:
    String(fingerprint.hem || ""),

  border:
    String(fingerprint.border || ""),

  dupatta_or_orna:
    String(
      fingerprint.dupatta_or_orna || ""
    ),

  fabric_appearance:
    String(
      fingerprint.fabric_appearance || ""
    ),

  distinctive_details:
    String(
      fingerprint.distinctive_details || ""
    ),

  visual_fingerprint:
    String(
      fingerprint.visual_fingerprint || ""
    ),
},
            });

          } catch (error) {
            console.error(
              "PRODUCT INDEX ERROR:",
              product.id,
              error
            );

            failed.push({
              id: product.id,

              reason:
                error instanceof Error
                  ? error.message
                  : String(error),
            });
          }
        }

        if (!vectors.length) {
          return Response.json(
            {
              success: false,

              error:
                "No product vectors generated.",

              failed_products:
                failed,
            },
            { status: 500 }
          );
        }

        // -------------------------------------------------------
        // SAVE TO VECTORIZE
        // -------------------------------------------------------

        await env.VECTORIZE.upsert(
          vectors
        );
        // =====================================================
// AUTOMATIC NEXT BATCH
// =====================================================

let next_batch = null;

if (products.length === limit) {
  next_batch =
    `${url.origin}/api/index-products?offset=${nextOffset}&limit=${limit}`;

  console.log(
    "NEXT BATCH:",
    next_batch
  );

  // Trigger next batch in background
  if (env.ctx) {
    env.ctx.waitUntil(
      fetch(next_batch, {
        method: "POST",
      })
    );
  }
}

        return Response.json(
  {
    success: true,

    products_found:
      products.length,

    vectors_indexed:
      vectors.length,

    failed_products:
      failed,
  },
  {
    headers: corsHeaders,
  }
);

      } catch (error) {
        console.error(
          "Index error:",
          error
        );

        return Response.json(
          {
            success: false,

            error:
              error instanceof Error
                ? error.message
                : String(error),
          },
          { status: 500 }
        );
      }
    }

    // =========================================================
// VISUAL SEARCH
// EXACT + SIMILAR PRODUCTS
// =========================================================

if (
  url.pathname === "/api/visual-search" &&
  request.method === "POST"
) {
  try {
    console.log("=================================");
    console.log("VISUAL SEARCH STARTED");
    console.log("=================================");

    // -------------------------------------------------------
    // CHECK VECTORIZE
    // -------------------------------------------------------

    if (!env.VECTORIZE) {
      throw new Error(
        "VECTORIZE binding is not configured."
      );
    }

    // -------------------------------------------------------
    // GET IMAGE
    // -------------------------------------------------------

    // -------------------------------------------------------
// GET IMAGE + SEARCH FILTERS
// -------------------------------------------------------

const formData = await request.formData();

const image = formData.get("image");

const selectedCategory =
  String(formData.get("category") || "").trim();

const selectedColor =
  String(formData.get("color") || "").trim();

  const normalizedCategory =
  selectedCategory.toLowerCase();

const normalizedColor =
  selectedColor.toLowerCase();

console.log(
  "NORMALIZED CATEGORY:",
  normalizedCategory
);

console.log(
  "NORMALIZED COLOR:",
  normalizedColor
);

if (!(image instanceof File)) {
  return Response.json(
    {
      success: false,
      error: "Please upload a dress image.",
    },
    { status: 400 }
  );
}

console.log(
  "SELECTED CATEGORY:",
  selectedCategory
);

console.log(
  "SELECTED COLOR:",
  selectedColor
);
// -------------------------------------------------------
// READ IMAGE BYTES
// -------------------------------------------------------

const bytes = await image.arrayBuffer();

console.log(
  "IMAGE NAME:",
  image.name
);

console.log(
  "IMAGE TYPE:",
  image.type
);

console.log(
  "IMAGE SIZE:",
  image.size
);

    // -------------------------------------------------------
    // CUSTOMER IMAGE ANALYSIS
    // -------------------------------------------------------

    console.log(
      "ANALYZING CUSTOMER IMAGE..."
    );

    const customer = await analyzeImage(bytes);

    console.log(
      "CUSTOMER FINGERPRINT:",
      JSON.stringify(customer, null, 2)
    );

    // -------------------------------------------------------
    // REQUIRED DATA
    // -------------------------------------------------------

    if (
      !customer.garment_type ||
      !customer.dominant_color
    ) {
      return Response.json({
        success: true,

        exact_match: false,

        confidence: 0,

        reason:
          "INCOMPLETE_CUSTOMER_FINGERPRINT",

        customer_fingerprint:
          customer,

        exact_matches: [],

        similar_matches: [],

        matches: [],
      });
    }

    // -------------------------------------------------------
    // CREATE QUERY TEXT
    // -------------------------------------------------------

    const queryText =
      fingerprintText(customer);

    console.log(
      "QUERY TEXT:",
      queryText
    );

    // -------------------------------------------------------
    // CREATE QUERY VECTOR
    // -------------------------------------------------------

    const embedding =
      await env.AI.run(
        "@cf/baai/bge-base-en-v1.5",
        {
          text: [queryText],
        }
      );

    const queryVector =
      embedding?.data?.[0];

    if (
      !queryVector ||
      queryVector.length !== 768
    ) {
      throw new Error(
        "Could not generate query vector."
      );
    }

    console.log(
      "QUERY VECTOR:",
      queryVector.length
    );

    // -------------------------------------------------------
    // VECTOR SEARCH
    // -------------------------------------------------------

    const search =
      await env.VECTORIZE.query(
        queryVector,
        {
          topK: 50,
          returnMetadata: true,
        }
      );

    const candidates =
      search?.matches || [];
      // =======================================================
// CATEGORY + COLOR MATCH CHECK
// =======================================================

const matchesCategoryAndColor = (match) => {
  const metadata =
    match.metadata || {};

  // =====================================================
  // CATEGORY
  // =====================================================

  const productCategory =
    String(
      metadata.garment_type ||
      metadata.category ||
      ""
    )
      .trim()
      .toLowerCase();

  const categoryMatch =
    !selectedCategory ||
    selectedCategory === "all" ||
    productCategory ===
      normalizedCategory;

  if (!categoryMatch) {
    return false;
  }

  // =====================================================
  // COLOR
  // =====================================================

  if (
    !selectedColor ||
    selectedColor === "all"
  ) {
    return true;
  }

  const mainColor =
    String(
      metadata.color || ""
    )
      .trim()
      .toLowerCase();

  const dominantColor =
    String(
      metadata.dominant_color || ""
    )
      .trim()
      .toLowerCase();

  // =====================================================
  // COLOR VARIANTS
  // =====================================================

  let colorVariants = [];

  if (metadata.color_variants) {
    try {

      if (
        Array.isArray(
          metadata.color_variants
        )
      ) {

        colorVariants =
          metadata.color_variants;

      } else {

        colorVariants =
          JSON.parse(
            metadata.color_variants
          );

      }

    } catch {

      colorVariants =
        String(
          metadata.color_variants
        )
          .toLowerCase()
          .split(",");
    }
  }

  const variantColors =
    colorVariants
      .map((variant) => {

        if (
          typeof variant ===
          "string"
        ) {
          return variant
            .trim()
            .toLowerCase();
        }

        return String(
          variant?.color ||
          variant?.normalized_color ||
          ""
        )
          .trim()
          .toLowerCase();

      })
      .filter(Boolean);

  // =====================================================
  // FINAL COLOR MATCH
  // =====================================================

  return (
    mainColor ===
      normalizedColor ||

    dominantColor ===
      normalizedColor ||

    variantColors.includes(
      normalizedColor
    )
  );
};

    console.log(
      "VECTOR CANDIDATES:",
      candidates.length
    );
    

    if (!candidates.length) {
      return Response.json({
        success: true,

        exact_match: false,

        confidence: 0,

        reason:
          "NO_VECTOR_CANDIDATES",

        customer_fingerprint:
          customer,

        exact_matches: [],

        similar_matches: [],

        matches: [],
      });
    }

    // =======================================================
    // RESULT ARRAYS
    // =======================================================

    const verifiedExact = [];

    const similarProducts = [];
    const categoryColorProducts = [];

    // =======================================================
    // SIMILAR PRODUCT THRESHOLD
    // =======================================================

    const SIMILAR_VECTOR_THRESHOLD = 0.90;

    // =======================================================
    // VERIFY CANDIDATES
    // =======================================================

    for (
  const match of candidates
) {
      const vectorScore =
        Number(match.score || 0);

      console.log(
        "---------------------------------"
      );

      console.log(
        "CANDIDATE:",
        match.id
      );

      console.log(
        "VECTOR SCORE:",
        vectorScore
      );

      const metadata = {
        ...(match.metadata || {}),
        vectorScore,
      };

      console.log(
        "CANDIDATE METADATA:",
        JSON.stringify(
          metadata,
          null,
          2
        )
      );

      // =====================================================
      // FIRST VECTOR GATE
      // =====================================================

      if (vectorScore < 0.90) {
  console.log(
    "REJECTED: SCORE TOO LOW"
  );

  continue;
}

      // =====================================================
      // STRICT EXACT VERIFICATION
      // =====================================================

      const verification =
        verifyExact(
          customer,
          metadata
        );

      console.log(
        "VERIFICATION:",
        JSON.stringify(
          verification,
          null,
          2
        )
      );

      // =====================================================
      // EXACT PRODUCT
      // =====================================================

      if (verification.exact) {
        const combined =
          vectorScore * 0.55 +
          verification.score * 0.45;

        console.log(
          "COMBINED SCORE:",
          combined
        );

        // ---------------------------------------------------
        // FINAL EXACT GATE
        // ---------------------------------------------------

        if (combined >= 0.86) {
          verifiedExact.push({
            ...match,

            vector_score:
              Number(
                vectorScore.toFixed(6)
              ),

            fingerprint_score:
              Number(
                verification.score.toFixed(6)
              ),

            combined_score:
              Number(
                combined.toFixed(6)
              ),

            metadata,
          });

          console.log(
            "ACCEPTED AS EXACT"
          );

          continue;
        }
      }
      // =======================================================
// CATEGORY + COLOR FALLBACK
// =======================================================

const categoryColorMatch =
  matchesCategoryAndColor(
    match
  );

if (
  categoryColorMatch &&
  !verifiedExact.some(
    (item) =>
      item.id === match.id
  )
) {

  categoryColorProducts.push({

    ...match,

    vector_score:
      Number(
        vectorScore.toFixed(6)
      ),

    fingerprint_score:
      Number(
        (
          verification.score ||
          0
        ).toFixed(6)
      ),

    combined_score:
      Number(
        (
          vectorScore * 0.55 +
          (
            verification.score ||
            0
          ) * 0.45
        ).toFixed(6)
      ),

    metadata,

  });

  console.log(
    "🎨 CATEGORY + COLOR FALLBACK:",
    match.id
  );
}

      // =====================================================
      // SIMILAR PRODUCT
      // =====================================================

      if (
        vectorScore >=
        SIMILAR_VECTOR_THRESHOLD
      ) {
        similarProducts.push({
  ...match,

  vector_score:
    Number(
      vectorScore.toFixed(6)
    ),

  fingerprint_score:
    Number(
      (verification.score || 0).toFixed(6)
    ),

  combined_score:
    Number(
      (
        vectorScore * 0.55 +
        (verification.score || 0) * 0.45
      ).toFixed(6)
    ),

  metadata,
});

        console.log(
          "ACCEPTED AS SIMILAR"
        );
      }
    }

    // =======================================================
    // SORT EXACT PRODUCTS
    // =======================================================

    verifiedExact.sort(
      (a, b) =>
        b.combined_score -
        a.combined_score
    );

    // =======================================================
// SORT CATEGORY + COLOR PRODUCTS
// =======================================================

finalCategoryColorProducts.sort(
  (a, b) =>
    b.combined_score -
    a.combined_score
);

// =======================================================
// SORT SIMILAR PRODUCTS
// =======================================================

similarProducts.sort(
  (a, b) =>
    b.vector_score -
    a.vector_score
);

// =======================================================
// EXACT PRODUCT IDS
//
// Exact product যেন Category + Color অথবা Similar
// section-এ duplicate হয়ে না আসে।
// =======================================================

const exactIds =
  new Set(
    verifiedExact.map(
      (item) => item.id
    )
  );

// =======================================================
// REMOVE EXACT PRODUCTS FROM CATEGORY + COLOR
// =======================================================

const finalCategoryColorProductsWithoutExact =
  finalCategoryColorProducts.filter(
    (item) =>
      !exactIds.has(item.id)
  );

// =======================================================
// REMOVE EXACT PRODUCTS FROM SIMILAR
// =======================================================

const finalSimilarProducts =
  similarProducts.filter(
    (item) =>
      !exactIds.has(item.id)
  );

    // =======================================================
    // LOG RESULTS
    // =======================================================

    console.log(
      "================================="
    );

    console.log(
      "EXACT PRODUCTS:",
      verifiedExact.length
    );

    console.log(
      "SIMILAR PRODUCTS:",
      finalSimilarProducts.length
    );

    console.log(
      "================================="
    );

    // =======================================================
    // EXACT MATCH EXISTS
    // =======================================================

    if (
      verifiedExact.length > 0
    ) {
      const bestExact =
        verifiedExact[0];

      return Response.json({
        success: true,

        exact_match: true,

        confidence:
          bestExact.combined_score,

        customer_fingerprint:
          customer,

        exact_matches:
          verifiedExact.map(
            (item) => ({
              id: item.id,

              score:
                item.vector_score,

              fingerprint_score:
                item.fingerprint_score,

              combined_score:
                item.combined_score,

              metadata:
                item.metadata,
            })
          ),

          category_color_matches:
  finalCategoryColorProductsWithoutExact.map(
    (item) => ({
      id: item.id,

      score:
        item.vector_score,

      fingerprint_score:
        item.fingerprint_score,

      combined_score:
        item.combined_score,

      metadata:
        item.metadata,
    })
  ),

        similar_matches:
          finalSimilarProducts.map(
            (item) => ({
              id: item.id,

              score:
                item.vector_score,

              fingerprint_score:
                item.fingerprint_score,

              combined_score:
                item.combined_score,

              metadata:
                item.metadata,
            })
          ),

        // Backward compatibility
        matches:
          verifiedExact.map(
            (item) => ({
              id: item.id,

              score:
                item.vector_score,

              fingerprint_score:
                item.fingerprint_score,

              combined_score:
                item.combined_score,

              metadata:
                item.metadata,
            })
          ),
      });
    }

    // =======================================================
    // NO EXACT → SIMILAR PRODUCTS
    // =======================================================

    return Response.json({
      success: true,

      exact_match: false,

      confidence:
        finalSimilarProducts.length > 0
          ? finalSimilarProducts[0]
              .vector_score
          : 0,

      reason:
        finalSimilarProducts.length > 0
          ? "NO_EXACT_PRODUCT_SIMILAR_FOUND"
          : "NO_EXACT_OR_SIMILAR_PRODUCT",

      customer_fingerprint:
        customer,

      exact_matches: [],
      category_color_matches:
  finalCategoryColorProductsWithoutExact.map(
    (item) => ({
      id: item.id,

      score:
        item.vector_score,

      fingerprint_score:
        item.fingerprint_score,

      combined_score:
        item.combined_score,

      metadata:
        item.metadata,
    })
  ),

      similar_matches:
        finalSimilarProducts.map(
          (item) => ({
            id: item.id,

            score:
              item.vector_score,

            fingerprint_score:
              item.fingerprint_score,

            combined_score:
              item.combined_score,

            metadata:
              item.metadata,
          })
        ),

      // Backward compatibility
      matches: [],
    });

  } catch (error) {
    console.error(
      "================================="
    );

    console.error(
      "VISUAL SEARCH ERROR"
    );

    console.error(error);

    console.error(
      "================================="
    );

    return Response.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : String(error),

        error_name:
          error?.name ||
          "UnknownError",
      },
      { status: 500 }
    );
  }
}

    // =========================================================
    // NOT FOUND
    // =========================================================

    return new Response(
      "Not Found",
      {
        status: 404,
      }
    );
  },
};



