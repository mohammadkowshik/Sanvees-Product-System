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
          const w = normalizeText(word);

          if (text === w || text.includes(w)) {
            return name;
          }
        }
      }

      return text;
    }

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

      if (!wordsA.size || !wordsB.size) return 0;

      let common = 0;

      for (const word of wordsA) {
        if (wordsB.has(word)) common++;
      }

      return common / Math.max(wordsA.size, wordsB.size);
    }

    function colorSimilarity(a, b) {
      const A = normalizeColor(a);
      const B = normalizeColor(b);

      if (!A || !B) return 0;
      if (A === B) return 1;

      return 0;
    }

    // =========================================================
    // EXTRACT FIELD FROM AI MARKDOWN
    // =========================================================

    // =========================================================
    // EXTRACT FIELD FROM AI MARKDOWN OR JSON
    // =========================================================

    function extractField(text, label) {
      const source = cleanText(text);

      if (!source || !label) return "";

      const key = String(label)
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      // JSON field: "garment_type": "Salwar Kameez"
      const jsonRegex = new RegExp(
        `["']${key}["']\\s*:\\s*["']([^"']*)["']`,
        "i"
      );

      const jsonMatch = source.match(jsonRegex);

      if (jsonMatch) {
        return cleanText(jsonMatch[1]);
      }

      // Markdown field: **Garment Type:** Salwar Kameez
      const markdownRegex = new RegExp(
        `(?:^|\\n)\\s*(?:[-*•]\\s*)?\\*{0,2}${key}\\*{0,2}\\s*:\\s*(.+?)(?=\\n|$)`,
        "im"
      );

      const markdownMatch = source.match(markdownRegex);

      if (!markdownMatch) return "";

      return cleanText(
        markdownMatch[1]
          .replace(/\*\*/g, "")
          .replace(/^[-*•]\s*/, "")
      );
    }

    function extractListField(text, label) {
      const value = extractField(text, label);

      if (!value) return [];

      return value
        .replace(/^\[/, "")
        .replace(/\]$/, "")
        .replace(/["']/g, "")
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
        dominant_color: cleanText(parsed?.dominant_color),

        secondary_colors: Array.isArray(parsed?.secondary_colors)
          ? parsed.secondary_colors
              .map(cleanText)
              .filter(Boolean)
          : [],

        pattern: cleanText(parsed?.pattern),
        embroidery: cleanText(parsed?.embroidery),
        neckline: cleanText(parsed?.neckline),
        sleeves: cleanText(parsed?.sleeves),
        cuffs: cleanText(parsed?.cuffs),
        fit: cleanText(parsed?.fit),
        length: cleanText(parsed?.length),
        hem: cleanText(parsed?.hem),
        border: cleanText(parsed?.border),
        dupatta_or_orna: cleanText(parsed?.dupatta_or_orna),
        fabric_appearance: cleanText(parsed?.fabric_appearance),
        distinctive_details: cleanText(
          parsed?.distinctive_details
        ),
        visual_fingerprint: cleanText(
          parsed?.visual_fingerprint
        ),
      };

      // =====================================================
      // MARKDOWN FALLBACK
      // =====================================================

      if (!result.garment_type)
        result.garment_type = extractField(
          source,
          "Garment Type"
        );

      if (!result.dominant_color)
        result.dominant_color = extractField(
          source,
          "Dominant Color"
        );

      if (!result.secondary_colors.length)
        result.secondary_colors = extractListField(
          source,
          "Secondary Colors"
        );

      if (!result.pattern)
        result.pattern = extractField(
          source,
          "Pattern"
        );

      if (!result.embroidery)
        result.embroidery = extractField(
          source,
          "Embroidery"
        );

      if (!result.neckline)
        result.neckline = extractField(
          source,
          "Neckline"
        );

      if (!result.sleeves)
        result.sleeves = extractField(
          source,
          "Sleeves"
        );

      if (!result.cuffs)
        result.cuffs = extractField(
          source,
          "Cuffs"
        );

      if (!result.fit)
        result.fit = extractField(
          source,
          "Fit"
        );

      if (!result.length)
        result.length = extractField(
          source,
          "Length"
        );

      if (!result.hem)
        result.hem = extractField(
          source,
          "Hem"
        );

      if (!result.border)
        result.border = extractField(
          source,
          "Border"
        );

      if (!result.dupatta_or_orna)
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

      if (!result.fabric_appearance)
        result.fabric_appearance =
          extractField(
            source,
            "Fabric Appearance"
          );

      if (!result.distinctive_details)
        result.distinctive_details =
          extractField(
            source,
            "Distinctive Details"
          );

      if (!result.visual_fingerprint)
        result.visual_fingerprint =
          extractField(
            source,
            "Visual Fingerprint"
          ) || source;

      return result;
    }

    // =========================================================
    // AI IMAGE ANALYSIS
    // =========================================================

    async function analyzeImage(imageBytes) {
      const result = await env.AI.run(
        "@cf/meta/llama-3.2-11b-vision-instruct",
        {
          image: [...new Uint8Array(imageBytes)],

          prompt: `
You are a STRICT fashion product identification AI.

Analyze ONLY the garment.

Ignore:
- face
- body
- skin
- hair
- room
- wall
- furniture
- plants
- background
- lighting

The goal is to identify the EXACT clothing product.

Pay special attention to:
- garment type
- dominant color
- secondary colors
- exact pattern
- embroidery
- neckline
- sleeves
- cuffs
- fit
- length
- hem
- border
- dupatta/orna
- fabric appearance
- distinctive details

COLOR RULE:
Use the actual garment color.
Never use background color.
Never use skin color.
Never use lighting color.
VERY IMPORTANT VISUAL FINGERPRINT RULES:

The "visual_fingerprint" field MUST be a natural-language description
of the clothing item.

It MUST NOT be:
- a code
- an ID
- a hash
- a hexadecimal value
- a random string
- a product ID
- a SKU
- a number-only value

It MUST describe the actual garment using visible characteristics.

Include:
- garment type
- dominant color
- secondary colors
- pattern
- embroidery
- neckline
- sleeves
- dupatta/orna
- distinctive visual details

The visual_fingerprint MUST be a descriptive sentence.

GOOD example:
"Orange salwar kameez with floral pattern, gold embroidery,
long sleeves, embroidered cuffs, round neckline, matching dupatta
and tassel details."

BAD example:
"A6F5E1"
"123456"
"product_001"
"SKU-ORANGE-12"

Return ONLY JSON.
Do not return Markdown.
Do not explain anything.

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
                garment_type: { type: "string" },
                dominant_color: { type: "string" },

                secondary_colors: {
                  type: "array",
                  items: { type: "string" },
                },

                pattern: { type: "string" },
                embroidery: { type: "string" },
                neckline: { type: "string" },
                sleeves: { type: "string" },
                cuffs: { type: "string" },
                fit: { type: "string" },
                length: { type: "string" },
                hem: { type: "string" },
                border: { type: "string" },
                dupatta_or_orna: { type: "string" },
                fabric_appearance: { type: "string" },
                distinctive_details: { type: "string" },
                visual_fingerprint: { type: "string" },
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

      let raw =
        result?.response ??
        result?.result?.response ??
        "";

      if (
        typeof raw !== "string"
      ) {
        raw = JSON.stringify(raw || "");
      }

      raw = cleanText(raw);

      console.log(
        "ðŸ”µ RAW VISION:",
        raw
      );

      // Remove code fences
      raw = raw
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      let parsed = null;

      // =========================================================
      // ROBUST VISION RESPONSE PARSER
      // =========================================================

      try {
        parsed = JSON.parse(raw);
      } catch {
        const start = raw.indexOf("{");

        if (start !== -1) {
          const jsonText = raw.slice(start);
          const lastBrace = jsonText.lastIndexOf("}");

          if (lastBrace !== -1) {
            try {
              parsed = JSON.parse(
                jsonText.slice(0, lastBrace + 1)
              );
            } catch {
              parsed = null;
            }
          }
        }
      }

      // =========================================================
      // TEXT FALLBACK
      // =========================================================

      if (!parsed || typeof parsed !== "object") {
        const text = raw.toLowerCase();

        const garmentType =
          text.includes("salwar kameez")
            ? "Salwar Kameez"
            : text.includes("kameez")
              ? "Kameez"
              : "";

        const dominantColor =
          text.includes("orange")
            ? "Orange"
            : text.includes("red")
              ? "Red"
              : text.includes("blue")
                ? "Blue"
                : text.includes("green")
                  ? "Green"
                  : text.includes("pink")
                    ? "Pink"
                    : text.includes("yellow")
                      ? "Yellow"
                      : text.includes("black")
                        ? "Black"
                        : text.includes("white")
                          ? "White"
                          : "";

        parsed = {
          garment_type: garmentType,
          dominant_color: dominantColor,
          secondary_colors: [],
          pattern: text.includes("floral") ? "Floral" : "",
          embroidery: text.includes("embroidery") ? "Embroidery" : "",
          neckline: text.includes("round neckline") ? "Round" : "",
          sleeves: text.includes("long sleeves") ? "Long" : "",
          cuffs: text.includes("embroidered cuffs") ? "Embroidered" : "",
          fit: text.includes("loose") ? "Loose" : "",
          length: text.includes("floor-length") ? "Floor-length" : "Long",
          hem: text.includes("straight") ? "Straight" : "",
          border: text.includes("border") || text.includes("trim")
            ? "Embroidered Border"
            : "",
          dupatta_or_orna: text.includes("dupatta")
            ? "Matching Dupatta"
            : "",
          fabric_appearance: text.includes("lightweight")
            ? "Lightweight"
            : "",
          distinctive_details: text.includes("tassel")
            ? "Tassel details"
            : "",
          visual_fingerprint: raw,
        };
      }
      // =========================================================
      // =========================================================
      // FINAL FINGERPRINT NORMALIZATION
      // =========================================================

      if (!parsed || typeof parsed !== "object") {
        console.error("Invalid vision response:", raw);
        return normalizeFingerprint({}, raw);
      }

      return normalizeFingerprint(
        parsed,
        raw
      );
    }

    // =========================================================

    // =========================================================
    // CANDIDATE FINGERPRINT
    // =========================================================

    function candidateFingerprint(metadata) {
      const m = metadata || {};

      return {
        garment_type: cleanText(m.garment_type),
        dominant_color: cleanText(
          m.dominant_color || m.color
        ),

        secondary_colors: cleanText(
          m.secondary_colors
        ),

        pattern: cleanText(m.pattern),
        embroidery: cleanText(m.embroidery),
        neckline: cleanText(m.neckline),
        sleeves: cleanText(m.sleeves),
        cuffs: cleanText(m.cuffs),
        fit: cleanText(m.fit),
        length: cleanText(m.length),
        hem: cleanText(m.hem),
        border: cleanText(m.border),
        dupatta_or_orna: cleanText(
          m.dupatta_or_orna
        ),
        fabric_appearance: cleanText(
          m.fabric_appearance
        ),
        distinctive_details: cleanText(
          m.distinctive_details
        ),
        visual_fingerprint: cleanText(
          m.visual_fingerprint
        ),
      };
    }

    // =========================================================
    // EXACT FINGERPRINT VERIFICATION
    // =========================================================

    function verifyExact(customer, metadata) {
      const candidate =
        candidateFingerprint(metadata);

      const customerColor =
        normalizeColor(
          customer.dominant_color
        );

      const candidateColor =
        normalizeColor(
          candidate.dominant_color
        );

      // COLOR IS MANDATORY
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
        ["distinctive_details", 0.04],
      ];

      let total = 0;
      let weight = 0;

      for (const [field, w] of checks) {
        const a = customer[field];
        const b = candidate[field];

        if (!a || !b) continue;

        total += similarity(a, b) * w;
        weight += w;
      }

      const score =
        weight > 0
          ? total / weight
          : 0;

      // EXACT means strong agreement.
      const exact =
        score >= 0.78 &&
        similarity(
          customer.garment_type,
          candidate.garment_type
        ) >= 0.70;

      return {
        exact,
        score,
        reason: exact
          ? "EXACT_FINGERPRINT"
          : "FINGERPRINT_MISMATCH",
        candidate,
      };
    }

    // =========================================================
    // ANALYZE TEST
    // =========================================================

    if (
      url.pathname === "/api/analyze-test" &&
      request.method === "POST"
    ) {
      try {
        const formData =
          await request.formData();

        const image =
          formData.get("image");

        if (!(image instanceof File)) {
          return Response.json(
            {
              success: false,
              error: "Please upload an image.",
            },
            { status: 400 }
          );
        }

        const bytes =
          await image.arrayBuffer();

        const fingerprint =
          await analyzeImage(bytes);

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
    // INDEX PRODUCTS
    // =========================================================

    if (
      url.pathname === "/api/index-products" &&
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

        const vectors = [];
        const failed = [];

        for (const product of products) {
          try {
            if (!product.image_url) {
              failed.push({
                id: product.id,
                reason: "No image_url",
              });
              continue;
            }

            const imageResponse =
              await fetch(
                product.image_url
              );

            if (!imageResponse.ok) {
              failed.push({
                id: product.id,
                reason:
                  `Image download failed: ${imageResponse.status}`,
              });
              continue;
            }

            const bytes =
              await imageResponse.arrayBuffer();

            const fingerprint =
              await analyzeImage(bytes);

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

            vectors.push({
              id: String(product.id),

              values: vector,

              metadata: {
                product_id: product.id,
                name: product.name || "",
                details: product.details || "",
                color: product.color || "",
                size: product.size || "",
                price: product.price ?? null,
                stock: product.stock ?? null,
                image_url: product.image_url || "",

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

            console.log(
              "INDEXED PRODUCT:",
              product.id,
              fingerprint
            );
          } catch (error) {
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
              failed_products: failed,
            },
            { status: 500 }
          );
        }

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
      url.pathname === "/api/visual-search" &&
      request.method === "POST"
    ) {
      try {
        const formData =
          await request.formData();

        const image =
          formData.get("image");

        if (!(image instanceof File)) {
          return Response.json(
            {
              success: false,
              error:
                "Please upload a dress image.",
            },
            { status: 400 }
          );
        }

        const bytes =
          await image.arrayBuffer();

        // =====================================================
        // CUSTOMER FINGERPRINT
        // =====================================================

        const customer =
          await analyzeImage(bytes);

        console.log(
          "ðŸŸ¢ CUSTOMER FINGERPRINT:",
          customer
        );

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

        // =====================================================
        // CUSTOMER EMBEDDING
        // =====================================================

        const queryText =
          fingerprintText(customer);

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

        // =====================================================
        // VECTOR SEARCH
        // =====================================================

        const search =
          await env.VECTORIZE.query(
            queryVector,
            {
              topK: 20,
              returnMetadata: true,
            }
          );

        const candidates =
          search?.matches || [];

        console.log(
          "ðŸ”µ VECTOR CANDIDATES:",
          candidates.length
        );

        if (!candidates.length) {
          return Response.json({
            success: true,
            exact_match: false,
            confidence: 0,
            customer_fingerprint:
              customer,
            matches: [],
          });
        }

        // =====================================================
        // STRICT VERIFICATION
        // =====================================================

        const verified = [];

        for (const match of candidates) {
          const vectorScore =
            Number(match.score || 0);

          // First gate.
          if (vectorScore < 0.80) {
            continue;
          }

          const verification =
            verifyExact(
              customer,
              match.metadata || {}
            );

          console.log(
            "🔍 VERIFY:",
            JSON.stringify({
              id: match.id,
              vectorScore,
              fingerprintScore: verification.score,
              reason: verification.reason,
              candidate: verification.candidate,
            })
          );

          if (!verification.exact) {
            continue;
          }

          const combined =
            vectorScore * 0.60 +
            verification.score * 0.40;

          if (combined < 0.82) {
            continue;
          }

          verified.push({
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

            metadata:
              match.metadata || {},
          });
        }

        verified.sort(
          (a, b) =>
            b.combined_score -
            a.combined_score
        );

        console.log(
          "ðŸŸ£ VERIFIED EXACT CANDIDATES:",
          verified
        );

        // =====================================================
        // NO EXACT PRODUCT
        // =====================================================

        if (!verified.length) {
          return Response.json({
            success: true,
            exact_match: false,
            confidence: 0,
            customer_fingerprint:
              customer,
            matches: [],
          });
        }

        // =====================================================
        // ONLY BEST EXACT PRODUCT
        // =====================================================

        const best =
          verified[0];

        return Response.json({
          success: true,

          exact_match: true,

          confidence:
            best.combined_score,

          customer_fingerprint:
            customer,

          matches: [
            {
              id: best.id,

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
          "Visual search error:",
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

    return new Response(
      "Not Found",
      { status: 404 }
    );
  },
};
