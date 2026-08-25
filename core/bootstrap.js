/* =========================================================
   TRADESIM CORE — APPLICATION BOOTSTRAP
   =========================================================

   Responsibilities:
   - Start the application in a controlled order
   - Validate core dependencies
   - Build shared application context
   - Initialize registered services
   - Initialize registered modules
   - Emit application lifecycle events
   - Prevent duplicate startup
   - Provide safe shutdown
   - Provide runtime status
   - Keep startup logic outside app.js

========================================================= */

(function (global) {

  "use strict";


  class TradeSimBootstrap {

    constructor(options = {}) {

      this.options =
        options || {};

      this.started =
        false;

      this.starting =
        false;

      this.stopping =
        false;

      this.stopped =
        false;

      this.startedAt =
        null;

      this.context =
        {};

    }


    /* =======================================================
       LOGGER
    ======================================================= */

    log(...args) {

      if (
        global.TradeSimLogger &&
        typeof global.TradeSimLogger.info ===
        "function"
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
        typeof global.TradeSimLogger.error ===
        "function"
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


      if (
        missing.length > 0
      ) {

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

      const config =
        global.TradeSimConfig || {};


      this.context = {

        config,

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
          config.application?.version ||
          config.environment?.version ||
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
        !global.TradeSimEventBus ||
        typeof global.TradeSimEventBus.emit !==
        "function"
      ) {

        return null;

      }


      try {

        return await global.TradeSimEventBus.emit(
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

        return null;

      }

    }


    /* =======================================================
       START
    ======================================================= */

    async start() {

      /* -----------------------------------------------------
         Already running
      ----------------------------------------------------- */

      if (
        this.started
      ) {

        return this.context;

      }


      /* -----------------------------------------------------
         Startup already in progress
      ----------------------------------------------------- */

      if (
        this.starting
      ) {

        return this.context;

      }


      this.starting =
        true;

      this.stopped =
        false;


      try {

        this.log(
          "Starting TradeSim..."
        );


        /* ---------------------------------------------------
           Validate core
        --------------------------------------------------- */

        this.validateCore();


        /* ---------------------------------------------------
           Build context
        --------------------------------------------------- */

        this.buildContext();


        /* ---------------------------------------------------
           Startup lifecycle event
        --------------------------------------------------- */

        await this.emit(
          "app:starting",
          {
            context:
              this.context
          }
        );


        /* ---------------------------------------------------
           Initialize services first
        --------------------------------------------------- */

        await this.initializeServices();


        /* ---------------------------------------------------
           Initialize modules second
        --------------------------------------------------- */

        await this.initializeModules();


        /* ---------------------------------------------------
           Mark application started
        --------------------------------------------------- */

        this.started =
          true;

        this.starting =
          false;

        this.stopped =
          false;

        this.startedAt =
          new Date();


        this.context.startedAt =
          this.startedAt.toISOString();


        /* ---------------------------------------------------
           Started lifecycle event
        --------------------------------------------------- */

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

        this.starting =
          false;

        this.started =
          false;


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

      const registry =
        global.TradeSimServiceRegistry;


      if (
        !registry
      ) {

        return;

      }


      if (
        typeof registry.list !==
        "function"
      ) {

        throw new Error(
          "TradeSimServiceRegistry.list() is unavailable."
        );

      }


      const names =
        registry.list();


      this.log(
        `Initializing ${names.length} service(s)...`
      );


      for (
        const name of names
      ) {

        const service =
          typeof registry.get ===
          "function"
            ? registry.get(name)
            : null;


        if (
          !service
        ) {

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

      const registry =
        global.TradeSimModuleRegistry;


      if (
        !registry
      ) {

        return;

      }


      if (
        typeof registry.list !==
        "function"
      ) {

        throw new Error(
          "TradeSimModuleRegistry.list() is unavailable."
        );

      }


      const names =
        registry.list();


      this.log(
        `Initializing ${names.length} module(s)...`
      );


      for (
        const name of names
      ) {

        try {

          if (
            typeof registry.initialize !==
            "function"
          ) {

            throw new Error(
              "TradeSimModuleRegistry.initialize() is unavailable."
            );

          }


          await registry.initialize(
            name,
            this.context
          );


          this.log(
            `Module initialized: ${name}`
          );


          await this.emit(
            "module:initialized",
            {
              name,

              module:
                typeof registry.get ===
                "function"
                  ? registry.get(name)
                  : null

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


      this.stopping =
        true;


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
           Destroy modules first
        --------------------------------------------------- */

        if (
          global.TradeSimModuleRegistry &&
          typeof global.TradeSimModuleRegistry
            .destroyAll ===
          "function"
        ) {

          await global.TradeSimModuleRegistry
            .destroyAll();

        }


        /* ---------------------------------------------------
           Destroy services in reverse order
        --------------------------------------------------- */

        if (
          global.TradeSimServiceRegistry
        ) {

          const registry =
            global.TradeSimServiceRegistry;


          if (
            typeof registry.list ===
            "function"
          ) {

            const serviceNames =
              registry
                .list()
                .slice()
                .reverse();


            for (
              const name of serviceNames
            ) {

              const service =
                typeof registry.get ===
                "function"
                  ? registry.get(name)
                  : null;


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

        }


        /* ---------------------------------------------------
           Reset lifecycle state
        --------------------------------------------------- */

        this.started =
          false;

        this.starting =
          false;

        this.stopping =
          false;

        this.stopped =
          true;


        await this.emit(
          "app:stopped",
          {
            context:
              this.context
          }
        );


        this.log(
          "TradeSim stopped."
        );


      } catch (error) {

        this.stopping =
          false;


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
            ?.toISOString() ||
          null,

        version:
          this.context.version ||
          null,

        modules:
          global.TradeSimModuleRegistry
            ?.status?.() ||
          [],

        services:
          global.TradeSimServiceRegistry
            ?.list?.() ||
          []

      };

    }


    /* =======================================================
       GET CONTEXT
    ======================================================= */

    getContext() {

      return this.context;

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
