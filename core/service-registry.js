/* =========================================================
   TRADESIM CORE — SERVICE REGISTRY
   =========================================================

   Responsibilities:
   - Register services
   - Retrieve services
   - Initialize individual services
   - Initialize all services
   - Destroy individual services
   - Destroy all services
   - Check service health
   - Maintain centralized service lifecycle

========================================================= */

(function (global) {

  "use strict";


  class ServiceRegistry {

    constructor() {

      this.services =
        new Map();

    }


    /* =======================================================
       REGISTER
    ======================================================= */

    register(
      name,
      service
    ) {

      if (
        typeof name !== "string" ||
        !name.trim()
      ) {

        throw new Error(
          "Service name is required."
        );

      }


      if (
        !service ||
        typeof service !== "object"
      ) {

        throw new Error(
          `Invalid service: ${name}`
        );

      }


      name =
        name.trim();


      if (
        this.services.has(name)
      ) {

        throw new Error(
          `Service already registered: ${name}`
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
       REPLACE
    ======================================================= */

    replace(
      name,
      service
    ) {

      if (
        typeof name !== "string" ||
        !name.trim()
      ) {

        throw new Error(
          "Service name is required."
        );

      }


      if (
        !service ||
        typeof service !== "object"
      ) {

        throw new Error(
          `Invalid service: ${name}`
        );

      }


      name =
        name.trim();


      this.services.set(
        name,
        service
      );


      global.TradeSimLogger?.service(
        name,
        "Replaced"
      );


      return service;

    }


    /* =======================================================
       UNREGISTER
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


      const removed =
        this.services.delete(
          serviceName
        );


      if (removed) {

        global.TradeSimLogger?.service(
          serviceName,
          "Unregistered"
        );

      }


      return removed;

    }


    /* =======================================================
       GET
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
       REQUIRE
    ======================================================= */

    require(name) {

      const service =
        this.get(name);


      if (
        service === undefined
      ) {

        throw new Error(
          `Required service not found: ${name}`
        );

      }


      return service;

    }


    /* =======================================================
       HAS
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
       INITIALIZE ONE SERVICE
    ======================================================= */

    async initialize(
      name,
      context = {}
    ) {

      const service =
        this.require(name);


      if (
        typeof service.initialize ===
        "function"
      ) {

        await service.initialize(
          context
        );

      }


      global.TradeSimLogger?.service(
        name,
        "Initialized"
      );


      return service;

    }


    /* =======================================================
       INITIALIZE ALL SERVICES
    ======================================================= */

    async initializeAll(
      context = {}
    ) {

      for (
        const name
        of this.services.keys()
      ) {

        await this.initialize(
          name,
          context
        );

      }


      return this;

    }


    /* =======================================================
       DESTROY ONE SERVICE
    ======================================================= */

    async destroy(name) {

      const service =
        this.get(name);


      if (!service) {

        return false;

      }


      if (
        typeof service.destroy ===
        "function"
      ) {

        await service.destroy();

      }


      global.TradeSimLogger?.service(
        name,
        "Destroyed"
      );


      return true;

    }


    /* =======================================================
       DESTROY ALL SERVICES
    ======================================================= */

    async destroyAll() {

      const names =
        Array.from(
          this.services.keys()
        ).reverse();


      for (
        const name
        of names
      ) {

        try {

          await this.destroy(
            name
          );

        } catch (error) {

          global.TradeSimLogger?.error?.(
            `Service destroy failed: ${name}`,
            error
          );

        }

      }


      return this;

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

        try {

          result[name] =
            typeof service.health ===
            "function"

              ? service.health()

              : {
                  name,
                  initialized:
                    false,
                  destroyed:
                    false
                };

        } catch (error) {

          result[name] = {

            name,

            healthy:
              false,

            error:
              String(
                error?.message ||
                error
              )

          };

        }

      }


      return result;

    }


    /* =======================================================
       LIST
    ======================================================= */

    list() {

      return Array.from(
        this.services.keys()
      );

    }


    /* =======================================================
       CLEAR
    ======================================================= */

    clear() {

      this.services.clear();

    }

  }


  /* =========================================================
     GLOBAL SERVICE REGISTRY
  ========================================================= */

  const registry =
    new ServiceRegistry();


  global.TradeSimServiceRegistry =
    registry;


  global.TradeSimServiceRegistryClass =
    ServiceRegistry;


})(window);
