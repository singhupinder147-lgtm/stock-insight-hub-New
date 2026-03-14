import { storage } from "./storage";
import { api } from "@shared/routes";
import https from "https";
import { Server } from "http";

// ✅ Safe fetch function that works on all Node.js versions
function safeFetch(
  url: string,
  headers: Record<string, string> = {}
): Promise<{
  ok: boolean;
  json: () => Promise<any>;
  text: () => Promise<string>;
  headers: { get: (h: string) => string | null };
}> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);

    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json, text/html, */*",
        ...headers,
      },
    };

    const req = https.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        resolve({
          ok: (res.statusCode || 0) >= 200 && (res.statusCode || 0) < 300,

          json: async () => {
            try {
              return JSON.parse(data);
            } catch {
              return null;
            }
          },

          text: async () => data,

          headers: {
            get: (h: string) => {
              const value = res.headers[h.toLowerCase()];
              if (Array.isArray(value)) return value[0];
              return value || null;
            },
          },
        });
      });
    });

    req.on("error", reject);
    req.end();
  });
}

export async function registerRoutes(httpServer: Server) {

  // ✅ SCREENER.IN FUNDAMENTALS API
  httpServer.on("request", async (req: any, res: any) => {

    if (req.url?.startsWith("/api/screener/")) {

      const symbol = req.url.split("/").pop()?.toUpperCase();

      if (!symbol) {
        res.writeHead(400);
        res.end(JSON.stringify({ success: false }));
        return;
      }

      const urls = [
        `https://www.screener.in/api/company/${symbol}/consolidated/`,
        `https://www.screener.in/api/company/${symbol}/`,
      ];

      for (const url of urls) {
        try {

          const response = await safeFetch(url);

          if (!response.ok) continue;

          const contentType = response.headers.get("content-type") || "";

          // ✅ JSON Response
          if (contentType.includes("application/json")) {
            const data = await response.json();

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
              success: true,
              source: "screener",
              data,
            }));

            return;
          }

          // ✅ HTML Response → Parse ratios
          if (contentType.includes("text/html")) {

            const html = await response.text();

            const extractNumber = (pattern: RegExp) => {
              const match = html.match(pattern);
              return match ? parseFloat(match[1].replace(/,/g, "")) : null;
            };

            const parsed = {
              marketCap: extractNumber(/Market Cap[^₹]*₹\s*([\d,]+)/),
              pe: extractNumber(/Stock P\/E[^0-9]*([\d.]+)/),
              roce: extractNumber(/ROCE[^0-9]*([\d.]+)/),
              roe: extractNumber(/ROE[^0-9]*([\d.]+)/),
              faceValue: extractNumber(/Face Value[^₹]*₹\s*([\d.]+)/),
            };

            if (parsed.pe || parsed.roe || parsed.roce) {

              res.writeHead(200, { "Content-Type": "application/json" });

              res.end(JSON.stringify({
                success: true,
                source: "screener-html",
                data: parsed,
              }));

              return;
            }
          }

        } catch (err) {
          console.error("Screener fetch failed:", err);
        }
      }

      res.writeHead(404);
      res.end(
        JSON.stringify({
          success: false,
          message: `Could not fetch data for ${symbol}`,
        })
      );
    }
  });

  // ✅ Get saved fundamentals
  httpServer.on("request", async (req: any, res: any) => {

    if (req.url?.startsWith("/api/stocks/")) {

      const parts = req.url.split("/");
      const id = Number(parts[3]);

      if (!id) return;

      const fund = await storage.getFundamentals(id);

      if (!fund) {
        res.writeHead(200);
        res.end(JSON.stringify(null));
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(fund));
    }
  });
}
