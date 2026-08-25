/* =========================================================
   TRADESIM SERVICE BASE
   =========================================================

   Common lifecycle contract for all TradeSim services.

   Future services can extend this class without modifying
   the core bootstrap system.

========================================================= */

(function (global) {

  "use strict";


  class TradeSimService {

    constructor(name, options = {}) {

      if (
        typeof name !== "string" ||
        !name.trim()
      ) {

        throw new Error(
          "Service name is required."
        );

      }


      this.name =
        name.trim();


      this.options =
        options || {};


      this.initialized =
        false;


      this.destroyed =
        false;


      this.createdAt =
        new Date().toISOString();

    }


    /* =======================================================
       INITIALIZE
    ======================================================= */

    async initialize(context = {}) {

      if (this.initialized) {

        return this;

      }


      this.context =
        context;


      await this.onInitialize(
        context
      );


      this.initialized =
        true;


      this.destroyed =
        false;


      global.TradeSimLogger?.service(
        this.name,
        "Initialized"
      );


      return this;

    }


    /* =======================================================
       INITIALIZATION HOOK
    ======================================================= */

    async onInitialize() {

      /*
       * Override in child services.
       */

    }


    /* =======================================================
       DESTROY
    ======================================================= */

    async destroy() {

      if (
        this.destroyed
      ) {

        return;

      }


      await this.onDestroy();


      this.initialized =
        false;


      this.destroyed =
        true;


      global.TradeSimLogger?.service(
        this.name,
        "Destroyed"
      );

    }


    /* =======================================================
       DESTROY HOOK
    ======================================================= */

    async onDestroy() {

      /*
       * Override in child services.
       */

    }


    /* =======================================================
       HEALTH CHECK
    ======================================================= */

    health() {

      return {

        name:
          this.name,

        initialized:
          this.initialized,

        destroyed:
          this.destroyed,

        createdAt:
          this.createdAt

      };

    }


    /* =======================================================
       CONTEXT
    ======================================================= */

    getContext() {

      return this.context || {};

    }

  }


  global.TradeSimService =
    TradeSimService;


  global.TradeSimServiceClass =
    TradeSimService;


})(window);
