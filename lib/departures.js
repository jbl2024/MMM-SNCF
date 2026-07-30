"use strict";

function formatSncfTime(value) {
  if (typeof value !== "string" || value.length < 13) {
    return "--:--";
  }

  return `${value.slice(9, 11)}:${value.slice(11, 13)}`;
}

function parseSncfDate(value) {
  if (typeof value !== "string" || !/^\d{8}T\d{6}$/.test(value)) {
    return null;
  }

  return Date.UTC(
    Number(value.slice(0, 4)),
    Number(value.slice(4, 6)) - 1,
    Number(value.slice(6, 8)),
    Number(value.slice(9, 11)),
    Number(value.slice(11, 13)),
    Number(value.slice(13, 15))
  );
}

function hasDisruption(departure) {
  const links = departure?.display_informations?.links;
  return Array.isArray(links) && links.some((link) => link?.type === "disruption");
}

function isCancelled(departure) {
  const text = [
    departure?.display_informations?.description,
    departure?.display_informations?.additional_informations,
    departure?.stop_date_time?.additional_informations
  ]
    .flat()
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return text.includes("supprim") || text.includes("cancel");
}

function normalizeDeparture(departure, index) {
  const stopDateTime = departure?.stop_date_time || {};
  const actual = stopDateTime.departure_date_time;
  const base = stopDateTime.base_departure_date_time || actual;
  const actualDate = parseSncfDate(actual);
  const baseDate = parseSncfDate(base);
  const delayMinutes =
    actualDate !== null && baseDate !== null
      ? Math.round((actualDate - baseDate) / 60000)
      : 0;
  const cancelled = isCancelled(departure);
  const disrupted = hasDisruption(departure);

  return {
    id:
      departure?.links?.find((link) => link?.type === "vehicle_journey")?.id ||
      `${actual || "departure"}-${index}`,
    direction: departure?.display_informations?.direction || "Destination inconnue",
    time: formatSncfTime(actual),
    baseTime: formatSncfTime(base),
    delayMinutes,
    status: cancelled
      ? "cancelled"
      : delayMinutes !== 0 || disrupted
        ? "delayed"
        : "onTime"
  };
}

function normalizeDepartures(payload, count) {
  if (!payload || !Array.isArray(payload.departures)) {
    throw new Error("La réponse SNCF ne contient pas de départs.");
  }

  const limit = Number.isInteger(count) && count > 0 ? count : 6;
  return payload.departures.slice(0, limit).map(normalizeDeparture);
}

module.exports = {
  formatSncfTime,
  normalizeDeparture,
  normalizeDepartures,
  parseSncfDate
};
