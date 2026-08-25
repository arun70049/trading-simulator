/* =========================================================
   TRADESIM CORE — SERVICE REGISTRY
   =========================================================

   Services such as:
   - Market Data
   - Authentication
   - Portfolio
   - Orders
   - Analytics
   - Storage

   can register independently.

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
        service === null ||
        service === undefined
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
       GET
    ======================================================= */

    get(name) {

      return this.services.get(
        name
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

      return this.services.has(
        name
      );

    }


    /* =======================================================
       REMOVE
    ======================================================= */

    remove(name) {

      return this.services.delete(
        name
      );

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


  const registry =
    new ServiceRegistry();


  global.TradeSimServiceRegistry =
    registry;


  global.TradeSimServiceRegistryClass =
    ServiceRegistry;


})(window);
