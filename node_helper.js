"use strict";

const https = require("node:https");
const NodeHelper = require("node_helper");
const { normalizeDepartures } = require("./lib/departures");

const MAX_RESPONSE_SIZE = 5 * 1024 * 1024;

module.exports = NodeHelper.create({
  start() {
    this.requests = new Map();
  },

  socketNotificationReceived(notification, payload) {
    if (notification !== "SNCF_FETCH" || !payload?.identifier) {
      return;
    }

    this.fetchDepartures(payload);
  },

  async fetchDepartures(config) {
    const identifier = config.identifier;

    if (this.requests.get(identifier)) {
      return;
    }

    this.requests.set(identifier, true);

    try {
      const apiKey = process.env.SNCF_API_KEY || config.apiKey;
      if (!apiKey) {
        throw new Error(
          "Clé API absente : définir la variable d'environnement SNCF_API_KEY."
        );
      }

      const baseUrl = String(config.apiBaseUrl || "https://api.sncf.com/v1").replace(
        /\/+$/,
        ""
      );
      const coverage = encodeURIComponent(config.coverage || "sncf");
      const stationId = encodeURIComponent(
        config.stationId || "stop_area:SNCF:87723585"
      );
      const count = Number.isInteger(config.maximumEntries)
        ? config.maximumEntries
        : 6;
      const url = new URL(
        `${baseUrl}/coverage/${coverage}/stop_areas/${stationId}/departures`
      );
      url.searchParams.set("count", String(Math.max(1, count)));
      url.searchParams.set("data_freshness", "realtime");

      const data = await this.requestJson(
        url,
        apiKey,
        Number(config.requestTimeout) || 10000
      );
      const departures = normalizeDepartures(data, count);

      this.sendSocketNotification("SNCF_DATA", {
        identifier,
        departures,
        fetchedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error(`[MMM-SNCF] ${error.message}`);
      this.sendSocketNotification("SNCF_ERROR", {
        identifier,
        message: error.message
      });
    } finally {
      this.requests.delete(identifier);
    }
  },

  requestJson(url, apiKey, timeout) {
    return new Promise((resolve, reject) => {
      const request = https.get(
        url,
        {
          headers: {
            Accept: "application/json",
            Authorization: apiKey,
            "User-Agent": "MMM-SNCF/1.0"
          },
          timeout
        },
        (response) => {
          let body = "";

          response.setEncoding("utf8");
          response.on("data", (chunk) => {
            body += chunk;
            if (body.length > MAX_RESPONSE_SIZE) {
              request.destroy(new Error("Réponse SNCF anormalement volumineuse."));
            }
          });
          response.on("end", () => {
            let parsed;
            try {
              parsed = JSON.parse(body);
            } catch {
              reject(new Error(`Réponse SNCF invalide (HTTP ${response.statusCode}).`));
              return;
            }

            if (response.statusCode < 200 || response.statusCode >= 300) {
              const apiMessage =
                parsed?.error?.message || parsed?.message || response.statusMessage;
              reject(
                new Error(`API SNCF HTTP ${response.statusCode}: ${apiMessage}`)
              );
              return;
            }

            resolve(parsed);
          });
        }
      );

      request.on("timeout", () => {
        request.destroy(new Error("Délai d'attente de l'API SNCF dépassé."));
      });
      request.on("error", reject);
    });
  }
});
