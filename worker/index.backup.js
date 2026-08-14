export default {
  async fetch(request, env) {
    const url = new URL(request.url);

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
    // HELPER: AI VISION ANALYSIS
    // =========================================================

    async function analyzeDressImage(imageBytes, env) {
  const visionResult = await env.AI.run(
    "@cf/meta/llama-3.2-11b-vision-instruct",
    {
      image: [...new Uint8Array(imageBytes)],

      prompt: `
You are a strict fashion product matching AI.

Analyze ONLY the clothing item visible in the image.

Ignore completely:

- person's face
- person's body/skin
- hair
- room
- wall
- furniture
- plants
- background
- lighting/background scenery

Create a structured visual fingerprint of the clothing.

Focus heavily on:

1. garment type
2. dominant color
3. secondary colors
4. exact pattern
5. embroidery
6. neckline
7. sleeve style
8. cuffs
9. fit
10. length
11. hem
12. border
13. dupatta/orna
14. fabric appearance
15. distinctive details

IMPORTANT COLOR RULES:

- Dominant color MUST describe the actual garment.
- NEVER use background color.
- NEVER use skin color.
- NEVER use lighting/background color.
- Use simple standard color names.
- If the garment is orange, use "orange".
- If purple, use "purple".
- If blue, use "blue".
- If red, use "red".
- If green, use "green".
- If black, use "black".
- If white, use "white".

IMPORTANT:

Analyze the garment itself, not the person.

Return the clothing information using the requested JSON schema.
`,

      response_format: {
        type: "json_schema",

        json_schema: {
          type: "object",

          properties: {
            garment_type: {
              type: "string"
            },

            dominant_color: {
              type: "string"
            },

            secondary_colors: {
              type: "array",
              items: {
                type: "string"
              }
            },

            pattern: {
              type: "string"
            },

            embroidery: {
              type: "string"
            },

            neckline: {
              type: "string"
            },

            sleeves: {
              type: "string"
            },

            cuffs: {
              type: "string"
            },

            fit: {
              type: "string"
            },

            length: {
              type: "string"
            },

            hem: {
              type: "string"
            },

            border: {
              type: "string"
            },

            dupatta_or_orna: {
              type: "string"
            },

            fabric_appearance: {
              type: "string"
            },

            distinctive_details: {
              type: "string"
            },

            visual_fingerprint: {
              type: "string"
            }
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
            "visual_fingerprint"
          ]
        }
      }
    }
  );

  // =======================================================
  // GET AI RESPONSE
  // =======================================================

  let raw =
    visionResult?.response ??
    visionResult?.result?.response ??
    "";

  // =======================================================
  // SAFETY: CONVERT RESPONSE TO STRING
  // =======================================================

  if (
    typeof raw !== "string" &&
    raw !== null &&
    raw !== undefined
  ) {
    try {
      raw = JSON.stringify(raw);
    } catch {
      raw = String(raw);
    }
  }

  raw = String(raw || "").trim();

  console.log(
    "🔵 RAW VISION RESPONSE:",
    raw
  );

  if (!raw) {
    return null;
  }

  // =======================================================
  // REMOVE MARKDOWN CODE FENCES
  // =======================================================

  raw = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // =======================================================
  // EXTRACT JSON OBJECT
  // =======================================================

  let parsed = null;

  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }

  if (!parsed) {
    const firstBrace =
      raw.indexOf("{");

    const lastBrace =
      raw.lastIndexOf("}");

    if (
      firstBrace !== -1 &&
      lastBrace !== -1 &&
      lastBrace > firstBrace
    ) {
      const jsonText =
        raw.slice(
          firstBrace,
          lastBrace + 1
        );

      try {
        parsed =
          JSON.parse(jsonText);
      } catch {
        parsed = null;
      }
    }
  }

  // =======================================================
  // FALLBACK FOR DESCRIPTION RESPONSE
  // =======================================================

  if (
    !parsed ||
    typeof parsed !== "object" ||
    Array.isArray(parsed)
  ) {
    console.log(
      "🟠 AI returned description instead of JSON."
    );

    const description =
      raw;

    const fallback = {
      garment_type:
        extractField(
          description,
          "Garment Type"
        ),

      dominant_color:
        extractField(
          description,
          "Dominant Color"
        ),

      secondary_colors:
        extractListField(
          description,
          "Secondary Colors"
        ),

      pattern:
        extractField(
          description,
          "Pattern"
        ),

      embroidery:
        extractField(
          description,
          "Embroidery"
        ),

      neckline:
        extractField(
          description,
          "Neckline"
        ),

      sleeves:
        extractField(
          description,
          "Sleeves"
        ),

      cuffs:
        extractField(
          description,
          "Cuffs"
        ),

      fit:
        extractField(
          description,
          "Fit"
        ),

      length:
        extractField(
          description,
          "Length"
        ),

      hem:
        extractField(
          description,
          "Hem"
        ),

      border:
        extractField(
          description,
          "Border"
        ),

      dupatta_or_orna:
        extractField(
          description,
          "Dupatta/Orna"
        ) ||
        extractField(
          description,
          "Dupatta / Orna"
        ),

      fabric_appearance:
        extractField(
          description,
          "Fabric Appearance"
        ),

      distinctive_details:
        extractField(
          description,
          "Distinctive Details"
        ),

      visual_fingerprint:
        extractField(
          description,
          "Visual Fingerprint"
        ) ||
        description
    };

    console.log(
      "🟢 FALLBACK CUSTOMER FINGERPRINT:",
      fallback
    );

    return fallback;
  }

  // =======================================================
  // NORMALIZE STRUCTURED JSON
  // =======================================================

  const normalized = {
    garment_type:
      String(
        parsed.garment_type ||
        ""
      ).trim(),

    dominant_color:
      String(
        parsed.dominant_color ||
        ""
      ).trim(),

    secondary_colors:
      Array.isArray(
        parsed.secondary_colors
      )
        ? parsed.secondary_colors
            .map((x) =>
              String(x).trim()
            )
            .filter(Boolean)
        : String(
            parsed.secondary_colors ||
            ""
          )
            .split(",")
            .map((x) =>
              x.trim()
            )
            .filter(Boolean),

    pattern:
      String(
        parsed.pattern ||
        ""
      ).trim(),

    embroidery:
      String(
        parsed.embroidery ||
        ""
      ).trim(),

    neckline:
      String(
        parsed.neckline ||
        ""
      ).trim(),

    sleeves:
      String(
        parsed.sleeves ||
        ""
      ).trim(),

    cuffs:
      String(
        parsed.cuffs ||
        ""
      ).trim(),

    fit:
      String(
        parsed.fit ||
        ""
      ).trim(),

    length:
      String(
        parsed.length ||
        ""
      ).trim(),

    hem:
      String(
        parsed.hem ||
        ""
      ).trim(),

    border:
      String(
        parsed.border ||
        ""
      ).trim(),

    dupatta_or_orna:
      String(
        parsed.dupatta_or_orna ||
        ""
      ).trim(),

    fabric_appearance:
      String(
        parsed.fabric_appearance ||
        ""
      ).trim(),

    distinctive_details:
      String(
        parsed.distinctive_details ||
        ""
      ).trim(),

    visual_fingerprint:
      String(
        parsed.visual_fingerprint ||
        ""
      ).trim()
  };

  // =======================================================
  // FINAL VISUAL FINGERPRINT
  // =======================================================

  if (
    !normalized.visual_fingerprint
  ) {
    normalized.visual_fingerprint =
      [
        normalized.garment_type,
        normalized.dominant_color,
        normalized.pattern,
        normalized.embroidery,
        normalized.neckline,
        normalized.sleeves,
        normalized.cuffs,
        normalized.fit,
        normalized.length,
        normalized.hem,
        normalized.border,
        normalized.dupatta_or_orna,
        normalized.fabric_appearance,
        normalized.distinctive_details
      ]
        .filter(Boolean)
        .join(", ");
  }

  console.log(
    "🟢 NORMALIZED CUSTOMER FINGERPRINT:",
    normalized
  );

  return normalized;
}

  // =======================================================
  // NORMALIZE STRUCTURED JSON
  // =======================================================

  const normalized = {
    garment_type:
      String(
        parsed.garment_type ||
        ""
      ).trim(),

    dominant_color:
      String(
        parsed.dominant_color ||
        ""
      ).trim(),

    secondary_colors:
      Array.isArray(
        parsed.secondary_colors
      )
        ? parsed.secondary_colors
            .map((x) =>
              String(x).trim()
            )
            .filter(Boolean)
        : String(
            parsed.secondary_colors ||
            ""
          )
            .split(",")
            .map((x) =>
              x.trim()
            )
            .filter(Boolean),

    pattern:
      String(
        parsed.pattern ||
        ""
      ).trim(),

    embroidery:
      String(
        parsed.embroidery ||
        ""
      ).trim(),

    neckline:
      String(
        parsed.neckline ||
        ""
      ).trim(),

    sleeves:
      String(
        parsed.sleeves ||
        ""
      ).trim(),

    cuffs:
      String(
        parsed.cuffs ||
        ""
      ).trim(),

    fit:
      String(
        parsed.fit ||
        ""
      ).trim(),

    length:
      String(
        parsed.length ||
        ""
      ).trim(),

    hem:
      String(
        parsed.hem ||
        ""
      ).trim(),

    border:
      String(
        parsed.border ||
        ""
      ).trim(),

    dupatta_or_orna:
      String(
        parsed.dupatta_or_orna ||
        ""
      ).trim(),

    fabric_appearance:
      String(
        parsed.fabric_appearance ||
        ""
      ).trim(),

    distinctive_details:
      String(
        parsed.distinctive_details ||
        ""
      ).trim(),

    visual_fingerprint:
      String(
        parsed.visual_fingerprint ||
        ""
      ).trim(),
  };

  // =======================================================
  // IF JSON FIELDS ARE EMPTY, TRY TO EXTRACT THEM
  // FROM THE VISUAL FINGERPRINT
  // =======================================================

  const description =
    normalized.visual_fingerprint ||
    raw;

  if (
    !normalized.garment_type
  ) {
    normalized.garment_type =
      extractField(
        description,
        "Garment Type"
      );
  }

  if (
    !normalized.dominant_color
  ) {
    normalized.dominant_color =
      extractField(
        description,
        "Dominant Color"
      );
  }

  if (
    normalized.secondary_colors
      .length === 0
  ) {
    normalized.secondary_colors =
      extractListField(
        description,
        "Secondary Colors"
      );
  }

  if (
    !normalized.pattern
  ) {
    normalized.pattern =
      extractField(
        description,
        "Pattern"
      );
  }

  if (
    !normalized.embroidery
  ) {
    normalized.embroidery =
      extractField(
        description,
        "Embroidery"
      );
  }

  if (
    !normalized.neckline
  ) {
    normalized.neckline =
      extractField(
        description,
        "Neckline"
      );
  }

  if (
    !normalized.sleeves
  ) {
    normalized.sleeves =
      extractField(
        description,
        "Sleeves"
      );
  }

  if (
    !normalized.cuffs
  ) {
    normalized.cuffs =
      extractField(
        description,
        "Cuffs"
      );
  }

  if (
    !normalized.fit
  ) {
    normalized.fit =
      extractField(
        description,
        "Fit"
      );
  }

  if (
    !normalized.length
  ) {
    normalized.length =
      extractField(
        description,
        "Length"
      );
  }

  if (
    !normalized.hem
  ) {
    normalized.hem =
      extractField(
        description,
        "Hem"
      );
  }

  if (
    !normalized.border
  ) {
    normalized.border =
      extractField(
        description,
        "Border"
      );
  }

  if (
    !normalized.dupatta_or_orna
  ) {
    normalized.dupatta_or_orna =
      extractField(
        description,
        "Dupatta/Orna"
      ) ||
      extractField(
        description,
        "Dupatta / Orna"
      );
  }

  if (
    !normalized.fabric_appearance
  ) {
    normalized.fabric_appearance =
      extractField(
        description,
        "Fabric Appearance"
      );
  }

  if (
    !normalized.distinctive_details
  ) {
    normalized.distinctive_details =
      extractField(
        description,
        "Distinctive Details"
      );
  }

  // =======================================================
  // BUILD FINGERPRINT IF AI DID NOT PROVIDE ONE
  // =======================================================

  if (
    !normalized.visual_fingerprint
  ) {
    normalized.visual_fingerprint =
      buildVisualFingerprint(
        normalized
      );
  }

  // =======================================================
  // FINAL CLEANUP
  // =======================================================

  normalized.garment_type =
    String(
      normalized.garment_type ||
      ""
    ).trim();

  normalized.dominant_color =
    String(
      normalized.dominant_color ||
      ""
    ).trim();

  normalized.pattern =
    String(
      normalized.pattern ||
      ""
    ).trim();

  normalized.embroidery =
    String(
      normalized.embroidery ||
      ""
    ).trim();

  normalized.neckline =
    String(
      normalized.neckline ||
      ""
    ).trim();

  normalized.sleeves =
    String(
      normalized.sleeves ||
      ""
    ).trim();

  normalized.cuffs =
    String(
      normalized.cuffs ||
      ""
    ).trim();

  normalized.fit =
    String(
      normalized.fit ||
      ""
    ).trim();

  normalized.length =
    String(
      normalized.length ||
      ""
    ).trim();

  normalized.hem =
    String(
      normalized.hem ||
      ""
    ).trim();

  normalized.border =
    String(
      normalized.border ||
      ""
    ).trim();

  normalized.dupatta_or_orna =
    String(
      normalized.dupatta_or_orna ||
      ""
    ).trim();

  normalized.fabric_appearance =
    String(
      normalized.fabric_appearance ||
      ""
    ).trim();

  normalized.distinctive_details =
    String(
      normalized.distinctive_details ||
      ""
    ).trim();

  normalized.visual_fingerprint =
    String(
      normalized.visual_fingerprint ||
      ""
    ).trim();

  console.log(
    "🟢 FINAL CUSTOMER FINGERPRINT:",
    normalized
  );

  return normalized;
}

    // =========================================================
    // HELPER: EXTRACT LABELED FIELD
    // =========================================================

    function extractField(text, label) {
  if (!text || !label) {
    return "";
  }

  text = String(text)
    .replace(/\r/g, "")
    .trim();

  const cleanLabel = String(label)
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // =====================================================
  // FORMAT 1:
  // **Dominant Color:** Orange
  // Dominant Color: Orange
  // =====================================================

  const colonRegex = new RegExp(
    "(?:^|\\n)\\s*\\*{0,2}" +
      cleanLabel +
      "\\*{0,2}\\s*:\\s*([\\s\\S]*?)(?=\\n\\s*\\*{0,2}[^\\n:*]+\\*{0,2}\\s*:|$)",
    "i"
  );

  const colonMatch =
    text.match(colonRegex);

  if (colonMatch) {
    return String(
      colonMatch[1] || ""
    )
      .replace(/\*\*/g, "")
      .replace(/\r/g, "")
      .trim();
  }

  // =====================================================
  // FORMAT 2:
  // The dominant color of the garment is orange.
  // The pattern of the garment is floral.
  // =====================================================

  const sentencePatterns = {
    "garment type":
      /(?:the\s+)?garment(?:\s+type)?\s+(?:is|appears\s+to\s+be)\s+(.+?)(?:\.|\n|$)/i,

    "dominant color":
      /(?:the\s+)?dominant\s+color\s+(?:of\s+the\s+garment\s+)?(?:is|appears\s+to\s+be)\s+(.+?)(?:\.|\n|$)/i,

    "secondary colors":
      /(?:the\s+)?secondary\s+colors\s+(?:of\s+the\s+garment\s+)?(?:are|include)\s+(.+?)(?:\.|\n|$)/i,

    "pattern":
      /(?:the\s+)?pattern\s+(?:of\s+the\s+garment\s+)?(?:is|features|consists\s+of)\s+(.+?)(?:\.|\n|$)/i,

    "embroidery":
      /(?:the\s+)?embroidery\s+(?:on\s+the\s+garment\s+)?(?:is|features|includes)\s+(.+?)(?:\.|\n|$)/i,

    "neckline":
      /(?:the\s+)?neckline\s+(?:of\s+the\s+garment\s+)?(?:is|features)\s+(.+?)(?:\.|\n|$)/i,

    "sleeves":
      /(?:the\s+)?sleeves?\s+(?:of\s+the\s+garment\s+)?(?:are|feature)\s+(.+?)(?:\.|\n|$)/i,

    "cuffs":
      /(?:the\s+)?cuffs?\s+(?:of\s+the\s+garment\s+)?(?:are|feature)\s+(.+?)(?:\.|\n|$)/i,

    "fit":
      /(?:the\s+)?fit\s+(?:of\s+the\s+garment\s+)?(?:is|appears\s+to\s+be)\s+(.+?)(?:\.|\n|$)/i,

    "length":
      /(?:the\s+)?length\s+(?:of\s+the\s+garment\s+)?(?:is|appears\s+to\s+be)\s+(.+?)(?:\.|\n|$)/i,

    "hem":
      /(?:the\s+)?hem\s+(?:of\s+the\s+garment\s+)?(?:is|features)\s+(.+?)(?:\.|\n|$)/i,

    "border":
      /(?:the\s+)?border\s+(?:of\s+the\s+garment\s+)?(?:is|features)\s+(.+?)(?:\.|\n|$)/i,

    "dupatta/orna":
      /(?:the\s+)?dupatta\s*(?:or|\/)\s*orna\s+(?:is|features)\s+(.+?)(?:\.|\n|$)/i,

    "fabric appearance":
      /(?:the\s+)?fabric\s+appearance\s+(?:of\s+the\s+garment\s+)?(?:is|appears\s+to\s+be)\s+(.+?)(?:\.|\n|$)/i,

    "distinctive details":
      /(?:the\s+)?distinctive\s+details\s+(?:of\s+the\s+garment\s+)?(?:include|are)\s+(.+?)(?:\.|\n|$)/i,

    "visual fingerprint":
      /(?:the\s+)?visual\s+fingerprint\s+(?:of\s+the\s+garment\s+)?(?:is|describes)\s+(.+?)(?:\.|\n|$)/i,
  };

  const key =
    String(label)
      .trim()
      .toLowerCase();

  const sentenceRegex =
    sentencePatterns[key];

  if (sentenceRegex) {
    const sentenceMatch =
      text.match(sentenceRegex);

    if (sentenceMatch) {
      return String(
        sentenceMatch[1] || ""
      )
        .replace(/\*\*/g, "")
        .trim();
    }
  }

  return "";
}


