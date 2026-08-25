/* =========================================================
   TRADESIM — RUNTIME CONFIGURATION
   =========================================================

   IMPORTANT:
   This file contains configuration only.

   Application logic should NOT be placed here.

   Future changes such as:
   - feature flags
   - refresh intervals
   - market-data behaviour
   - development/debug mode
   - fallback behaviour
   - UI limits

   should preferably be controlled from this file.

========================================================= */

(function () {

  "use strict";


  /* =======================================================
     ENVIRONMENT
  ======================================================= */

  const environment = {

    name: "production",

    version: "1.0.0",

    debug: false,

    simulationMode: true

  };


  /* =======================================================
     APPLICATION
  ======================================================= */

  const application = {

    name: "TradeSim",

    currency: "INR",

    currencySymbol: "₹",

    locale: "en-IN",

    defaultStartingCapital: 100000

  };


  /* =======================================================
     MARKET DATA
  ======================================================= */

  const marketData = {

    enabled: true,

    mode: "provider",

    refreshIntervalMs: 1000,

    staleDataAfterMs: 5000,

    requestTimeoutMs: 5000,

    retryAttempts: 3,

    retryDelayMs: 1000,

    maxSymbolsPerRequest: 100,

    cacheEnabled: true,

    cacheDurationMs: 1000,

    allowFallbackProvider: true,

    allowSimulationFallback: true

  };


  /* =======================================================
     MARKET COVERAGE
  ======================================================= */

  const markets = {

    india: {

      enabled: true,

      exchanges: [

        "NSE",

        "BSE"

      ]

    },

    indices: [

      "NIFTY 50",

      "SENSEX"

    ],

    maximumInstruments: 10000

  };


  /* =======================================================
     TRADING
  ======================================================= */

  const trading = {

    enabled: true,

    simulationOnly: true,

    allowMarketOrders: true,

    allowLimitOrders: true,

    allowStopOrders: true,

    allowStopLossOrders: true,

    allowBracketOrders: false,

    allowAfterMarketOrders: false,

    allowShortSelling: false,

    allowIntraday: true,

    allowDelivery: true,

    fractionalQuantity: false,

    minimumQuantity: 1,

    maximumOrderValue: 10000000

  };


  /* =======================================================
     PORTFOLIO
  ======================================================= */

  const portfolio = {

    enabled: true,

    calculateUnrealizedPnl: true,

    calculateRealizedPnl: true,

    calculatePortfolioValue: true,

    persistLocally: false,

    persistServerSide: true

  };


  /* =======================================================
     ANALYTICS
  ======================================================= */

  const analytics = {

    enabled: true,

    charts: true,

    technicalIndicators: true,

    performanceMetrics: true,

    riskMetrics: true,

    historicalAnalysis: true,

    backtesting: true

  };


  /* =======================================================
     AUTHENTICATION
  ======================================================= */

  const authentication = {

    enabled: true,

    sessionCheckOnStartup: true,

    credentialsMode: "same-origin",

    autoLogoutOnSessionFailure: true

  };


  /* =======================================================
     UI
  ======================================================= */

  const ui = {

    toastDurationMs: 3000,

    marketUpdateAnimation: true,

    showMarketStatus: true,

    showSimulationBadge: true,

    enableBottomNavigation: true

  };


  /* =======================================================
     PERFORMANCE
  ======================================================= */

  const performance = {

    batchMarketUpdates: true,

    batchRenderUpdates: true,

    maximumRenderFrequencyMs: 250,

    debounceSearchMs: 150,

    cacheInstrumentList: true

  };


  /* =======================================================
     SAFETY
  ======================================================= */

  const safety = {

    rejectInvalidPrices: true,

    rejectInvalidQuantity: true,

    rejectUnknownSymbols: true,

    validateOrdersServerSide: true,

    neverTrustClientPrice: true,

    neverTrustClientBalance: true,

    neverExecuteRealTrades: true

  };


  /* =======================================================
     PROVIDER SYSTEM
  ======================================================= */

  const providers = {

    automaticSelection: true,

    fallbackEnabled: true,

    healthCheckEnabled: true,

    healthCheckIntervalMs: 30000,

    maximumConsecutiveFailures: 3

  };


  /* =======================================================
     FEATURE FLAGS
  ======================================================= */

  const features = {

    marketDataEngine: true,

    providerRegistry: true,

    liveMarketUpdates: true,

    watchlist: true,

    charts: true,

    portfolio: true,

    orders: true,

    analytics: true,

    notifications: true,

    search: true,

    advancedOrderTypes: true,

    paperTrading: true,

    backtesting: true,

    technicalAnalysis: true,

    riskAnalysis: true

  };


  /* =======================================================
     CONFIGURATION OBJECT
  ======================================================= */

  const config = {

    environment,

    application,

    marketData,

    markets,

    trading,

    portfolio,

    analytics,

    authentication,

    ui,

    performance,

    safety,

    providers,

    features

  };


  /* =======================================================
     READ-ONLY CONFIGURATION
  ======================================================= */

  Object.freeze(environment);

  Object.freeze(application);

  Object.freeze(marketData);

  Object.freeze(markets);

  Object.freeze(trading);

  Object.freeze(portfolio);

  Object.freeze(analytics);

  Object.freeze(authentication);

  Object.freeze(ui);

  Object.freeze(performance);

  Object.freeze(safety);

  Object.freeze(providers);

  Object.freeze(features);

  Object.freeze(config);


  /* =======================================================
     GLOBAL CONFIGURATION
  ======================================================= */

  window.TradeSimConfig = config;


})();
