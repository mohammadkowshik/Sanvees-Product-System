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

IGNORE completely:
- person's face
- person's body/skin
- hair
- room
- wall
- furniture
- plants
- background
- lighting/background scenery

Create a detailed visual fingerprint of the clothing item.

Focus heavily on:
1. garment type
2. dominant color
3. secondary colors
4. exact pattern
5. embroidery
6. prints
7. motifs
8. neckline
9. sleeve style
10. sleeve design
11. cuffs
12. silhouette
13. fit
14. garment length
15. hem design
16. borders
17. scarf/dupatta/orna details
18. fabric appearance
19. decorative details
20. overall distinctive appearance

Return ONLY valid JSON in this exact structure:

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

The visual_fingerprint must be a concise but highly descriptive summary of the clothing itself.
Do not mention the background or person.
`,
        }
      );

      const raw =
        visionResult?.response ||
        visionResult?.result?.response ||
        "";

      if (!raw) {
        return null;
      }

      // Try to extract JSON even if the model surrounds it with markdown.
      let parsed = null;

      try {
        parsed = JSON.parse(raw);
      } catch {
        const match = raw.match(/\{[\s\S]*\}/);

        if (match) {
          try {
            parsed = JSON.parse(match[0]);
          } catch {
            parsed = null;
          }
        }
      }

      if (!parsed) {
        return {
          garment_type: "",
          dominant_color: "",
          secondary_colors: [],
          pattern: "",
          embroidery: "",
          neckline: "",
          sleeves: "",
          cuffs: "",
          fit: "",
          length: "",
          hem: "",
          border: "",
          dupatta_or_orna: "",
          fabric_appearance: "",
          distinctive_details: "",
          visual_fingerprint: raw,
        };
      }

      return parsed;
    }

    // =========================================================
// HELPER: CREATE EXACT VISUAL SEARCH TEXT
// =========================================================

function exactVisualText(fingerprint) {
  return [
    `Garment type: ${fingerprint.garment_type || ""}`,
    `Dominant color: ${fingerprint.dominant_color || ""}`,
    `Secondary colors: ${
      Array.isArray(fingerprint.secondary_colors)
        ? fingerprint.secondary_colors.join(", ")
        : fingerprint.secondary_colors || ""
    }`,
    `Pattern: ${fingerprint.pattern || ""}`,
    `Embroidery: ${fingerprint.embroidery || ""}`,
    `Neckline: ${fingerprint.neckline || ""}`,
    `Sleeves: ${fingerprint.sleeves || ""}`,
    `Cuffs: ${fingerprint.cuffs || ""}`,
    `Fit: ${fingerprint.fit || ""}`,
    `Length: ${fingerprint.length || ""}`,
    `Hem: ${fingerprint.hem || ""}`,
    `Border: ${fingerprint.border || ""}`,
    `Dupatta or orna: ${fingerprint.dupatta_or_orna || ""}`,
    `Fabric appearance: ${fingerprint.fabric_appearance || ""}`,
    `Distinctive details: ${fingerprint.distinctive_details || ""}`,
    `Visual fingerprint: ${fingerprint.visual_fingerprint || ""}`,
  ]
    .filter(Boolean)
    .join(". ");
}
    // =========================================================
    // HELPER: CREATE EMBEDDING TEXT
    // =========================================================

    function fingerprintToText(fingerprint, product = null) {
      return [
        `Garment type: ${fingerprint.garment_type || ""}`,
        `Dominant color: ${fingerprint.dominant_color || ""}`,
        `Secondary colors: ${
          Array.isArray(fingerprint.secondary_colors)
            ? fingerprint.secondary_colors.join(", ")
            : fingerprint.secondary_colors || ""
        }`,
        `Pattern: ${fingerprint.pattern || ""}`,
        `Embroidery: ${fingerprint.embroidery || ""}`,
        `Neckline: ${fingerprint.neckline || ""}`,
        `Sleeves: ${fingerprint.sleeves || ""}`,
        `Cuffs: ${fingerprint.cuffs || ""}`,
        `Fit: ${fingerprint.fit || ""}`,
        `Length: ${fingerprint.length || ""}`,
        `Hem: ${fingerprint.hem || ""}`,
        `Border: ${fingerprint.border || ""}`,
        `Dupatta or orna: ${fingerprint.dupatta_or_orna || ""}`,
        `Fabric appearance: ${
          fingerprint.fabric_appearance || ""
        }`,
        `Distinctive details: ${
          fingerprint.distinctive_details || ""
        }`,
        `Visual fingerprint: ${
          fingerprint.visual_fingerprint || ""
        }`,

        // Product database information can help disambiguate
        // products without replacing the visual information.
        product
          ? `Product name: ${product.name || ""}`
          : "",
        product
          ? `Product details: ${product.details || ""}`
          : "",
        product
          ? `Product color: ${product.color || ""}`
          : "",
      ]
        .filter(Boolean)
        .join(". ");
    }

    // =========================================================
    // INDEX SUPABASE PRODUCTS
    // =========================================================

    if (
      url.pathname === "/api/index-products" &&
      request.method === "POST"
    ) {
      try {
        const supabaseUrl = env.SUPABASE_URL;
        const supabaseKey =
          env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey) {
          return Response.json(
            {
              success: false,
              error:
                "Supabase secrets are not configured.",
            },
            { status: 500 }
          );
        }

        const response = await fetch(
          `${supabaseUrl}/rest/v1/products?select=id,name,details,color,size,price,image_url,stock`,
          {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
            },
          }
        );

        if (!response.ok) {
          const errorText = await response.text();

          return Response.json(
            {
              success: false,
              error: `Supabase request failed: ${response.status}`,
              details: errorText,
            },
            { status: 500 }
          );
        }

        const products = await response.json();

        if (
          !Array.isArray(products) ||
          products.length === 0
        ) {
          return Response.json({
            success: true,
            message: "No products found.",
            indexed: 0,
          });
        }

        const vectors = [];
        const failedProducts = [];

        for (const product of products) {
          try {
            if (!product.image_url) {
              failedProducts.push({
                id: product.id,
                reason: "No image_url",
              });

              continue;
            }

            // -------------------------------------------------
            // DOWNLOAD PRODUCT IMAGE
            // -------------------------------------------------

            const imageResponse = await fetch(
              product.image_url
            );

            if (!imageResponse.ok) {
              failedProducts.push({
                id: product.id,
                reason: `Image download failed: ${imageResponse.status}`,
              });

              continue;
            }

            const imageBytes =
              await imageResponse.arrayBuffer();

            // -------------------------------------------------
            // ANALYZE PRODUCT IMAGE
            // -------------------------------------------------

            const fingerprint =
              await analyzeDressImage(
                imageBytes,
                env
              );

            if (!fingerprint) {
              failedProducts.push({
                id: product.id,
                reason: "Vision analysis failed",
              });

              continue;
            }

            // -------------------------------------------------
            // CREATE VISUAL EMBEDDING
            // -------------------------------------------------

            const visualText =
              fingerprintToText(
                fingerprint,
                product
              );

            const embeddingResult =
              await env.AI.run(
                "@cf/baai/bge-base-en-v1.5",
                {
                  text: [visualText],
                }
              );

            const embedding =
              embeddingResult?.data?.[0];

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

            // -------------------------------------------------
            // STORE VECTOR
            // -------------------------------------------------

            vectors.push({
              id: product.id,
              values: embedding,

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
                  fingerprint.garment_type || "",

                dominant_color:
                  fingerprint.dominant_color || "",

                pattern:
                  fingerprint.pattern || "",

                embroidery:
                  fingerprint.embroidery || "",

                neckline:
                  fingerprint.neckline || "",

                sleeves:
                  fingerprint.sleeves || "",

                distinctive_details:
                  fingerprint.distinctive_details ||
                  "",

                visual_fingerprint:
                  fingerprint.visual_fingerprint ||
                  "",
              },
            });
          } catch (productError) {
            console.error(
              "Product indexing error:",
              product.id,
              productError
            );

            failedProducts.push({
              id: product.id,
              reason:
                productError instanceof Error
                  ? productError.message
                  : "Unknown error",
            });
          }
        }

        if (vectors.length === 0) {
          return Response.json(
            {
              success: false,
              error:
                "Could not generate any visual product embeddings.",
              failed_products: failedProducts,
            },
            { status: 500 }
          );
        }

        // -------------------------------------------------
        // UPSERT INTO VECTORIZE
        // -------------------------------------------------

        await env.VECTORIZE.upsert(vectors);

        return Response.json({
          success: true,
          message:
            "Visual product indexing completed.",
          products_found: products.length,
          vectors_indexed: vectors.length,
          failed_products: failedProducts,
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
// STRICT VISUAL DRESS SEARCH
// =========================================================

if (
  url.pathname === "/api/visual-search" &&
  request.method === "POST"
) {
  try {
    const formData = await request.formData();

    const image = formData.get("image");

    if (!(image instanceof File)) {
      return Response.json(
        {
          success: false,
          error: "Please upload a dress image.",
        },
        { status: 400 }
      );
    }

    const imageBuffer = await image.arrayBuffer();

    // =====================================================
    // 1. ANALYZE CUSTOMER IMAGE
    // =====================================================

    const fingerprint = await analyzeDressImage(
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
      "🔵 CUSTOMER FINGERPRINT:",
      fingerprint
    );

    // =====================================================
    // 2. CREATE CUSTOMER EMBEDDING
    // =====================================================

    const queryText = exactVisualText(
      fingerprint
    );

    const embeddingResult = await env.AI.run(
      "@cf/baai/bge-base-en-v1.5",
      {
        text: [queryText],
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
      // Retrieve all currently indexed products.
      // This prevents the exact product from being
      // excluded just because it ranked below top 5.
      topK: 50,
      returnMetadata: true,
    }
  );

    const candidates =
      searchResult?.matches || [];

    console.log(
      "🔵 VECTOR CANDIDATES:",
      candidates
    );

    if (candidates.length === 0) {
      return Response.json({
        success: true,
        exact_match: false,
        description:
          fingerprint.visual_fingerprint || "",
        confidence: 0,
        matches: [],
      });
    }

    // =====================================================
    // 4. FIRST FILTER
    // =====================================================

    const VECTOR_THRESHOLD = 0.60;

const vectorCandidates =
  candidates.filter(
    (match) =>
      Number(match.score || 0) >=
      VECTOR_THRESHOLD
  );

    if (vectorCandidates.length === 0) {
      return Response.json({
        success: true,
        exact_match: false,
        description:
          fingerprint.visual_fingerprint || "",
        confidence: 0,
        matches: [],
      });
    }

    // =====================================================
    // 5. AI EXACT VERIFICATION
    //
    // Vector similarity alone is NOT enough.
    // We now compare the customer's visual fingerprint
    // against every candidate product fingerprint.
    // =====================================================

    const verifiedMatches = [];

    for (const candidate of vectorCandidates) {
      const metadata =
        candidate.metadata || {};

      const candidateFingerprint = {
        garment_type:
          metadata.garment_type || "",

        dominant_color:
          metadata.dominant_color || "",

        pattern:
          metadata.pattern || "",

        embroidery:
          metadata.embroidery || "",

        neckline:
          metadata.neckline || "",

        sleeves:
          metadata.sleeves || "",

        distinctive_details:
          metadata.distinctive_details || "",

        visual_fingerprint:
          metadata.visual_fingerprint || "",
      };

      const verificationPrompt = `
