/* =========================================================
   TRADESIM SERVICE REGISTRY
   =========================================================

   Central registry for all TradeSim services.

   Responsibilities:
   - Register services
   - Retrieve services
   - Initialize services
   - Destroy services
   - Check service health

========================================================= */

(function (global) {

  "use strict";


  class TradeSimServiceRegistry {

    constructor() {

      this.services =
        new Map();

    }


    /* =======================================================
       REGISTER SERVICE
    ======================================================= */

    register(service) {

      if (!service) {

        throw new Error(
          "Service is required."
        );

      }


      if (
        typeof service.name !== "string" ||
        !service.name.trim()
      ) {

        throw new Error(
          "Service must have a valid name."
        );

      }


      const name =
        service.name.trim();


      if (
        this.services.has(name)
      ) {

        throw new Error(
          `Service "${name}" is already registered.`
        );

      }


      this.services.set(
        name,
        service
      );


      global.TradeSimLogger?.service(
        name,
        "Registered"
      );


      return service;

    }


    /* =======================================================
       UNREGISTER SERVICE
    ======================================================= */

    unregister(name) {

      if (
        typeof name !== "string" ||
        !name.trim()
      ) {

        return false;

      }


      const serviceName =
        name.trim();


      const service =
        this.services.get(
          serviceName
        );


      if (!service) {

        return false;

      }


      this.services.delete(
        serviceName
      );


      global.TradeSimLogger?.service(
        serviceName,
        "Unregistered"
      );


      return true;

    }


    /* =======================================================
       GET SERVICE
    ======================================================= */

    get(name) {

      if (
        typeof name !== "string"
      ) {

        return undefined;

      }


      return this.services.get(
        name.trim()
      );

    }


    /* =======================================================
       HAS SERVICE
    ======================================================= */

    has(name) {

      if (
        typeof name !== "string"
      ) {

        return false;

      }


      return this.services.has(
        name.trim()
      );

    }


    /* =======================================================
       INITIALIZE ALL SERVICES
    ======================================================= */

    async initializeAll(
      context = {}
    ) {

      for (
        const service
        of this.services.values()
      ) {

        await service.initialize(
          context
        );

      }


      return this;

    }


    /* =======================================================
       DESTROY ALL SERVICES
    ======================================================= */

    async destroyAll() {

      const services =
        Array.from(
          this.services.values()
        ).reverse();


      for (
        const service
        of services
      ) {

        await service.destroy();

      }


      return this;

    }


    /* =======================================================
       LIST SERVICES
    ======================================================= */

    list() {

      return Array.from(
        this.services.keys()
      );

    }


    /* =======================================================
       HEALTH CHECK
    ======================================================= */

    health() {

      const result = {};


      for (
        const [
          name,
          service
        ]
        of this.services.entries()
      ) {

        result[name] =
          typeof service.health === "function"
            ? service.health()
            : {
                name: name,
                initialized: false,
                destroyed: false
              };

      }


      return result;

    }


    /* =======================================================
       CLEAR REGISTRY
    ======================================================= */

    clear() {

      this.services.clear();

    }

  }


  /* =========================================================
     GLOBAL EXPORT
  ========================================================= */

  global.TradeSimServiceRegistry =
    TradeSimServiceRegistry;


  global.TradeSimRegistry =
    new TradeSimServiceRegistry();


})(window);
