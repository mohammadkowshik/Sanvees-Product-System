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

    function similarity(a, b) {
      const A = normalizeText(a);
      const B = normalizeText(b);

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

      let common = 0;

      for (const word of wordsA) {
        if (wordsB.has(word)) {
          common++;
        }
      }

      return common / Math.max(wordsA.size, wordsB.size);
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
        "(?:^|\\n)\\s*(?:[-*•]\\s*)?\\*{0,2}" +
          escaped +
          "\\*{0,2}\\s*:\\s*(.+?)(?=\\n|$)",
        "im"
      );

      const match = source.match(regex);

      if (!match) return "";

      return cleanText(
        match[1]
          .replace(/\*\*/g, "")
          .replace(/^[-*•]\s*/, "")
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

      const result = {
        garment_type: cleanText(parsed?.garment_type),

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

        pattern: cleanText(parsed?.pattern),

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

        visual_fingerprint: cleanText(
          parsed?.visual_fingerprint
        ),
      };

      // =========================================================
      // MARKDOWN FALLBACK
      // =========================================================

      if (!result.garment_type) {
        result.garment_type = extractField(
          source,
          "Garment Type"
        );
      }

      if (!result.dominant_color) {
        result.dominant_color = extractField(
          source,
          "Dominant Color"
        );
      }

      if (!result.secondary_colors.length) {
        result.secondary_colors =
          extractListField(
            source,
            "Secondary Colors"
          );
      }

      if (!result.pattern) {
        result.pattern = extractField(
          source,
          "Pattern"
        );
      }

      if (!result.embroidery) {
        result.embroidery = extractField(
          source,
          "Embroidery"
        );
      }

      if (!result.neckline) {
        result.neckline = extractField(
          source,
          "Neckline"
        );
      }

      if (!result.sleeves) {
        result.sleeves = extractField(
          source,
          "Sleeves"
        );
      }

      if (!result.cuffs) {
        result.cuffs = extractField(
          source,
          "Cuffs"
        );
      }

      if (!result.fit) {
        result.fit = extractField(
          source,
          "Fit"
        );
      }

      if (!result.length) {
        result.length = extractField(
          source,
          "Length"
        );
      }

      if (!result.hem) {
        result.hem = extractField(
          source,
          "Hem"
        );
      }

      if (!result.border) {
        result.border = extractField(
          source,
          "Border"
        );
      }

      if (!result.dupatta_or_orna) {
        result.dupatta_or_orna =
          extractField(
            source,
            "Dupatta/Orna"
          ) ||
          extractField(
            source,
            "Dupatta/Orna Details"
          ) ||
          extractField(
            source,
            "Dupatta or Orna"
          );
      }

      if (!result.fabric_appearance) {
        result.fabric_appearance =
          extractField(
            source,
            "Fabric Appearance"
          );
      }

      if (!result.distinctive_details) {
        result.distinctive_details =
          extractField(
            source,
            "Distinctive Details"
          );
      }

      if (!result.visual_fingerprint) {
        result.visual_fingerprint =
          extractField(
            source,
            "Visual Fingerprint"
          ) || source;
      }

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
You are a STRICT fashion product identification AI.

Your ONLY task is to analyze the CLOTHING PRODUCT visible in the image.

IMPORTANT:

IGNORE completely:

- person's face
- person's body
- skin
- hair
- hands
- room
- wall
- furniture
- plants
- floor
- background
- photography style
- camera
- lighting
- shadows

FOCUS ONLY ON THE GARMENT.

The image may contain a dress, salwar kameez, three piece, saree, blouse, or other clothing.

Identify the actual clothing product as precisely as possible.

Pay extremely close attention to:

- garment type
- dominant garment color
- secondary garment colors
- exact pattern
- embroidery
- embroidery placement
- neckline
- sleeves
- cuffs
- fit
- length
- hem
- border
- dupatta/orna
- fabric appearance
- unique decorative elements
- unique motifs
- unique arrangement of embroidery
- unique border design
- unique sleeve design
- unique neckline design

COLOR RULE:

Use ONLY the color of the garment.

Never use:

- background color
- wall color
- skin color
- lighting color
- furniture color

VERY IMPORTANT:

The visual fingerprint must describe the garment itself.

Do NOT create:

- IDs
- SKU
- hashes
- codes
- random strings
- numbers

The visual fingerprint must be a detailed natural-language description.

Include distinctive visual characteristics that can help determine whether another photograph shows the SAME clothing product.

IMPORTANT EXACT MATCH RULE:

Two products should be considered the same only when their visible garment characteristics strongly agree.

Do NOT consider two products the same just because:

- both are orange
- both are sarees
- both are three pieces
- both have embroidery
- both have similar patterns

The complete visual design must agree.

Return ONLY JSON.

Required JSON:

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
        }
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
        raw = JSON.stringify(raw || "");
      }

      raw = cleanText(raw);

      console.log(
        "RAW VISION:",
        raw
      );

      // =========================================================
      // REMOVE CODE FENCES
      // =========================================================

      raw = raw
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      let parsed = null;

      try {
        parsed = JSON.parse(raw);
      } catch {
        const start = raw.indexOf("{");
        const end = raw.lastIndexOf("}");

        if (start !== -1 && end > start) {
          try {
            parsed = JSON.parse(
              raw.slice(start, end + 1)
            );
          } catch {
            parsed = null;
          }
        }
      }

      if (
        !parsed ||
        typeof parsed !== "object"
      ) {
        console.error(
          "Invalid vision response:",
          raw
        );

        return normalizeFingerprint(
          {},
          raw
        );
      }

      return normalizeFingerprint(
        parsed,
        raw
      );
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

      if (
        Array.isArray(
          secondaryColors
        )
      ) {
        secondaryColors =
          secondaryColors.join(", ");
      }

      return {
        garment_type:
          cleanText(
            m.garment_type
          ),

        dominant_color:
          cleanText(
            m.dominant_color ||
              m.color
          ),

        secondary_colors:
          cleanText(
            secondaryColors
          ),

        pattern:
          cleanText(
            m.pattern
          ),

        embroidery:
          cleanText(
            m.embroidery
          ),

        neckline:
          cleanText(
            m.neckline
          ),

        sleeves:
          cleanText(
            m.sleeves
          ),

        cuffs:
          cleanText(
            m.cuffs
          ),

        fit:
          cleanText(
            m.fit
          ),

        length:
          cleanText(
            m.length
          ),

        hem:
          cleanText(
            m.hem
          ),

        border:
          cleanText(
            m.border
          ),

        dupatta_or_orna:
          cleanText(
            m.dupatta_or_orna
          ),

        fabric_appearance:
          cleanText(
            m.fabric_appearance
          ),

        distinctive_details:
          cleanText(
            m.distinctive_details
          ),

        visual_fingerprint:
          cleanText(
            m.visual_fingerprint
          ),
      };
    }

    // =========================================================
    // STRICT EXACT VERIFICATION
    // =========================================================

    function verifyExact(
      customer,
      metadata
    ) {
      const candidate =
        candidateFingerprint(
          metadata
        );

      // -------------------------------------------------------
      // COLOR MUST MATCH
      // -------------------------------------------------------

      const customerColor =
        normalizeColor(
          customer.dominant_color
        );

      const candidateColor =
        normalizeColor(
          candidate.dominant_color
        );

      if (
        !customerColor ||
        !candidateColor ||
        customerColor !== candidateColor
      ) {
        return {
          exact: false,
          score: 0,
          reason: "COLOR_MISMATCH",
          candidate,
        };
      }

      // -------------------------------------------------------
      // GARMENT TYPE MUST MATCH
      // -------------------------------------------------------

      const garmentSimilarity =
        similarity(
          customer.garment_type,
          candidate.garment_type
        );

      if (
        garmentSimilarity < 0.85
      ) {
        return {
          exact: false,
          score: 0,
          reason:
            "GARMENT_TYPE_MISMATCH",
          candidate,
        };
      }

      // -------------------------------------------------------
      // FIELD CHECKS
      // -------------------------------------------------------

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
        ["border", 0.06],
        ["dupatta_or_orna", 0.05],
        ["fabric_appearance", 0.02],
        ["distinctive_details", 0.04],
      ];

      let total = 0;
      let weight = 0;

      const fieldScores = {};

      for (
        const [field, weightValue]
        of checks
      ) {
        const a =
          customer[field];

        const b =
          candidate[field];

        if (!a || !b) {
          fieldScores[field] = 0;
          continue;
        }

        const fieldScore =
          similarity(a, b);

        fieldScores[field] =
          Number(
            fieldScore.toFixed(4)
          );

        total +=
          fieldScore *
          weightValue;

        weight +=
          weightValue;
      }

      const score =
        weight > 0
          ? total / weight
          : 0;

      // -------------------------------------------------------
      // DISTINCTIVE DETAILS CHECK
      // -------------------------------------------------------

      const distinctiveScore =
        similarity(
          customer.distinctive_details,
          candidate.distinctive_details
        );

      // -------------------------------------------------------
      // PATTERN CHECK
      // -------------------------------------------------------

      const patternScore =
        similarity(
          customer.pattern,
          candidate.pattern
        );

      // -------------------------------------------------------
      // EMBROIDERY CHECK
      // -------------------------------------------------------

      const embroideryScore =
        similarity(
          customer.embroidery,
          candidate.embroidery
        );

      // -------------------------------------------------------
      // FINAL STRICT RULE
      // -------------------------------------------------------

      const exact =
        score >= 0.86 &&
        garmentSimilarity >= 0.85 &&
        patternScore >= 0.70 &&
        embroideryScore >= 0.70 &&
        distinctiveScore >= 0.65;

      return {
        exact,

        score,

        reason: exact
          ? "EXACT_PRODUCT_MATCH"
          : "STRICT_FINGERPRINT_MISMATCH",

        candidate,

        field_scores:
          fieldScores,

        garment_similarity:
          garmentSimilarity,

        pattern_score:
          patternScore,

        embroidery_score:
          embroideryScore,

        distinctive_score:
          distinctiveScore,
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

        const response =
          await fetch(
            `${env.SUPABASE_URL}/rest/v1/products?select=id,name,details,color,size,price,image_url,stock`,
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
                  fingerprint.garment_type,

                dominant_color:
                  fingerprint.dominant_color,

                secondary_colors:
                  fingerprint.secondary_colors.join(
                    ", "
                  ),

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

        return Response.json({
          success: true,

          products_found:
            products.length,

          vectors_indexed:
            vectors.length,

          failed_products:
            failed,
        });

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
    // EXACT VISUAL SEARCH
    // =========================================================

    if (
      url.pathname ===
        "/api/visual-search" &&
      request.method === "POST"
    ) {
      try {
        console.log(
          "================================="
        );

        console.log(
          "VISUAL SEARCH STARTED"
        );

        console.log(
          "================================="
        );

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

        const bytes =
          await image.arrayBuffer();

        // -------------------------------------------------------
        // CUSTOMER IMAGE ANALYSIS
        // -------------------------------------------------------

        console.log(
          "ANALYZING CUSTOMER IMAGE..."
        );

        const customer =
          await analyzeImage(
            bytes
          );

        console.log(
          "CUSTOMER FINGERPRINT:",
          JSON.stringify(
            customer,
            null,
            2
          )
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

            matches: [],
          });
        }

        // -------------------------------------------------------
        // CREATE QUERY TEXT
        // -------------------------------------------------------

        const queryText =
          fingerprintText(
            customer
          );

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

        console.log(
          "VECTOR CANDIDATES:",
          candidates.length
        );

        if (
          !candidates.length
        ) {
          return Response.json({
            success: true,

            exact_match: false,

            confidence: 0,

            reason:
              "NO_VECTOR_CANDIDATES",

            customer_fingerprint:
              customer,

            matches: [],
          });
        }

        // -------------------------------------------------------
        // STRICT VERIFICATION
        // -------------------------------------------------------

        const verified = [];

        for (
          const match of candidates
        ) {
          const vectorScore =
            Number(
              match.score || 0
            );

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

          // -----------------------------------------------------
          // FIRST VECTOR GATE
          // -----------------------------------------------------

          if (
            vectorScore < 0.82
          ) {
            console.log(
              "REJECTED: VECTOR SCORE TOO LOW"
            );

            continue;
          }

          const metadata =
            match.metadata || {};

          console.log(
            "CANDIDATE METADATA:",
            JSON.stringify(
              metadata,
              null,
              2
            )
          );

          // -----------------------------------------------------
          // STRICT FINGERPRINT VERIFICATION
          // -----------------------------------------------------

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

          if (
            !verification.exact
          ) {
            console.log(
              "REJECTED: NOT EXACT"
            );

            continue;
          }

          // -----------------------------------------------------
          // COMBINED SCORE
          // -----------------------------------------------------

          const combined =
            vectorScore * 0.55 +
            verification.score * 0.45;

          console.log(
            "COMBINED SCORE:",
            combined
          );

          // -----------------------------------------------------
          // FINAL STRICT GATE
          // -----------------------------------------------------

          if (
            combined < 0.86
          ) {
            console.log(
              "REJECTED: COMBINED SCORE TOO LOW"
            );

            continue;
          }

          verified.push({
            ...match,

            vector_score:
              Number(
                vectorScore.toFixed(
                  6
                )
              ),

            fingerprint_score:
              Number(
                verification.score.toFixed(
                  6
                )
              ),

            combined_score:
              Number(
                combined.toFixed(
                  6
                )
              ),

            metadata,
          });
        }

        // -------------------------------------------------------
        // SORT
        // -------------------------------------------------------

        verified.sort(
          (a, b) =>
            b.combined_score -
            a.combined_score
        );

        console.log(
          "VERIFIED EXACT PRODUCTS:",
          JSON.stringify(
            verified,
            null,
            2
          )
        );

        // -------------------------------------------------------
        // NO EXACT PRODUCT
        // -------------------------------------------------------

        if (
          !verified.length
        ) {
          console.log(
            "NO EXACT PRODUCT FOUND."
          );

          return Response.json({
            success: true,

            exact_match: false,

            confidence: 0,

            reason:
              "NO_EXACT_PRODUCT",

            customer_fingerprint:
              customer,

            matches: [],
          });
        }

        // -------------------------------------------------------
        // ONLY BEST EXACT PRODUCT
        // -------------------------------------------------------

        const best =
          verified[0];

        console.log(
          "FINAL EXACT PRODUCT:",
          JSON.stringify(
            best,
            null,
            2
          )
        );

        return Response.json({
          success: true,

          exact_match: true,

          confidence:
            best.combined_score,

          customer_fingerprint:
            customer,

          matches: [
            {
              id:
                best.id,

              score:
                best.vector_score,

              fingerprint_score:
                best.fingerprint_score,

              combined_score:
                best.combined_score,

              metadata:
                best.metadata,
            },
          ],
        });

      } catch (error) {
        console.error(
          "================================="
        );

        console.error(
          "VISUAL SEARCH ERROR"
        );

        console.error(
          error
        );

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