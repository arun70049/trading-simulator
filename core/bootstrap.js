/* =========================================================
   TRADESIM CORE — APPLICATION BOOTSTRAP
   =========================================================

   Responsibilities:
   - Start the application in a controlled order
   - Initialize core dependencies
   - Initialize registered services
   - Initialize registered modules
   - Provide application lifecycle events
   - Prevent duplicate startup
   - Provide safe shutdown
   - Keep startup logic outside app.js

========================================================= */

(function (global) {

  "use strict";


  class TradeSimBootstrap {

    constructor(options = {}) {

      this.options = options;

      this.started = false;

      this.starting = false;

      this.stopping = false;

      this.stopped = false;

      this.startedAt = null;

      this.context = {};

    }


    /* =======================================================
       INTERNAL LOGGER
    ======================================================= */

    log(...args) {

      if (
        global.TradeSimLogger &&
        typeof global.TradeSimLogger.info === "function"
      ) {

        global.TradeSimLogger.info(
          ...args
        );

        return;

      }


      console.info(
        "[TradeSim Bootstrap]",
        ...args
      );

    }


    error(...args) {

      if (
        global.TradeSimLogger &&
        typeof global.TradeSimLogger.error === "function"
      ) {

        global.TradeSimLogger.error(
          ...args
        );

        return;

      }


      console.error(
        "[TradeSim Bootstrap]",
        ...args
      );

    }


    /* =======================================================
       CORE VALIDATION
    ======================================================= */

    validateCore() {

      const missing = [];


      if (
        !global.TradeSimEventBus
      ) {

        missing.push(
          "TradeSimEventBus"
        );

      }


      if (
        !global.TradeSimModuleRegistry
      ) {

        missing.push(
          "TradeSimModuleRegistry"
        );

      }


      if (
        !global.TradeSimServiceRegistry
      ) {

        missing.push(
          "TradeSimServiceRegistry"
        );

      }


      if (missing.length > 0) {

        throw new Error(
          "TradeSim core dependencies missing: " +
          missing.join(", ")
        );

      }


      return true;

    }


    /* =======================================================
       BUILD APPLICATION CONTEXT
    ======================================================= */

    buildContext() {

      this.context = {

        config:
          global.TradeSimConfig || {},

        eventBus:
          global.TradeSimEventBus,

        modules:
          global.TradeSimModuleRegistry,

        services:
          global.TradeSimServiceRegistry,

        logger:
          global.TradeSimLogger,

        startedAt:
          new Date().toISOString(),

        version:
          global.TradeSimConfig?.app?.version ||
          "1.0.0"

      };


      return this.context;

    }


    /* =======================================================
       EMIT LIFECYCLE EVENT
    ======================================================= */

    async emit(
      eventName,
      payload = {}
    ) {

      if (
        !global.TradeSimEventBus
      ) {

        return;

      }


      try {

        await global.TradeSimEventBus.emit(
          eventName,
          payload,
          {
            source:
              "bootstrap"
          }
        );

      } catch (error) {

        this.error(
          "Lifecycle event failed:",
          error
        );

      }

    }


    /* =======================================================
       START
    ======================================================= */

    async start() {

      if (this.started) {

        return this.context;

      }


      if (this.starting) {

        return this.context;

      }


      this.starting = true;

      this.stopped = false;


      try {

        this.log(
          "Starting TradeSim..."
        );


        /* ---------------------------------------------------
           Validate core
        --------------------------------------------------- */

        this.validateCore();


        /* ---------------------------------------------------
           Build shared context
        --------------------------------------------------- */

        this.buildContext();


        await this.emit(
          "app:starting",
          {
            context:
              this.context
          }
        );


        /* ---------------------------------------------------
           Initialize services/modules
           --------------------------------------------------- */

        await this.initializeServices();

        await this.initializeModules();


        /* ---------------------------------------------------
           Application started
        --------------------------------------------------- */

        this.started = true;

        this.starting = false;

        this.startedAt =
          new Date();


        this.context.startedAt =
          this.startedAt.toISOString();


        await this.emit(
          "app:started",
          {
            context:
              this.context
          }
        );


        this.log(
          "TradeSim started successfully."
        );


        return this.context;

      } catch (error) {

        this.starting = false;

        this.started = false;


        this.error(
          "TradeSim startup failed:",
          error
        );


        await this.emit(
          "app:error",
          {
            phase:
              "startup",

            error
          }
        );


        throw error;

      }

    }


    /* =======================================================
       INITIALIZE SERVICES
    ======================================================= */

    async initializeServices() {

      const services =
        global.TradeSimServiceRegistry;


      if (!services) {

        return;

      }


      const names =
        services.list();


      this.log(
        `Initializing ${names.length} service(s)...`
      );


      for (
        const name of names
      ) {

        const service =
          services.get(name);


        if (!service) {
          continue;
        }


        try {

          if (
            typeof service.initialize ===
            "function"
          ) {

            await service.initialize(
              this.context
            );

          }


          this.log(
            `Service initialized: ${name}`
          );


          await this.emit(
            "service:initialized",
            {
              name,
              service
            }
          );


        } catch (error) {

          this.error(
            `Service initialization failed: ${name}`,
            error
          );


          throw error;

        }

      }

    }


    /* =======================================================
       INITIALIZE MODULES
    ======================================================= */

    async initializeModules() {

      const modules =
        global.TradeSimModuleRegistry;


      if (!modules) {

        return;

      }


      const names =
        modules.list();


      this.log(
        `Initializing ${names.length} module(s)...`
      );


      for (
        const name of names
      ) {

        try {

          await modules.initialize(
            name,
            this.context
          );


          await this.emit(
            "module:initialized",
            {
              name,
              module:
                modules.get(name)
            }
          );


        } catch (error) {

          this.error(
            `Module initialization failed: ${name}`,
            error
          );


          throw error;

        }

      }

    }


    /* =======================================================
       SHUTDOWN
    ======================================================= */

    async stop() {

      if (
        this.stopping
      ) {

        return;

      }


      if (
        !this.started
      ) {

        return;

      }


      this.stopping = true;


      try {

        this.log(
          "Stopping TradeSim..."
        );


        await this.emit(
          "app:stopping",
          {
            context:
              this.context
          }
        );


        /* ---------------------------------------------------
           Destroy modules
        --------------------------------------------------- */

        if (
          global.TradeSimModuleRegistry
        ) {

          await global.TradeSimModuleRegistry
            .destroyAll();

        }


        /* ---------------------------------------------------
           Destroy services
        --------------------------------------------------- */

        if (
          global.TradeSimServiceRegistry
        ) {

          const serviceNames =
            global.TradeSimServiceRegistry.list()
              .reverse();


          for (
            const name of serviceNames
          ) {

            const service =
              global.TradeSimServiceRegistry.get(
                name
              );


            try {

              if (
                service &&
                typeof service.destroy ===
                "function"
              ) {

                await service.destroy();

              }

            } catch (error) {

              this.error(
                `Service shutdown failed: ${name}`,
                error
              );

            }

          }

        }


        this.started = false;

        this.stopping = false;

        this.stopped = true;


        await this.emit(
          "app:stopped",
          {}
        );


        this.log(
          "TradeSim stopped."
        );


      } catch (error) {

        this.stopping = false;

        this.error(
          "TradeSim shutdown failed:",
          error
        );

        throw error;

      }

    }


    /* =======================================================
       STATUS
    ======================================================= */

    status() {

      return {

        started:
          this.started,

        starting:
          this.starting,

        stopping:
          this.stopping,

        stopped:
          this.stopped,

        startedAt:
          this.startedAt
            ?.toISOString() || null,

        modules:
          global.TradeSimModuleRegistry
            ?.status?.() || [],

        services:
          global.TradeSimServiceRegistry
            ?.list?.() || []

      };

    }

  }


  /* =========================================================
     GLOBAL BOOTSTRAP INSTANCE
  ========================================================= */

  const bootstrap =
    new TradeSimBootstrap();


  global.TradeSimBootstrap =
    bootstrap;


  global.TradeSimBootstrapClass =
    TradeSimBootstrap;


})(window);
