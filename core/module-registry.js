/* =========================================================
   TRADESIM CORE — MODULE REGISTRY
   =========================================================

   Future modules can register themselves without modifying
   the core application.

========================================================= */

(function (global) {

  "use strict";


  class ModuleRegistry {

    constructor() {

      this.modules =
        new Map();

      this.initialized =
        new Set();

    }


    /* =======================================================
       REGISTER
    ======================================================= */

    register(module) {

      if (
        !module ||
        typeof module !== "object"
      ) {

        throw new TypeError(
          "Module must be an object."
        );

      }


      if (
        typeof module.name !== "string" ||
        !module.name.trim()
      ) {

        throw new Error(
          "Module must have a valid name."
        );

      }


      const name =
        module.name.trim();


      if (
        this.modules.has(name)
      ) {

        throw new Error(
          `Module already registered: ${name}`
        );

      }


      this.modules.set(
        name,
        module
      );


      global.TradeSimLogger?.module(
        name,
        "Registered"
      );


      return module;

    }


    /* =======================================================
       UNREGISTER
    ======================================================= */

    unregister(name) {

      if (!this.modules.has(name)) {

        return false;

      }


      const module =
        this.modules.get(name);


      try {

        if (
          typeof module.destroy ===
          "function"
        ) {

          module.destroy();

        }

      } catch (error) {

        global.TradeSimLogger?.error(
          `Failed to destroy module ${name}`,
          error
        );

      }


      this.initialized.delete(
        name
      );


      return this.modules.delete(
        name
      );

    }


    /* =======================================================
       GET
    ======================================================= */

    get(name) {

      return this.modules.get(
        name
      );

    }


    /* =======================================================
       HAS
    ======================================================= */

    has(name) {

      return this.modules.has(
        name
      );

    }


    /* =======================================================
       INITIALIZE
    ======================================================= */

    async initialize(
      name,
      context = {}
    ) {

      const module =
        this.modules.get(name);


      if (!module) {

        throw new Error(
          `Module not found: ${name}`
        );

      }


      if (
        this.initialized.has(name)
      ) {

        return module;

      }


      if (
        typeof module.initialize ===
        "function"
      ) {

        await module.initialize(
          context
        );

      }


      this.initialized.add(
        name
      );


      global.TradeSimLogger?.module(
        name,
        "Initialized"
      );


      return module;

    }


    /* =======================================================
       INITIALIZE ALL
    ======================================================= */

    async initializeAll(
      context = {}
    ) {

      for (
        const [
          name
        ] of this.modules
      ) {

        await this.initialize(
          name,
          context
        );

      }


      return this.list();

    }


    /* =======================================================
       DESTROY ALL
    ======================================================= */

    async destroyAll() {

      const modules =
        Array.from(
          this.modules.entries()
        ).reverse();


      for (
        const [
          name,
          module
        ] of modules
      ) {

        try {

          if (
            typeof module.destroy ===
            "function"
          ) {

            await module.destroy();

          }

        } catch (error) {

          global.TradeSimLogger?.error(
            `Module destroy failed: ${name}`,
            error
          );

        }

      }


      this.initialized.clear();

    }


    /* =======================================================
       LIST
    ======================================================= */

    list() {

      return Array.from(
        this.modules.keys()
      );

    }


    /* =======================================================
       STATUS
    ======================================================= */

    status() {

      return this.list().map(
        name => ({

          name,

          initialized:
            this.initialized.has(name)

        })
      );

    }

  }


  const registry =
    new ModuleRegistry();


  global.TradeSimModuleRegistry =
    registry;


  global.TradeSimModuleRegistryClass =
    ModuleRegistry;


})(window);
