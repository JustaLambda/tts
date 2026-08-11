import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

function pcmToWav(pcmBuffer: Buffer, sampleRate: number = 24000): Buffer {
  const wavHeader = Buffer.alloc(44);

  wavHeader.write("RIFF", 0);
  wavHeader.writeUInt32LE(36 + pcmBuffer.length, 4);
  wavHeader.write("WAVE", 8);

  wavHeader.write("fmt ", 12);
  wavHeader.writeUInt32LE(16, 16);
  wavHeader.writeUInt16LE(1, 20);
  wavHeader.writeUInt16LE(1, 22);
  wavHeader.writeUInt32LE(sampleRate, 24);
  wavHeader.writeUInt32LE(sampleRate * 2, 28);
  wavHeader.writeUInt16LE(2, 32);
  wavHeader.writeUInt16LE(16, 34);

  wavHeader.write("data", 36);
  wavHeader.writeUInt32LE(pcmBuffer.length, 40);

  return Buffer.concat([wavHeader, pcmBuffer]);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.post("/api/tts", async (req, res) => {
    try {
      const { text, voice, style, speed, pitch, audioProfile, directorNotes, enablePauseDetection } = req.body;

      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }

      // Default voice mapping
      let voiceName = "Kore"; // Ban Mai (Female)
      if (voice === "LS") {
        voiceName = "Puck"; // Linh Sang (Female - Youthful)
      } else if (voice === "MQ") {
        voiceName = "Charon"; // Minh Quang (Male)
      }

      // Inject style/speed/pitch into prompt as instruction
      let instructions = "You are a professional voice actor. Read the following transcript in Vietnamese strictly adhering to the Audio Profile and Director's Notes.";
      if (audioProfile) instructions += `\n\n# AUDIO PROFILE:\n${audioProfile}`;
      if (directorNotes) instructions += `\n\n# DIRECTOR'S NOTES:\n${directorNotes}`;
      
      let additionalModifiers = [];
      if (style) additionalModifiers.push(`Style: ${style}`);
      if (speed && speed !== "1.0x") additionalModifiers.push(`Speed modifier: ${speed}`);
      if (pitch && pitch !== "0%") additionalModifiers.push(`Pitch modifier: ${pitch}`);
      
      if (additionalModifiers.length > 0) {
          instructions += `\n\n# ADDITIONAL MODIFIERS:\n${additionalModifiers.join(", ")}`;
      }

      let textsToProcess = [text];
      let isPauseMode = false;
      if (enablePauseDetection && text.includes('[pause]')) {
         isPauseMode = true;
         textsToProcess = text.split('[pause]');
      }

      const pcmBuffers: Buffer[] = [];
      const silenceBuffer = Buffer.alloc(24000 * 2); // 1 second of silence at 24kHz, 16-bit (2 bytes per sample)

      for (let i = 0; i < textsToProcess.length; i++) {
        const chunk = textsToProcess[i].trim();
        if (chunk) {
          const promptText = `${instructions}\n\n# TRANSCRIPT:\n${chunk}`;

          const response = await ai.models.generateContent({
            model: "gemini-3.1-flash-tts-preview",
            contents: [{ parts: [{ text: promptText }] }],
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: voiceName },
                },
              },
            },
          });

          const base64Audio =
            response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

          if (base64Audio) {
            pcmBuffers.push(Buffer.from(base64Audio, "base64"));
          }
        }
        
        // Add 1s pause after each chunk except the last one
        if (isPauseMode && i < textsToProcess.length - 1) {
           pcmBuffers.push(silenceBuffer);
        }
      }

      if (pcmBuffers.length === 0) {
        throw new Error("No audio generated from the model.");
      }

      const combinedPcmBuffer = Buffer.concat(pcmBuffers);
      const wavBuffer = pcmToWav(combinedPcmBuffer, 24000);
      const wavBase64 = wavBuffer.toString("base64");

      res.json({
        success: true,
        audioUrl: `data:audio/wav;base64,${wavBase64}`,
      });
    } catch (error: any) {
      console.error("TTS Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate TTS" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
