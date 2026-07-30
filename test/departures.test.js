"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  formatSncfTime,
  normalizeDepartures,
  parseSncfDate
} = require("../lib/departures");

test("formate les dates compactes SNCF", () => {
  assert.equal(formatSncfTime("20260730T081500"), "08:15");
  assert.equal(formatSncfTime("invalide"), "--:--");
  assert.equal(parseSncfDate("20260730T081500"), Date.UTC(2026, 6, 30, 8, 15));
});

test("normalise un train à l'heure et un train retardé", () => {
  const departures = normalizeDepartures(
    {
      departures: [
        {
          display_informations: { direction: "Lyon Part Dieu", links: [] },
          stop_date_time: {
            base_departure_date_time: "20260730T081500",
            departure_date_time: "20260730T081500"
          }
        },
        {
          display_informations: {
            direction: "Ambérieu-en-Bugey",
            links: [{ type: "disruption" }]
          },
          stop_date_time: {
            base_departure_date_time: "20260730T083000",
            departure_date_time: "20260730T084200"
          }
        }
      ]
    },
    6
  );

  assert.deepEqual(
    departures.map(({ direction, time, baseTime, delayMinutes, status }) => ({
      direction,
      time,
      baseTime,
      delayMinutes,
      status
    })),
    [
      {
        direction: "Lyon Part Dieu",
        time: "08:15",
        baseTime: "08:15",
        delayMinutes: 0,
        status: "onTime"
      },
      {
        direction: "Ambérieu-en-Bugey",
        time: "08:42",
        baseTime: "08:30",
        delayMinutes: 12,
        status: "delayed"
      }
    ]
  );
});

test("limite le nombre de départs et détecte une suppression", () => {
  const departures = normalizeDepartures(
    {
      departures: [
        {
          display_informations: {
            direction: "Lyon",
            description: "Train supprimé"
          },
          stop_date_time: {
            departure_date_time: "20260730T090000"
          }
        },
        {
          display_informations: { direction: "Genève" },
          stop_date_time: {
            departure_date_time: "20260730T100000"
          }
        }
      ]
    },
    1
  );

  assert.equal(departures.length, 1);
  assert.equal(departures[0].status, "cancelled");
});
