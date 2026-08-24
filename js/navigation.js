/* =========================================================
   TRADESIM — NAVIGATION MODULE
========================================================= */

let currentView = "home";


function showView(view) {

  const views = {
    home: "homeSection",
    market: "marketSection",
    portfolio: "portfolioSection",
    orders: "ordersSection"
  };

  if (!views[view]) {
    return;
  }

  currentView = view;


  /* Hide every view */

  Object.values(views).forEach(id => {

    const element =
      document.getElementById(id);

    if (!element) return;

    element.classList.add("hidden");

    element.style.display = "none";

  });


  /* Show selected view */

  const selected =
    document.getElementById(views[view]);

  if (selected) {

    selected.classList.remove("hidden");

    selected.style.display = "block";

  }


  /* Update navigation buttons */

  document
    .querySelectorAll(".nav-btn")
    .forEach(button => {

      button.classList.remove("active");

    });


  const activeButton =
    document.querySelector(
      `.nav-btn[data-view="${view}"]`
    );


  if (activeButton) {

    activeButton.classList.add("active");

  }


  /* Render only what is required */

  if (view === "home") {

    if (typeof renderDashboard === "function") {
      renderDashboard();
    }

  }


  if (view === "market") {

    if (typeof renderMarket === "function") {
      renderMarket();
    }

  }


  if (view === "portfolio") {

    if (typeof renderPositions === "function") {
      renderPositions();
    }

  }


  if (view === "orders") {

    if (typeof renderOrders === "function") {
      renderOrders();
    }

  }


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}


/* =========================================================
   INITIALIZE NAVIGATION
========================================================= */

function initializeNavigation() {

  const buttons =
    document.querySelectorAll(
      ".nav-btn"
    );


  buttons.forEach(button => {

    const view =
      button.dataset.view;


    if (!view) return;


    button.addEventListener(
      "click",
      () => {

        showView(view);

      }
    );

  });


  showView("home");

}