function extractListField(text, label) {
  const value =
    extractField(
      text,
      label
    );

  if (!value) {
    return [];
  }

  return value
    .replace(/^(and|or)\s+/i, "")
    .split(/,\s*|\s+and\s+/i)
    .map((item) =>
      item
        .replace(/^[-•]\s*/, "")
        .trim()
    )
    .filter(Boolean);
}

    // =========================================================
    // HELPER: CREATE EMBEDDING TEXT
    // =========================================================

    function fingerprintToText(
      fingerprint,
      product = null
    ) {
      return [
        `Garment type: ${
          fingerprint.garment_type || ""
        }`,

        `Dominant color: ${
          fingerprint.dominant_color || ""
        }`,

        `Secondary colors: ${
          Array.isArray(
            fingerprint.secondary_colors
          )
            ? fingerprint.secondary_colors.join(", ")
            : fingerprint.secondary_colors || ""
        }`,

        `Pattern: ${
          fingerprint.pattern || ""
        }`,

        `Embroidery: ${
          fingerprint.embroidery || ""
        }`,

        `Neckline: ${
          fingerprint.neckline || ""
        }`,

        `Sleeves: ${
          fingerprint.sleeves || ""
        }`,

        `Cuffs: ${
          fingerprint.cuffs || ""
        }`,

        `Fit: ${
          fingerprint.fit || ""
        }`,

        `Length: ${
          fingerprint.length || ""
        }`,

        `Hem: ${
          fingerprint.hem || ""
        }`,

        `Border: ${
          fingerprint.border || ""
        }`,

        `Dupatta or orna: ${
          fingerprint.dupatta_or_orna || ""
        }`,

        `Fabric appearance: ${
          fingerprint.fabric_appearance || ""
        }`,

        `Distinctive details: ${
          fingerprint.distinctive_details || ""
        }`,

        `Visual fingerprint: ${
          fingerprint.visual_fingerprint || ""
        }`,

        product
          ? `Product name: ${
              product.name || ""
            }`
          : "",

        product
          ? `Product details: ${
              product.details || ""
            }`
          : "",

        product
          ? `Product color: ${
              product.color || ""
            }`
          : "",
      ]
        .filter(Boolean)
        .join(". ");
    }

    // =========================================================
    // HELPER: NORMALIZE TEXT
    // =========================================================

    function normalizeText(value) {
      return String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }

    // =========================================================
    // HELPER: PARSE PRODUCT FINGERPRINT
    // =========================================================

    function parseMarkdownFingerprint(text) {
      const result = {};

      if (!text) {
        return result;
      }

      const source =
        typeof text === "string"
          ? text
          : JSON.stringify(text);

      function cleanValue(value) {
        return String(value || "")
          .replace(/^["']|["']$/g, "")
          .replace(/\*\*/g, "")
          .replace(/^\s*[-*•]\s*/, "")
          .trim();
      }

      function extractStringField(key) {
        const regex = new RegExp(
          `"${key}"\\s*:\\s*"([^"]*)"`,
          "i"
        );

        const match =
          source.match(regex);

        return match
          ? cleanValue(match[1])
          : "";
      }

      function extractArrayField(key) {
        const regex = new RegExp(
          `"${key}"\\s*:\\s*\\[([^\\]]*)\\]`,
          "i"
        );

        const match =
          source.match(regex);

        if (!match) {
          return [];
        }

        return match[1]
          .split(",")
          .map((item) =>
            cleanValue(item)
          )
          .filter(Boolean);
      }

      const jsonFields = [
        "garment_type",
        "dominant_color",
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
      ];

      for (const key of jsonFields) {
        const value =
          extractStringField(key);

        if (value) {
          result[key] = value;
        }
      }

      const secondaryColors =
        extractArrayField(
          "secondary_colors"
        );

      if (secondaryColors.length > 0) {
        result.secondary_colors =
          secondaryColors;
      }

      // =====================================================
      // MARKDOWN / BULLET FALLBACK
      // =====================================================

      const markdownFields = {
        garment_type: [
          "Garment Type",
          "Garment",
        ],

        dominant_color: [
          "Dominant Color",
          "Main Color",
        ],

        secondary_colors: [
          "Secondary Colors",
          "Secondary Color",
        ],

        pattern: [
          "Pattern",
        ],

        embroidery: [
          "Embroidery",
        ],

        neckline: [
          "Neckline",
        ],

        sleeves: [
          "Sleeves",
          "Sleeve Style",
        ],

        cuffs: [
          "Cuffs",
        ],

        fit: [
          "Fit",
          "Silhouette",
        ],

        length: [
          "Length",
          "Garment Length",
        ],

        hem: [
          "Hem",
          "Hem Design",
        ],

        border: [
          "Border",
          "Borders",
        ],

        dupatta_or_orna: [
          "Dupatta/Orna",
          "Dupatta/Orna Details",
          "Dupatta or Orna",
          "Scarf/Orna",
        ],

        fabric_appearance: [
          "Fabric Appearance",
          "Fabric",
        ],

        distinctive_details: [
          "Distinctive Details",
          "Decorative Details",
        ],

        visual_fingerprint: [
          "Visual Fingerprint",
        ],
      };

      for (
        const [key, labels]
        of Object.entries(markdownFields)
      ) {
        if (result[key]) {
          continue;
        }

        for (const label of labels) {
          const escapedLabel =
            label.replace(
              /[.*+?^${}()|[\]\\]/g,
              "\\$&"
            );

          const regex =
            new RegExp(
              `(?:^|\\n)\\s*(?:[-*•]\\s*)?(?:\\*\\*)?${escapedLabel}(?:\\*\\*)?\\s*:\\s*(.+?)(?=\\n|$)`,
              "im"
            );

          const match =
            source.match(regex);

          if (match) {
            const value =
              cleanValue(match[1]);

            if (value) {
              result[key] = value;
              break;
            }
          }
        }
      }

      if (
        typeof result.secondary_colors ===
        "string"
      ) {
        result.secondary_colors =
          result.secondary_colors
            .split(",")
            .map((x) =>
              cleanValue(x)
            )
            .filter(Boolean);
      }

      return result;
    }

    // =========================================================
    // HELPER: GET CANDIDATE FINGERPRINT
    // =========================================================

    function getCandidateFingerprint(
      metadata
    ) {
      metadata =
        metadata || {};

      const parsed =
        parseMarkdownFingerprint(
          metadata.visual_fingerprint ||
            ""
        );

      return {
        garment_type:
          metadata.garment_type ||
          parsed.garment_type ||
          "",

        dominant_color:
          metadata.dominant_color ||
          parsed.dominant_color ||
          "",

        secondary_colors:
          metadata.secondary_colors ||
          parsed.secondary_colors ||
          "",

        pattern:
          metadata.pattern ||
          parsed.pattern ||
          "",

        embroidery:
          metadata.embroidery ||
          parsed.embroidery ||
          "",

        neckline:
          metadata.neckline ||
          parsed.neckline ||
          "",

        sleeves:
          metadata.sleeves ||
          parsed.sleeves ||
          "",

        cuffs:
          metadata.cuffs ||
          parsed.cuffs ||
          "",

        fit:
          metadata.fit ||
          parsed.fit ||
          "",

        length:
          metadata.length ||
          parsed.length ||
          "",

        hem:
          metadata.hem ||
          parsed.hem ||
          "",

        border:
          metadata.border ||
          parsed.border ||
          "",

        dupatta_or_orna:
          metadata.dupatta_or_orna ||
          parsed.dupatta_or_orna ||
          "",

        fabric_appearance:
          metadata.fabric_appearance ||
          parsed.fabric_appearance ||
          "",

        distinctive_details:
          metadata.distinctive_details ||
          parsed.distinctive_details ||
          "",

        visual_fingerprint:
          metadata.visual_fingerprint ||
          parsed.visual_fingerprint ||
          "",
      };
    }

    // =========================================================
    // HELPER: TEXT SIMILARITY
    // =========================================================

    function similarity(a, b) {
      const textA =
        normalizeText(a);

      const textB =
        normalizeText(b);

      if (!textA || !textB) {
        return 0;
      }

      if (textA === textB) {
        return 1;
      }

      if (
        textA.includes(textB) ||
        textB.includes(textA)
      ) {
        return 0.9;
      }

      const wordsA =
        new Set(
          textA
            .split(" ")
            .filter(
              (w) => w.length >= 3
            )
        );

      const wordsB =
        new Set(
          textB
            .split(" ")
            .filter(
              (w) => w.length >= 3
            )
        );

      if (
        wordsA.size === 0 ||
        wordsB.size === 0
      ) {
        return 0;
      }

      let common = 0;

      for (const word of wordsA) {
        if (wordsB.has(word)) {
          common++;
        }
      }

      return (
        common /
        Math.max(
          wordsA.size,
          wordsB.size
        )
      );
    }

    // =========================================================
    // HELPER: COLOR NORMALIZATION
    // =========================================================

    function normalizeColor(value) {
      const text =
        normalizeText(value);

      if (!text) {
        return "";
      }

      const colorGroups = [
        {
          name: "orange",
          words: [
            "orange",
            "peach",
            "coral",
            "rust",
            "tangerine",
          ],
        },

        {
          name: "red",
          words: [
            "red",
            "maroon",
            "burgundy",
            "crimson",
            "wine",
            "brick",
          ],
        },

        {
          name: "pink",
          words: [
            "pink",
            "rose",
            "magenta",
            "fuchsia",
          ],
        },

        {
          name: "purple",
          words: [
            "purple",
            "violet",
            "lavender",
            "plum",
            "mauve",
          ],
        },

        {
          name: "blue",
          words: [
            "blue",
            "navy",
            "royal blue",
            "sky blue",
            "cyan",
          ],
        },

        {
          name: "teal",
          words: [
            "teal",
            "turquoise",
            "aqua",
          ],
        },

        {
          name: "green",
          words: [
            "green",
            "olive",
            "mint",
            "emerald",
            "lime",
          ],
        },

        {
          name: "yellow",
          words: [
            "yellow",
            "mustard",
            "lemon",
          ],
        },

        {
          name: "gold",
          words: [
            "gold",
            "golden",
            "metallic gold",
          ],
        },

        {
          name: "white",
          words: [
            "white",
            "cream",
            "ivory",
            "off white",
            "offwhite",
          ],
        },

        {
          name: "black",
          words: [
            "black",
            "jet black",
          ],
        },

        {
          name: "brown",
          words: [
            "brown",
            "chocolate",
            "coffee",
            "tan",
          ],
        },

        {
          name: "beige",
          words: [
            "beige",
            "nude",
            "sand",
          ],
        },

        {
          name: "gray",
          words: [
            "gray",
            "grey",
            "silver",
          ],
        },
      ];

      // Longest / more specific names first
      const sortedGroups =
        colorGroups
          .map((group) => ({
            ...group,
            words:
              [...group.words].sort(
                (a, b) =>
                  b.length - a.length
              ),
          }));

      for (
        const group of sortedGroups
      ) {
        for (
          const word of group.words
        ) {
          const normalizedWord =
            normalizeText(word);

          if (
            text === normalizedWord ||
            text.includes(
              normalizedWord
            )
          ) {
            return group.name;
          }
        }
      }

      return text;
    }

    // =========================================================
    // HELPER: COLOR COMPATIBILITY
    // =========================================================

    function colorSimilarity(
      customerColor,
      candidateColor
    ) {
      const a =
        normalizeColor(
          customerColor
        );

      const b =
        normalizeColor(
          candidateColor
        );

      if (!a || !b) {
        return 0;
      }

      if (a === b) {
        return 1;
      }

      // Related colors are NOT exact colors.
      // They receive only a partial similarity score.

      const relatedGroups = [
        ["orange", "yellow", "gold"],
        ["red", "pink"],
        ["purple", "pink"],
        ["blue", "teal"],
        ["green", "teal"],
        ["white", "gray"],
        ["black", "gray"],
        ["brown", "orange"],
        ["brown", "beige"],
      ];

      for (
        const group of relatedGroups
      ) {
        if (
          group.includes(a) &&
          group.includes(b)
        ) {
          return 0.45;
        }
      }

      return 0;
    }

    // =========================================================
    // HELPER: FINGERPRINT SCORE
    // =========================================================

    function calculateFingerprintScore(
      customer,
      metadata
    ) {
      const candidate =
        getCandidateFingerprint(
          metadata
        );

      const fields = [
        ["garment_type", 0.16],
        ["dominant_color", 0.25],
        ["pattern", 0.15],
        ["embroidery", 0.10],
        ["neckline", 0.07],
        ["sleeves", 0.07],
        ["cuffs", 0.03],
        ["fit", 0.03],
        ["length", 0.03],
        ["hem", 0.02],
        ["border", 0.02],
        ["dupatta_or_orna", 0.02],
        ["fabric_appearance", 0.02],
        ["distinctive_details", 0.03],
      ];

      let total = 0;
      let usedWeight = 0;

      for (
        const [field, weight]
        of fields
      ) {
        const customerValue =
          customer[field];

        const candidateValue =
          candidate[field];

        if (
          !customerValue ||
          !candidateValue
        ) {
          continue;
        }

        let fieldScore =
          similarity(
            customerValue,
            candidateValue
          );

        if (
          field ===
          "dominant_color"
        ) {
          fieldScore =
            colorSimilarity(
              customerValue,
              candidateValue
            );
        }

        total +=
          fieldScore * weight;

        usedWeight += weight;
      }

      let structuredScore = 0;

      if (usedWeight > 0) {
        structuredScore =
          total / usedWeight;
      }

      // =====================================================
      // FULL TEXT SIMILARITY
      // =====================================================

      const customerFullText =
        normalizeText(
          [
            customer.garment_type,
            customer.dominant_color,
            Array.isArray(
              customer.secondary_colors
            )
              ? customer.secondary_colors.join(
                  " "
                )
              : customer.secondary_colors,
            customer.pattern,
            customer.embroidery,
            customer.neckline,
            customer.sleeves,
            customer.cuffs,
            customer.fit,
            customer.length,
            customer.hem,
            customer.border,
            customer.dupatta_or_orna,
            customer.fabric_appearance,
            customer.distinctive_details,
            customer.visual_fingerprint,
          ].join(" ")
        );

      const candidateFullText =
        normalizeText(
          [
            candidate.garment_type,
            candidate.dominant_color,
            Array.isArray(
              candidate.secondary_colors
            )
              ? candidate.secondary_colors.join(
                  " "
                )
              : candidate.secondary_colors,
            candidate.pattern,
            candidate.embroidery,
            candidate.neckline,
            candidate.sleeves,
            candidate.cuffs,
            candidate.fit,
            candidate.length,
            candidate.hem,
            candidate.border,
            candidate.dupatta_or_orna,
            candidate.fabric_appearance,
            candidate.distinctive_details,
            candidate.visual_fingerprint,
          ].join(" ")
        );

      const fullTextScore =
        similarity(
          customerFullText,
          candidateFullText
        );

      // =====================================================
      // FINAL SCORE
      //
      // Do not allow missing fields to artificially create
      // a perfect score.
      // =====================================================

      let finalScore = 0;

      if (
        usedWeight >= 0.50
      ) {
        finalScore =
          structuredScore * 0.80 +
          fullTextScore * 0.20;
      } else if (
        usedWeight >= 0.30
      ) {
        finalScore =
          structuredScore * 0.70 +
          fullTextScore * 0.30;
      } else {
        finalScore =
          structuredScore * 0.40 +
          fullTextScore * 0.60;
      }

      // =====================================================
      // HARD COLOR PENALTY
      // =====================================================

      const customerColor =
        normalizeColor(
          customer.dominant_color
        );

      const candidateColor =
        normalizeColor(
          candidate.dominant_color
        );

      let colorMatch =
        colorSimilarity(
          customer.dominant_color,
          candidate.dominant_color
        );

      if (
        customerColor &&
        candidateColor
      ) {
        if (
          customerColor !==
          candidateColor
        ) {
          if (
            colorMatch === 0
          ) {
            // Completely different color.
            finalScore = 0;
          } else {
            // Related but not identical.
            finalScore *= 0.75;
          }
        }
      }

      finalScore =
        Math.min(
          Math.max(
            finalScore,
            0
          ),
          1
        );

      console.log(
        "🟡 FINGERPRINT SCORE DEBUG:",
        {
          structuredScore,
          fullTextScore,
          usedWeight,
          finalScore,
          customerColor,
          candidateColor,
          colorMatch,
          candidateGarment:
            candidate.garment_type,
          candidatePattern:
            candidate.pattern,
          candidateEmbroidery:
            candidate.embroidery,
        }
      );

      return {
        score:
          Number(
            finalScore.toFixed(6)
          ),

        colorMatch:
          Number(
            colorMatch.toFixed(6)
          ),

        candidate,
      };
    }

    // =========================================================
    // INDEX SUPABASE PRODUCTS
    // =========================================================

    if (
      url.pathname ===
        "/api/index-products" &&
      request.method === "POST"
    ) {
      try {
        const supabaseUrl =
          env.SUPABASE_URL;

        const supabaseKey =
          env.SUPABASE_SERVICE_ROLE_KEY;

        if (
          !supabaseUrl ||
          !supabaseKey
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

        const response =
          await fetch(
            `${supabaseUrl}/rest/v1/products?select=id,name,details,color,size,price,image_url,stock`,
            {
              headers: {
                apikey:
                  supabaseKey,

                Authorization:
                  `Bearer ${supabaseKey}`,
              },
            }
          );

        if (!response.ok) {
          const errorText =
            await response.text();

          return Response.json(
            {
              success: false,
              error:
                `Supabase request failed: ${response.status}`,
              details:
                errorText,
            },
            { status: 500 }
          );
        }

        const products =
          await response.json();

        if (
          !Array.isArray(
            products
          ) ||
          products.length === 0
        ) {
          return Response.json({
            success: true,
            message:
              "No products found.",
            indexed: 0,
          });
        }

                const vectors = [];
        const failedProducts = [];

        for (
          const product of products
        ) {
          try {
            if (
              !product.image_url
            ) {
              failedProducts.push({
                id: product.id,
                reason:
                  "No image_url",
              });

              continue;
            }

            // =================================================
            // DOWNLOAD PRODUCT IMAGE
            // =================================================

            const imageResponse =
              await fetch(
                product.image_url
              );

            if (
              !imageResponse.ok
            ) {
              failedProducts.push({
                id: product.id,
                reason:
                  `Image download failed: ${imageResponse.status}`,
              });

              continue;
            }

            const imageBytes =
              await imageResponse.arrayBuffer();

            // =================================================
            // ANALYZE PRODUCT IMAGE
            // =================================================

            const fingerprint =
              await analyzeDressImage(
                imageBytes,
                env
              );

            if (!fingerprint) {
              failedProducts.push({
                id: product.id,
                reason:
                  "Vision analysis failed",
              });

              continue;
            }

            // =================================================
            // DEBUG PRODUCT FINGERPRINT
            // =================================================

            console.log(
              "🟢 PRODUCT FINGERPRINT:",
              {
                product_id:
                  product.id,

                garment_type:
                  fingerprint.garment_type,

                dominant_color:
                  fingerprint.dominant_color,

                secondary_colors:
                  fingerprint.secondary_colors,

                pattern:
                  fingerprint.pattern,

                embroidery:
                  fingerprint.embroidery,

                neckline:
                  fingerprint.neckline,

                sleeves:
                  fingerprint.sleeves,

                cuffs:
                  fingerprint.cuffs,

                fit:
                  fingerprint.fit,

                length:
                  fingerprint.length,

                hem:
                  fingerprint.hem,

                border:
                  fingerprint.border,

                dupatta_or_orna:
                  fingerprint.dupatta_or_orna,

                fabric_appearance:
                  fingerprint.fabric_appearance,

                distinctive_details:
                  fingerprint.distinctive_details,

                visual_fingerprint:
                  fingerprint.visual_fingerprint,
              }
            );

            // =================================================
            // CREATE VISUAL EMBEDDING
            // =================================================

            const visualText =
              fingerprintToText(
                fingerprint,
                product
              );

            const embeddingResult =
              await env.AI.run(
                "@cf/baai/bge-base-en-v1.5",
                {
                  text: [
                    visualText,
                  ],
                }
              );

            const embedding =
              embeddingResult
                ?.data?.[0];

            if (
              !embedding ||
              embedding.length !== 768
            ) {
              failedProducts.push({
                id: product.id,
                reason:
                  "Invalid 768-dimensional embedding",
              });

              continue;
            }

            // =================================================
            // STORE COMPLETE VISUAL FINGERPRINT
            // =================================================

            const vectorMetadata = {
              product_id:
                product.id,

              name:
                product.name ||
                "",

              details:
                product.details ||
                "",

              color:
                product.color ||
                "",

              size:
                product.size ||
                "",

              price:
                product.price ??
                null,

              stock:
                product.stock ??
                null,

              image_url:
                product.image_url ||
                "",

              garment_type:
                String(
                  fingerprint.garment_type ||
                  ""
                ).trim(),

              dominant_color:
                String(
                  fingerprint.dominant_color ||
                  ""
                ).trim(),

              secondary_colors:
                Array.isArray(
                  fingerprint.secondary_colors
                )
                  ? fingerprint.secondary_colors
                      .map((color) =>
                        String(
                          color
                        ).trim()
                      )
                      .filter(Boolean)
                      .join(", ")
                  : String(
                      fingerprint.secondary_colors ||
                      ""
                    ).trim(),

              pattern:
                String(
                  fingerprint.pattern ||
                  ""
                ).trim(),

              embroidery:
                String(
                  fingerprint.embroidery ||
                  ""
                ).trim(),

              neckline:
                String(
                  fingerprint.neckline ||
                  ""
                ).trim(),

              sleeves:
                String(
                  fingerprint.sleeves ||
                  ""
                ).trim(),

              cuffs:
                String(
                  fingerprint.cuffs ||
                  ""
                ).trim(),

              fit:
                String(
                  fingerprint.fit ||
                  ""
                ).trim(),

              length:
                String(
                  fingerprint.length ||
                  ""
                ).trim(),

              hem:
                String(
                  fingerprint.hem ||
                  ""
                ).trim(),

              border:
                String(
                  fingerprint.border ||
                  ""
                ).trim(),

              dupatta_or_orna:
                String(
                  fingerprint.dupatta_or_orna ||
                  ""
                ).trim(),

              fabric_appearance:
                String(
                  fingerprint.fabric_appearance ||
                  ""
                ).trim(),

              distinctive_details:
                String(
                  fingerprint.distinctive_details ||
                  ""
                ).trim(),

              visual_fingerprint:
                String(
                  fingerprint.visual_fingerprint ||
                  ""
                ).trim(),
            };

            // =================================================
            // DEBUG EXACT VECTOR METADATA
            // =================================================

            console.log(
              "🟣 VECTOR METADATA:",
              vectorMetadata
            );

            vectors.push({
              id:
                product.id,

              values:
                embedding,

              metadata:
                vectorMetadata,
            });
          } catch (
            productError
          ) {
            console.error(
              "Product indexing error:",
              product.id,
              productError
            );

            failedProducts.push({
              id: product.id,
              reason:
                productError instanceof
                Error
                  ? productError.message
                  : "Unknown error",
            });
          }
        }

        // =====================================================
        // VECTORIZE UPSERT
        // =====================================================

        console.log(
          "🔵 TOTAL VECTORS READY:",
          vectors.length
        );

        console.log(
          "🔵 VECTOR IDS:",
          vectors.map(
            (vector) =>
              vector.id
          )
        );

        await env.VECTORIZE.upsert(
          vectors
        );

        if (
          vectors.length === 0
        ) {
          return Response.json(
            {
              success: false,
              error:
                "Could not generate any visual product embeddings.",
              failed_products:
                failedProducts,
            },
            { status: 500 }
          );
        }

        // =================================================
        // UPSERT INTO VECTORIZE
        // =================================================

        await env.VECTORIZE.upsert(
          vectors
        );

        return Response.json({
          success: true,

          message:
            "Visual product indexing completed.",

          products_found:
            products.length,

          vectors_indexed:
            vectors.length,

          failed_products:
            failedProducts,
        });
      } catch (error) {
        console.error(
          "Product indexing error:",
          error
        );

        return Response.json(
          {
            success: false,
            error:
              error instanceof Error
                ? error.message
                : "Product indexing failed.",
          },
          { status: 500 }
        );
      }
    }

    // =========================================================
    // STRICT EXACT PRODUCT VISUAL SEARCH
    // =========================================================

    if (
      url.pathname ===
        "/api/visual-search" &&
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
                "Please upload a dress image.",
            },
            { status: 400 }
          );
        }

        const imageBuffer =
          await image.arrayBuffer();

        // =====================================================
        // 1. ANALYZE CUSTOMER IMAGE
        // =====================================================

        const fingerprint =
          await analyzeDressImage(
            imageBuffer,
            env
          );

        if (!fingerprint) {
          return Response.json(
            {
              success: false,
              error:
                "AI could not analyze the dress image.",
            },
            { status: 500 }
          );
        }

        console.log(
          "CUSTOMER FINGERPRINT:",
          fingerprint
        );

        // =====================================================
        // 2. CREATE CUSTOMER VISUAL EMBEDDING
        // =====================================================

        const queryText =
          exactVisualText(
            fingerprint
          );

        const embeddingResult =
          await env.AI.run(
            "@cf/baai/bge-base-en-v1.5",
            {
              text: [
                queryText,
              ],
            }
          );

        const queryVector =
          embeddingResult?.data?.[0];

        if (
          !queryVector ||
          queryVector.length !== 768
        ) {
          return Response.json(
            {
              success: false,
              error:
                "Could not generate visual search embedding.",
            },
            { status: 500 }
          );
        }

        // =====================================================
        // 3. VECTOR SEARCH
        // =====================================================

        const searchResult =
          await env.VECTORIZE.query(
            queryVector,
            {
              topK: 10,
              returnMetadata: true,
            }
          );

        const candidates =
          searchResult?.matches ||
          [];

        console.log(
          "VECTOR CANDIDATES:",
          candidates
        );
        console.log(
  "VECTOR CANDIDATES COUNT:",
  candidates.length
);
console.log(
  "VERIFICATION CANDIDATES:",
  verificationCandidates
);
console.log(
  "VERIFICATION CANDIDATES COUNT:",
  verificationCandidates.length
);

        if (
          candidates.length === 0
        ) {
          return Response.json({
            success: true,
            exact_match: false,
            description:
              fingerprint.visual_fingerprint ||
              "",
            confidence: 0,
            customer_fingerprint:
              fingerprint,
            matches: [],
          });
        }

        // =====================================================
        // 4. VECTOR CANDIDATE FILTER
        // =====================================================

        const VECTOR_VERIFY_THRESHOLD =
          0.80;

        const verificationCandidates =
          candidates.filter(
            (match) =>
              Number(
                match.score || 0
              ) >=
              VECTOR_VERIFY_THRESHOLD
          );

        console.log(
          "VERIFICATION CANDIDATES:",
          verificationCandidates
        );

        if (
          verificationCandidates.length ===
          0
        ) {
          return Response.json({
            success: true,
            exact_match: false,
            description:
              fingerprint.visual_fingerprint ||
              "",
            confidence: 0,
            customer_fingerprint:
              fingerprint,
            matches: [],
          });
        }

        // =====================================================
        // 5. FINGERPRINT VERIFICATION
        // =====================================================

        const verifiedCandidates =
          verificationCandidates.map(
            (candidate) => {
              const metadata =
                candidate.metadata ||
                {};

              const fingerprintResult =
                calculateFingerprintScore(
                  fingerprint,
                  metadata
                );

              const vectorScore =
                Number(
                  candidate.score || 0
                );

              const fingerprintScore =
                Number(
                  fingerprintResult.score ||
                  0
                );

              const colorMatch =
                Number(
                  fingerprintResult.colorMatch ||
                  0
                );

              let combinedScore =
                vectorScore * 0.60 +
                fingerprintScore * 0.40;

              // =================================================
              // COLOR CHECK
              // =================================================

              const customerColor =
                normalizeColor(
                  fingerprint.dominant_color
                );

              const candidateFingerprint =
                getCandidateFingerprint(
                  metadata
                );

              const candidateColor =
                normalizeColor(
                  candidateFingerprint.dominant_color
                );

              let colorCompatible =
                true;

              if (
                customerColor &&
                candidateColor
              ) {
                const colorSimilarityScore =
                  colorSimilarity(
                    fingerprint.dominant_color,
                    candidateFingerprint.dominant_color
                  );

                // Related colors are NOT considered exact.
                colorCompatible =
                  colorSimilarityScore >=
                  1;
              }

              // Completely different color =
              // candidate is rejected.
              if (
                !colorCompatible
              ) {
                combinedScore = 0;
              }

              combinedScore =
                Math.min(
                  Math.max(
                    combinedScore,
                    0
                  ),
                  1
                );

              return {
                ...candidate,

                fingerprint_score:
                  Number(
                    fingerprintScore.toFixed(
                      6
                    )
                  ),

                color_match:
                  Number(
                    colorMatch.toFixed(
                      6
                    )
                  ),

                combined_score:
                  Number(
                    combinedScore.toFixed(
                      6
                    )
                  ),

                color_compatible:
                  colorCompatible,
              };
            }
          );

        // =====================================================
        // 6. SORT VERIFIED CANDIDATES
        // =====================================================

        verifiedCandidates.sort(
          (a, b) =>
            Number(
              b.combined_score || 0
            ) -
            Number(
              a.combined_score || 0
            )
        );

        console.log(
          "VERIFIED CANDIDATES:",
          verifiedCandidates
        );

        // =====================================================
        // 7. FIND BEST CANDIDATE
        // =====================================================

        const bestMatch =
          verifiedCandidates.length >
          0
            ? verifiedCandidates[0]
            : null;

        if (!bestMatch) {
          return Response.json({
            success: true,
            exact_match: false,
            description:
              fingerprint.visual_fingerprint ||
              "",
            confidence: 0,
            customer_fingerprint:
              fingerprint,
            matches: [],
          });
        }

        const vectorScore =
          Number(
            bestMatch.score || 0
          );

        const fingerprintScore =
          Number(
            bestMatch.fingerprint_score ||
            0
          );

        const combinedScore =
          Number(
            bestMatch.combined_score ||
            0
          );

        const colorMatch =
          Number(
            bestMatch.color_match ||
            0
          );

        const colorCompatible =
          bestMatch.color_compatible ===
          true;

        const candidateFingerprint =
          getCandidateFingerprint(
            bestMatch.metadata ||
              {}
          );

        // =====================================================
        // 8. ADDITIONAL EXACT FIELD CHECKS
        // =====================================================

        const garmentTypeScore =
          similarity(
            fingerprint.garment_type,
            candidateFingerprint.garment_type
          );

        const patternScore =
          similarity(
            fingerprint.pattern,
            candidateFingerprint.pattern
          );

        const embroideryScore =
          similarity(
            fingerprint.embroidery,
            candidateFingerprint.embroidery
          );

        const distinctiveScore =
          similarity(
            fingerprint.distinctive_details,
            candidateFingerprint.distinctive_details
          );

        console.log(
          "BEST VECTOR SCORE:",
          vectorScore
        );

        console.log(
          "BEST FINGERPRINT SCORE:",
          fingerprintScore
        );

        console.log(
          "BEST COLOR MATCH:",
          colorMatch
        );

        console.log(
          "BEST COMBINED SCORE:",
          combinedScore
        );

        console.log(
          "COLOR COMPATIBLE:",
          colorCompatible
        );

        console.log(
          "GARMENT TYPE SCORE:",
          garmentTypeScore
        );

        console.log(
          "PATTERN SCORE:",
          patternScore
        );

        console.log(
          "EMBROIDERY SCORE:",
          embroideryScore
        );

        console.log(
          "DISTINCTIVE SCORE:",
          distinctiveScore
        );

        // =====================================================
        // 9. STRICT EXACT MATCH THRESHOLDS
        // =====================================================

        const EXACT_VECTOR_THRESHOLD =
          0.85;

        const EXACT_FINGERPRINT_THRESHOLD =
          0.72;

        const EXACT_COLOR_THRESHOLD =
          1.0;

        const EXACT_COMBINED_THRESHOLD =
          0.80;

        const EXACT_GARMENT_THRESHOLD =
          0.70;

        // Pattern / embroidery may sometimes be empty,
        // therefore only enforce them when both sides
        // contain information.

        const patternRequired =
          Boolean(
            fingerprint.pattern &&
            candidateFingerprint.pattern
          );

        const embroideryRequired =
          Boolean(
            fingerprint.embroidery &&
            candidateFingerprint.embroidery
          );

        const distinctiveRequired =
          Boolean(
            fingerprint.distinctive_details &&
            candidateFingerprint.distinctive_details
          );

        const patternCompatible =
          !patternRequired ||
          patternScore >= 0.60;

        const embroideryCompatible =
          !embroideryRequired ||
          embroideryScore >= 0.55;

        const distinctiveCompatible =
          !distinctiveRequired ||
          distinctiveScore >= 0.45;

        const isExact =
          vectorScore >=
            EXACT_VECTOR_THRESHOLD &&

          fingerprintScore >=
            EXACT_FINGERPRINT_THRESHOLD &&

          colorMatch >=
            EXACT_COLOR_THRESHOLD &&

          combinedScore >=
            EXACT_COMBINED_THRESHOLD &&

          colorCompatible &&

          garmentTypeScore >=
            EXACT_GARMENT_THRESHOLD &&

          patternCompatible &&

          embroideryCompatible &&

          distinctiveCompatible;

        console.log(
          "FINAL EXACT DECISION:",
          {
            isExact,
            vectorScore,
            fingerprintScore,
            colorMatch,
            combinedScore,
            colorCompatible,
            garmentTypeScore,
            patternScore,
            embroideryScore,
            distinctiveScore,
          }
        );

        // =====================================================
        // 10. NO EXACT PRODUCT
        //
        // NEVER return similar products.
        // =====================================================

        if (!isExact) {
          console.log(
            "NO EXACT PRODUCT FOUND"
          );

          return Response.json({
            success: true,

            exact_match: false,

            description:
              fingerprint.visual_fingerprint ||
              "",

            confidence:
              Number(
                combinedScore.toFixed(
                  6
                )
              ),

            customer_fingerprint:
              fingerprint,

            matches: [],
          });
        }

        // =====================================================
        // 11. EXACT PRODUCT FOUND
        // =====================================================

        console.log(
          "EXACT PRODUCT FOUND:",
          bestMatch.id
        );

        const exactProduct = {
          id:
            bestMatch.id,

          score:
            Number(
              bestMatch.score || 0
            ),

          fingerprint_score:
            Number(
              bestMatch.fingerprint_score ||
              0
            ),

          color_match:
            Number(
              bestMatch.color_match ||
              0
            ),

          combined_score:
            Number(
              bestMatch.combined_score ||
              0
            ),

          metadata:
            bestMatch.metadata ||
            {},
        };

        return Response.json({
          success: true,

          exact_match: true,

          description:
            fingerprint.visual_fingerprint ||
            "",

          confidence:
            Number(
              combinedScore.toFixed(
                6
              )
            ),

          customer_fingerprint:
            fingerprint,

          matches: [
            exactProduct,
          ],
        });

      } catch (error) {
        console.error(
          "Visual search error:",
          error
        );

        return Response.json(
          {
            success: false,
            error:
              error instanceof Error
                ? error.message
                : "Visual search failed.",
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