You are an extremely strict clothing product verification AI.

Your task is to determine whether the CUSTOMER clothing
and the DATABASE PRODUCT are the SAME physical clothing
design/product.

IMPORTANT:

A merely similar dress is NOT an exact match.

Reject the product if there are meaningful differences in:

- dominant color
- major color combination
- garment type
- pattern
- print
- embroidery
- neckline
- sleeve design
- border
- distinctive decoration
- overall design

Minor differences caused by:
- lighting
- camera angle
- model pose
- image quality

may be ignored.

But a different design must ALWAYS be rejected.

CUSTOMER CLOTHING:

Garment type:
${fingerprint.garment_type || ""}

Dominant color:
${fingerprint.dominant_color || ""}

Secondary colors:
${
  Array.isArray(fingerprint.secondary_colors)
    ? fingerprint.secondary_colors.join(", ")
    : fingerprint.secondary_colors || ""
}

Pattern:
${fingerprint.pattern || ""}

Embroidery:
${fingerprint.embroidery || ""}

Neckline:
${fingerprint.neckline || ""}

Sleeves:
${fingerprint.sleeves || ""}

Cuffs:
${fingerprint.cuffs || ""}

Fit:
${fingerprint.fit || ""}

Length:
${fingerprint.length || ""}

Hem:
${fingerprint.hem || ""}

