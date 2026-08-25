/* =========================================================
   TRADESIM CORE — LOGGER
========================================================= */

(function (global) {

  "use strict";


  const config =
    global.TradeSimConfig || {};


  const debugEnabled =
    config.environment?.debug === true;


  const PREFIX =
    "[TradeSim]";


  function formatMessage(
    level,
    message
  ) {

    return `${PREFIX} [${level}] ${message}`;

  }


  const Logger = {

    debug(...args) {

      if (!debugEnabled) {
        return;
      }

      console.debug(
        formatMessage("DEBUG", args[0]),
        ...args.slice(1)
      );

    },


    info(...args) {

      console.info(
        formatMessage("INFO", args[0]),
        ...args.slice(1)
      );

    },


    warn(...args) {

      console.warn(
        formatMessage("WARN", args[0]),
        ...args.slice(1)
      );

    },


    error(...args) {

      console.error(
        formatMessage("ERROR", args[0]),
        ...args.slice(1)
      );

    },


    module(
      moduleName,
      ...args
    ) {

      console.info(
        `${PREFIX} [MODULE:${moduleName}]`,
        ...args
      );

    },


    service(
      serviceName,
      ...args
    ) {

      console.info(
        `${PREFIX} [SERVICE:${serviceName}]`,
        ...args
      );

    },


    market(
      ...args
    ) {

      if (!debugEnabled) {
        return;
      }

      console.debug(
        `${PREFIX} [MARKET]`,
        ...args
      );

    },


    order(
      ...args
    ) {

      console.info(
        `${PREFIX} [ORDER]`,
        ...args
      );

    },


    analytics(
      ...args
    ) {

      if (!debugEnabled) {
        return;
      }

      console.debug(
        `${PREFIX} [ANALYTICS]`,
        ...args
      );

    }

  };


  global.TradeSimLogger =
    Object.freeze(Logger);


})(window);
