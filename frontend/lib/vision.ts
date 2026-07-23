import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

export interface VisionAnalysis {
  matches: boolean;
  description: string;
  condition: string;
  anomalies: string[];
  confidence: number;
}

/**
 * Analyze card image using Google Gemini Vision API.
 * Sends artwork URL + metadata, asks for visual analysis + rarity match.
 */
export async function analyzeCardImage(
  imageUrl: string,
  expectedRarity: string,
  expectedName: string
): Promise<VisionAnalysis> {
  if (!GEMINI_API_KEY) {
    return {
      matches: false,
      description: "Vision API not configured (missing GEMINI_API_KEY)",
      condition: "Unknown",
      anomalies: ["API key not set"],
      confidence: 0,
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

    const prompt = `Analyze this trading card image. The card metadata says:
- Name: ${expectedName}
- Rarity: ${expectedRarity}

Please answer these questions in JSON format:
1. Does the visual appearance match the expected rarity? (Common should look plain, Rare should have blue accents, Epic should have purple/glow, Legendary should look holographic/premium)
2. Brief description of the card's visual appearance
3. Estimated physical condition (if this were a physical card): Mint/Good/Fair/Poor
4. Any visual anomalies or concerns

Return ONLY valid JSON:
{
  "matches_rarity": true/false,
  "description": "brief description",
  "condition": "Mint/Good/Fair/Poor",
  "anomalies": ["list of concerns"],
  "confidence": 0-100
}`;

    // Fetch image as base64
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status}`);
    }
    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString("base64");

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: "image/png",
          data: imageBase64,
        },
      },
    ]);

    const response = result.response.text();
    
    // Parse JSON from response (handle markdown code blocks)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse vision response as JSON");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      matches: parsed.matches_rarity ?? false,
      description: parsed.description || "No description",
      condition: parsed.condition || "Unknown",
      anomalies: parsed.anomalies || [],
      confidence: parsed.confidence ?? 0,
    };
  } catch (error) {
    console.error("Vision analysis error:", error);
    return {
      matches: false,
      description: `Vision analysis failed: ${(error as Error).message}`,
      condition: "Unknown",
      anomalies: ["Analysis failed"],
      confidence: 0,
    };
  }
}