Border:
${fingerprint.border || ""}

Dupatta / Orna:
${fingerprint.dupatta_or_orna || ""}

Fabric appearance:
${fingerprint.fabric_appearance || ""}

Distinctive details:
${fingerprint.distinctive_details || ""}

Visual fingerprint:
${fingerprint.visual_fingerprint || ""}


DATABASE PRODUCT:

Garment type:
${candidateFingerprint.garment_type}

Dominant color:
${candidateFingerprint.dominant_color}

Pattern:
${candidateFingerprint.pattern}

Embroidery:
${candidateFingerprint.embroidery}

Neckline:
${candidateFingerprint.neckline}

Sleeves:
${candidateFingerprint.sleeves}

Distinctive details:
${candidateFingerprint.distinctive_details}

Visual fingerprint:
${candidateFingerprint.visual_fingerprint}


Return ONLY valid JSON.
Do not use markdown.
Do not write anything before or after the JSON.

{
  "same_product": false,
  "confidence": 0.0,
  "reason": ""
}

Decision rules:

1. Compare the CUSTOMER CLOTHING and DATABASE PRODUCT carefully.
2. same_product = true ONLY when they appear to be the same clothing design/product.
3. If they are only similar in style, color, embroidery, or garment type, return false.
4. Minor differences from lighting, camera angle, pose, or image quality may be ignored.
5. A different dominant color or clearly different major design must return false.
6. confidence must be a number between 0 and 1.
7. If evidence is insufficient, return false.
8. Do not guess.
`;

      try {
        const verificationResult =
  await env.AI.run(
    "@cf/meta/llama-3.2-3b-instruct",
    {
      prompt: verificationPrompt,
      max_tokens: 300,
      temperature: 0,
    }
  );

        const rawVerification =
          verificationResult?.response ||
          verificationResult?.result?.response ||
          "";

        let verification = null;

        try {
          verification =
            JSON.parse(rawVerification);
        } catch {
          const match =
            rawVerification.match(
              /\{[\s\S]*\}/
            );

          if (match) {
            try {
              verification =
                JSON.parse(match[0]);
            } catch {
              verification = null;
            }
          }
        }

        console.log(
          "🟡 PRODUCT VERIFICATION:",
          candidate.id,
          verification
        );

        if (
          verification &&
          verification.same_product === true &&
          Number(
            verification.confidence || 0
          ) >= 0.90
        ) {
          verifiedMatches.push({
            ...candidate,
            verification_confidence:
              Number(
                verification.confidence
              ),
            verification_reason:
              verification.reason || "",
          });
        }
      } catch (verificationError) {
        console.error(
          "Product verification error:",
          candidate.id,
          verificationError
        );
      }
    }

    // =====================================================
    // 6. SORT VERIFIED MATCHES
    // =====================================================

    verifiedMatches.sort(
      (a, b) =>
        Number(
          b.verification_confidence || 0
        ) -
        Number(
          a.verification_confidence || 0
        )
    );

    // =====================================================
    // 7. ONLY RETURN VERIFIED PRODUCT
    // =====================================================

    const bestMatch =
      verifiedMatches.length > 0
        ? verifiedMatches[0]
        : null;

    console.log(
      "🟢 FINAL EXACT MATCH:",
      bestMatch
    );

    return Response.json({
      success: true,

      exact_match:
        Boolean(bestMatch),

      description:
        fingerprint.visual_fingerprint ||
        "",

      confidence:
        bestMatch
          ? Number(
              bestMatch.verification_confidence ||
                0
            )
          : 0,

      matches:
        bestMatch
          ? [bestMatch]
          : [],
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