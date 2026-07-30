/* global Log, Module */

Module.register("MMM-SNCF", {
  defaults: {
    apiBaseUrl: "https://api.sncf.com/v1",
    apiKey: "",
    coverage: "sncf",
    stationId: "stop_area:SNCF:87723585",
    maximumEntries: 6,
    updateInterval: 3 * 60 * 1000,
    requestTimeout: 10 * 1000,
    animationSpeed: 500,
    showLastUpdate: false
  },

  start() {
    Log.info(`Starting module: ${this.name}`);
    this.departures = [];
    this.error = null;
    this.loaded = false;
    this.fetchTimer = null;

    this.fetchData();
    this.scheduleNextFetch();
  },

  suspend() {
    this.clearFetchTimer();
  },

  resume() {
    this.fetchData();
    this.scheduleNextFetch();
  },

  getStyles() {
    return ["MMM-SNCF.css"];
  },

  getDom() {
    const wrapper = document.createElement("div");
    wrapper.className = "mmm-sncf";

    if (!this.loaded && this.departures.length === 0) {
      const loading = document.createElement("div");
      loading.className = "sncf-message dimmed";
      loading.textContent = "Chargement des prochains trains…";
      wrapper.appendChild(loading);
      return wrapper;
    }

    if (this.error && this.departures.length === 0) {
      wrapper.appendChild(this.buildError());
      return wrapper;
    }

    const table = document.createElement("table");
    table.className = "sncf-departures";
    const body = document.createElement("tbody");

    this.departures.forEach((departure) => {
      body.appendChild(this.buildDepartureRow(departure));
    });

    table.appendChild(body);
    wrapper.appendChild(table);

    if (this.departures.length === 0) {
      const empty = document.createElement("div");
      empty.className = "sncf-message dimmed";
      empty.textContent = "Aucun départ annoncé.";
      wrapper.appendChild(empty);
    }

    if (this.error) {
      wrapper.appendChild(this.buildError(true));
    } else if (this.config.showLastUpdate && this.fetchedAt) {
      const update = document.createElement("div");
      update.className = "sncf-update dimmed xsmall";
      update.textContent = `Mis à jour à ${new Intl.DateTimeFormat("fr-FR", {
        hour: "2-digit",
        minute: "2-digit"
      }).format(this.fetchedAt)}`;
      wrapper.appendChild(update);
    }

    return wrapper;
  },

  buildDepartureRow(departure) {
    const row = document.createElement("tr");
    row.className = `sncf-departure sncf-${departure.status}`;

    const statusCell = document.createElement("td");
    statusCell.className = "sncf-status";
    const status = document.createElement("span");

    if (departure.status === "cancelled") {
      status.className = "sncf-status-label sncf-alert";
      status.textContent = "supprimé";
    } else if (departure.status === "delayed") {
      status.className = "sncf-status-label sncf-alert";
      status.textContent =
        departure.delayMinutes > 0
          ? `+${departure.delayMinutes} min`
          : "perturbé";
    } else {
      status.className = "sncf-status-label";
      status.textContent = "à l'heure";
    }

    statusCell.appendChild(status);

    const detailsCell = document.createElement("td");
    detailsCell.className = "sncf-details";
    const timeLine = document.createElement("div");
    timeLine.className = "sncf-time-line";

    if (
      departure.status === "delayed" &&
      departure.baseTime !== departure.time
    ) {
      const baseTime = document.createElement("span");
      baseTime.className = "sncf-base-time";
      baseTime.textContent = departure.baseTime;
      timeLine.appendChild(baseTime);
    }

    const time = document.createElement("time");
    time.className = "sncf-time";
    time.textContent = departure.time;
    timeLine.appendChild(time);

    const direction = document.createElement("div");
    direction.className = "sncf-direction";
    direction.textContent = departure.direction;

    detailsCell.appendChild(timeLine);
    detailsCell.appendChild(direction);
    row.appendChild(statusCell);
    row.appendChild(detailsCell);

    return row;
  },

  buildError(compact = false) {
    const error = document.createElement("div");
    error.className = compact
      ? "sncf-error sncf-error-compact"
      : "sncf-message sncf-error";
    error.textContent = compact
      ? "Mise à jour SNCF indisponible"
      : this.error || "Données SNCF indisponibles.";
    return error;
  },

  socketNotificationReceived(notification, payload) {
    if (!payload || payload.identifier !== this.identifier) {
      return;
    }

    if (notification === "SNCF_DATA") {
      this.departures = payload.departures || [];
      this.fetchedAt = new Date(payload.fetchedAt);
      this.error = null;
      this.loaded = true;
      this.updateDom(this.config.animationSpeed);
    } else if (notification === "SNCF_ERROR") {
      this.error = payload.message;
      this.loaded = true;
      this.updateDom(this.config.animationSpeed);
    }
  },

  fetchData() {
    this.sendSocketNotification("SNCF_FETCH", {
      ...this.config,
      identifier: this.identifier
    });
  },

  scheduleNextFetch() {
    this.clearFetchTimer();
    const interval = Math.max(60 * 1000, Number(this.config.updateInterval));
    this.fetchTimer = setInterval(() => this.fetchData(), interval);
  },

  clearFetchTimer() {
    if (this.fetchTimer) {
      clearInterval(this.fetchTimer);
      this.fetchTimer = null;
    }
  }
});
