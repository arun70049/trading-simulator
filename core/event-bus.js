/* =========================================================
   TRADESIM CORE — EVENT BUS
   =========================================================

   Purpose:
   - Loose communication between modules
   - No module needs to directly depend on another module
   - Supports future plugins/features
   - Supports async listeners
   - Supports one-time listeners
   - Supports wildcard events
   - Safe listener removal
   - Central event history for debugging

========================================================= */

(function (global) {

  "use strict";


  class EventBus {

    constructor(options = {}) {

      this.listeners = new Map();

      this.onceListeners = new Map();

      this.wildcardListeners = new Set();

      this.history = [];

      this.maxHistory =
        Number.isInteger(options.maxHistory)
          ? options.maxHistory
          : 1000;

      this.debug =
        options.debug === true;

      this.startedAt =
        Date.now();

    }


    /* =======================================================
       INTERNAL VALIDATION
    ======================================================= */

    normalizeEventName(eventName) {

      if (
        typeof eventName !== "string" ||
        !eventName.trim()
      ) {

        throw new TypeError(
          "Event name must be a non-empty string."
        );

      }

      return eventName.trim();

    }


    /* =======================================================
       SUBSCRIBE
    ======================================================= */

    on(eventName, listener) {

      eventName =
        this.normalizeEventName(eventName);


      if (typeof listener !== "function") {

        throw new TypeError(
          "Event listener must be a function."
        );

      }


      if (!this.listeners.has(eventName)) {

        this.listeners.set(
          eventName,
          new Set()
        );

      }


      this.listeners
        .get(eventName)
        .add(listener);


      return () => {

        this.off(
          eventName,
          listener
        );

      };

    }


    /* =======================================================
       SUBSCRIBE ONCE
    ======================================================= */

    once(eventName, listener) {

      eventName =
        this.normalizeEventName(eventName);


      if (typeof listener !== "function") {

        throw new TypeError(
          "Event listener must be a function."
        );

      }


      const wrapper =
        async (...args) => {

          this.off(
            eventName,
            wrapper
          );

          return listener(...args);

        };


      return this.on(
        eventName,
        wrapper
      );

    }


    /* =======================================================
       WILDCARD EVENTS
    ======================================================= */

    onAny(listener) {

      if (typeof listener !== "function") {

        throw new TypeError(
          "Wildcard listener must be a function."
        );

      }


      this.wildcardListeners.add(
        listener
      );


      return () => {

        this.wildcardListeners.delete(
          listener
        );

      };

    }


    /* =======================================================
       REMOVE LISTENER
    ======================================================= */

    off(eventName, listener) {

      eventName =
        this.normalizeEventName(eventName);


      const listeners =
        this.listeners.get(eventName);


      if (!listeners) {
        return false;
      }


      const removed =
        listeners.delete(listener);


      if (listeners.size === 0) {

        this.listeners.delete(
          eventName
        );

      }


      return removed;

    }


    /* =======================================================
       REMOVE ALL LISTENERS FOR EVENT
    ======================================================= */

    clear(eventName = null) {

      if (eventName === null) {

        this.listeners.clear();

        this.onceListeners.clear();

        this.wildcardListeners.clear();

        return;

      }


      eventName =
        this.normalizeEventName(eventName);


      this.listeners.delete(
        eventName
      );

      this.onceListeners.delete(
        eventName
      );

    }


    /* =======================================================
       EVENT HISTORY
    ======================================================= */

    record(eventName, payload) {

      this.history.push({

        event: eventName,

        payload,

        timestamp:
          new Date().toISOString(),

        unixTime:
          Date.now()

      });


      if (
        this.history.length >
        this.maxHistory
      ) {

        this.history.shift();

      }

    }


    /* =======================================================
       EMIT
    ======================================================= */

    async emit(
      eventName,
      payload = {},
      options = {}
    ) {

      eventName =
        this.normalizeEventName(eventName);


      const event = {

        name: eventName,

        payload,

        timestamp:
          new Date().toISOString(),

        unixTime:
          Date.now(),

        source:
          options.source || "unknown",

        id:
          global.crypto?.randomUUID
            ? global.crypto.randomUUID()
            : `${Date.now()}-${Math.random()}`

      };


      this.record(
        eventName,
        payload
      );


      if (this.debug) {

        console.debug(
          "[TradeSim Event]",
          event
        );

      }


      const listeners = [
        ...(this.listeners.get(eventName) || [])
      ];


      const wildcardListeners = [
        ...this.wildcardListeners
      ];


      const results = [];


      for (
        const listener of listeners
      ) {

        try {

          results.push(
            await listener(
              payload,
              event
            )
          );

        } catch (error) {

          console.error(
            `Event listener failed: ${eventName}`,
            error
          );

        }

      }


      for (
        const listener of wildcardListeners
      ) {

        try {

          results.push(
            await listener(
              eventName,
              payload,
              event
            )
          );

        } catch (error) {

          console.error(
            "Wildcard event listener failed.",
            error
          );

        }

      }


      return {

        event,

        results

      };

    }


    /* =======================================================
       SYNCHRONOUS EMIT
       ======================================================= */

    emitSync(
      eventName,
      payload = {},
      options = {}
    ) {

      eventName =
        this.normalizeEventName(eventName);


      const event = {

        name: eventName,

        payload,

        timestamp:
          new Date().toISOString(),

        unixTime:
          Date.now(),

        source:
          options.source || "unknown"

      };


      this.record(
        eventName,
        payload
      );


      const listeners = [
        ...(this.listeners.get(eventName) || [])
      ];


      for (
        const listener of listeners
      ) {

        try {

          listener(
            payload,
            event
          );

        } catch (error) {

          console.error(
            `Event listener failed: ${eventName}`,
            error
          );

        }

      }


      return event;

    }


    /* =======================================================
       INSPECTION
    ======================================================= */

    getHistory(limit = 100) {

      const safeLimit =
        Math.max(
          1,
          Math.min(
            Number(limit) || 100,
            this.maxHistory
          )
        );


      return this.history.slice(
        -safeLimit
      );

    }


    getListenerCount(eventName = null) {

      if (eventName === null) {

        let total = 0;

        for (
          const listeners of
          this.listeners.values()
        ) {

          total += listeners.size;

        }

        return total;

      }


      eventName =
        this.normalizeEventName(eventName);


      return (
        this.listeners
          .get(eventName)
          ?.size || 0
      );

    }

  }


  /* =========================================================
     SINGLE GLOBAL INSTANCE
  ========================================================= */

  const config =
    global.TradeSimConfig || {};


  const eventBus =
    new EventBus({

      debug:
        config.environment?.debug === true,

      maxHistory:
        1000

    });


  global.TradeSimEventBus =
    eventBus;


  global.TradeSimEventBusClass =
    EventBus;


})(window);
