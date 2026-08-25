/* =========================================================
   TRADESIM — MARKET DATA SERVICE
   =========================================================

   Responsibilities:
   - Central market-data service
   - Instrument registration
   - Price storage
   - Price updates
   - Market-data events
   - Stale-data detection
   - Service health reporting
   - Provider-ready architecture

   IMPORTANT:
   This service does NOT execute real trades.

========================================================= */

(function (global) {

  "use strict";


  /* =======================================================
     DEPENDENCY
  ======================================================= */

  const BaseService =
    global.TradeSimService;


  if (!BaseService) {

    global.TradeSimLogger?.error(
      "MarketDataService requires TradeSimService."
    );

    return;

  }


  /* =======================================================
     MARKET DATA SERVICE
  ======================================================= */

  class MarketDataService
    extends BaseService {


    constructor(options = {}) {

      super(
        "MarketDataService",
        options
      );


      this.instruments =
        new Map();


      this.providers =
        new Map();


      this.activeProvider =
        null;


      this.lastUpdateAt =
        null;


      this.updateCount =
        0;


      this.errorCount =
        0;


      this.startedAt =
        null;


      this.staleAfterMs =
        Number(
          global.TradeSimConfig
            ?.marketData
            ?.staleDataAfterMs
        ) || 5000;

    }


    /* =======================================================
       INITIALIZE
    ======================================================= */

    async onInitialize(context) {

      this.context =
        context;


      this.startedAt =
        new Date();


      global.TradeSimLogger?.service(
        this.name,
        "Market data service initialized."
      );


      await this.emit(
        "market:service:initialized",
        {

          service:
            this.name

        }
      );

    }


    /* =======================================================
       DESTROY
    ======================================================= */

    async onDestroy() {

      this.instruments.clear();

      this.providers.clear();

      this.activeProvider =
        null;


      this.lastUpdateAt =
        null;


      global.TradeSimLogger?.service(
        this.name,
        "Market data service destroyed."
      );

    }


    /* =======================================================
       EVENT HELPER
    ======================================================= */

    async emit(
      eventName,
      payload = {}
    ) {

      const eventBus =
        this.context?.eventBus ||
        global.TradeSimEventBus;


      if (
        !eventBus ||
        typeof eventBus.emit !== "function"
      ) {

        return null;

      }


      return eventBus.emit(
        eventName,
        payload,
        {
          source:
            this.name
        }
      );

    }


    /* =======================================================
       REGISTER INSTRUMENT
    ======================================================= */

    registerInstrument(
      instrument
    ) {

      if (
        !instrument ||
        typeof instrument !== "object"
      ) {

        throw new TypeError(
          "Instrument must be an object."
        );

      }


      const symbol =
        String(
          instrument.symbol || ""
        )
        .trim()
        .toUpperCase();


      if (!symbol) {

        throw new Error(
          "Instrument symbol is required."
        );

      }


      const existing =
        this.instruments.get(
          symbol
        );


      const normalized = {

        symbol,

        name:
          String(
            instrument.name ||
            symbol
          )
          .trim(),

        price:
          Number.isFinite(
            Number(instrument.price)
          )
            ? Number(instrument.price)
            : null,

        previousClose:
          Number.isFinite(
            Number(
              instrument.previousClose
            )
          )
            ? Number(
                instrument.previousClose
              )
            : null,

        exchange:
          instrument.exchange ||
          null,

        type:
          instrument.type ||
          "EQUITY",

        currency:
          instrument.currency ||
          global.TradeSimConfig
            ?.application
            ?.currency ||
          "INR",

        lastUpdatedAt:
          instrument.price != null
            ? new Date()
            : null

      };


      this.instruments.set(
        symbol,
        {
          ...(existing || {}),
          ...normalized
        }
      );


      return this.instruments.get(
        symbol
      );

    }


    /* =======================================================
       REGISTER MANY INSTRUMENTS
    ======================================================= */

    registerInstruments(
      instruments = []
    ) {

      if (
        !Array.isArray(instruments)
      ) {

        throw new TypeError(
          "Instruments must be an array."
        );

      }


      const registered = [];


      for (
        const instrument
        of instruments
      ) {

        try {

          registered.push(
            this.registerInstrument(
              instrument
            )
          );

        } catch (error) {

          this.errorCount++;

          global.TradeSimLogger?.error(
            "Instrument registration failed:",
            error
          );

        }

      }


      return registered;

    }


    /* =======================================================
       GET INSTRUMENT
    ======================================================= */

    getInstrument(
      symbol
    ) {

      if (
        typeof symbol !== "string"
      ) {

        return undefined;

      }


      return this.instruments.get(
        symbol.trim().toUpperCase()
      );

    }


    /* =======================================================
       GET ALL INSTRUMENTS
    ======================================================= */

    getInstruments() {

      return Array.from(
        this.instruments.values()
      );

    }


    /* =======================================================
       UPDATE PRICE
    ======================================================= */

    async updatePrice(
      symbol,
      price,
      metadata = {}
    ) {

      symbol =
        String(
          symbol || ""
        )
        .trim()
        .toUpperCase();


      const numericPrice =
        Number(price);


      if (!symbol) {

        throw new Error(
          "Symbol is required."
        );

      }


      if (
        !Number.isFinite(
          numericPrice
        ) ||
        numericPrice <= 0
      ) {

        throw new Error(
          "Price must be a positive number."
        );

      }


      let instrument =
        this.instruments.get(
          symbol
        );


      if (!instrument) {

        instrument =
          this.registerInstrument({
            symbol,
            price:
              numericPrice
          });

      }


      const previousPrice =
        Number(
          instrument.price
        );


      const change =
        numericPrice -
        (
          Number.isFinite(
            previousPrice
          )
            ? previousPrice
            : numericPrice
        );


      const changePercent =
        Number.isFinite(
          previousPrice
        ) &&
        previousPrice !== 0
          ? (
              change /
              previousPrice
            ) * 100
          : 0;


      instrument.price =
        numericPrice;


      instrument.previousPrice =
        Number.isFinite(
          previousPrice
        )
          ? previousPrice
          : null;


      instrument.change =
        change;


      instrument.changePercent =
        changePercent;


      instrument.lastUpdatedAt =
        new Date();


      instrument.source =
        metadata.source ||
        this.activeProvider ||
        "unknown";


      this.lastUpdateAt =
        new Date();


      this.updateCount++;


      const payload = {

        symbol,

        price:
          numericPrice,

        previousPrice,

        change,

        changePercent,

        timestamp:
          new Date().toISOString(),

        source:
          instrument.source

      };


      await this.emit(
        "market:price:updated",
        payload
      );


      return {

        ...instrument

      };

    }


    /* =======================================================
       UPDATE MANY PRICES
    ======================================================= */

    async updatePrices(
      updates = [],
      metadata = {}
    ) {

      if (
        !Array.isArray(updates)
      ) {

        throw new TypeError(
          "Price updates must be an array."
        );

      }


      const results = [];


      for (
        const update
        of updates
      ) {

        if (
          !update ||
          typeof update !== "object"
        ) {

          continue;

        }


        try {

          results.push(
            await this.updatePrice(
              update.symbol,
              update.price,
              {
                ...metadata,
                ...(update.metadata || {})
              }
            )
          );

        } catch (error) {

          this.errorCount++;


          global.TradeSimLogger?.error(
            "Price update failed:",
            error
          );

        }

      }


      return results;

    }


    /* =======================================================
       PROVIDER REGISTRATION
    ======================================================= */

    registerProvider(
      name,
      provider
    ) {

      if (
        typeof name !== "string" ||
        !name.trim()
      ) {

        throw new Error(
          "Provider name is required."
        );

      }


      if (
        !provider ||
        typeof provider !== "object"
      ) {

        throw new TypeError(
          "Provider must be an object."
        );

      }


      name =
        name.trim();


      if (
        this.providers.has(name)
      ) {

        throw new Error(
          `Provider already registered: ${name}`
        );

      }


      this.providers.set(
        name,
        provider
      );


      global.TradeSimLogger?.service(
        this.name,
        `Provider registered: ${name}`
      );


      return provider;

    }


    /* =======================================================
       SET ACTIVE PROVIDER
    ======================================================= */

    setActiveProvider(
      name
    ) {

      if (
        !this.providers.has(name)
      ) {

        throw new Error(
          `Provider not found: ${name}`
        );

      }


      this.activeProvider =
        name;


      global.TradeSimLogger?.service(
        this.name,
        `Active provider: ${name}`
      );


      return name;

    }


    /* =======================================================
       GET ACTIVE PROVIDER
    ======================================================= */

    getActiveProvider() {

      if (!this.activeProvider) {

        return null;

      }


      return this.providers.get(
        this.activeProvider
      ) || null;

    }


    /* =======================================================
       MARKET STATUS
    ======================================================= */

    getMarketStatus() {

      if (!this.lastUpdateAt) {

        return {

          status:
            "NO_DATA",

          lastUpdateAt:
            null,

          stale:
            true

        };

      }


      const age =
        Date.now() -
        this.lastUpdateAt.getTime();


      return {

        status:
          age > this.staleAfterMs
            ? "STALE"
            : "LIVE",

        lastUpdateAt:
          this.lastUpdateAt
            .toISOString(),

        ageMs:
          age,

        stale:
          age > this.staleAfterMs

      };

    }


    /* =======================================================
       HEALTH
    ======================================================= */

    health() {

      const baseHealth =
        super.health();


      return {

        ...baseHealth,

        instruments:
          this.instruments.size,

        providers:
          this.providers.size,

        activeProvider:
          this.activeProvider,

        lastUpdateAt:
          this.lastUpdateAt
            ?.toISOString() || null,

        updateCount:
          this.updateCount,

        errorCount:
          this.errorCount,

        market:
          this.getMarketStatus()

      };

    }

  }


  /* =========================================================
     GLOBAL EXPORT
  ========================================================= */

  global.TradeSimMarketDataService =
    MarketDataService;


  /* =========================================================
     SERVICE REGISTRATION
  ========================================================= */

  if (
    global.TradeSimServiceRegistry &&
    typeof global.TradeSimServiceRegistry.register ===
    "function"
  ) {

    const service =
      new MarketDataService();


    /*
     * Current registry architecture expects:
     *
     * register(name, service)
     */

    global.TradeSimServiceRegistry.register(
      service.name,
      service
    );

  }


})(window);
