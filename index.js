import ConsoleAnalytics from "terriajs/lib/Core/ConsoleAnalytics";
import GoogleAnalytics from "terriajs/lib/Core/GoogleAnalytics";
import registerCatalogMembers from "terriajs/lib/Models/Catalog/registerCatalogMembers";
import registerSearchProviders from "terriajs/lib/Models/SearchProviders/registerSearchProviders";
import ShareDataService from "terriajs/lib/Models/ShareDataService";
import Terria from "terriajs/lib/Models/Terria";
import ViewState from "terriajs/lib/ReactViewModels/ViewState";
import registerCustomComponentTypes from "terriajs/lib/ReactViews/Custom/registerCustomComponentTypes";
import updateApplicationOnHashChange from "terriajs/lib/ViewModels/updateApplicationOnHashChange";
import updateApplicationOnMessageFromParentWindow from "terriajs/lib/ViewModels/updateApplicationOnMessageFromParentWindow";
import loadPlugins from "./lib/Core/loadPlugins";
import showGlobalDisclaimer from "./lib/Views/showGlobalDisclaimer";
import { loadTheme } from "./lib/theme-loader.js";
import plugins from "./plugins";

// Helper function to load private catalog with authentication
// Uses httpOnly cookies — browser sends credentials automatically
const loadPrivateCatalogWithAuth = async (terria) => {
  try {
    console.log("Loading private catalog with authentication...");

    // Fetch the catalog JSON — httpOnly cookies sent automatically
    const response = await fetch("/twin/catalog.json", {
      credentials: "include",
      headers: {
        Accept: "application/json"
      }
    });

    console.log("Private catalog response status:", response.status);

    if (!response.ok) {
      throw new Error(
        `Failed to load private catalog: ${response.status} ${response.statusText}`
      );
    }

    const catalogData = await response.json();
    console.log("Private catalog data:", catalogData);

    // Load the catalog into terria
    if (catalogData.catalog && Array.isArray(catalogData.catalog)) {
      console.log("Checking for new catalog items...");

      try {
        // Get existing catalog member names/IDs
        const existingMembers = terria.catalog.group.memberModels || [];
        const existingNames = new Set(
          existingMembers.map((m) => m.name || m.uniqueId)
        );

        // Filter out items that are already loaded
        const newItems = catalogData.catalog.filter((item) => {
          const itemExists =
            existingNames.has(item.name) || existingNames.has(item.id);
          if (itemExists) {
            console.log(
              `Catalog item "${item.name}" already exists, skipping...`
            );
          }
          return !itemExists;
        });

        console.log(
          `Found ${newItems.length} new items to add (${catalogData.catalog.length - newItems.length} already loaded)`
        );

        // Add only new items (they will appear at the top of the catalog)
        for (const item of newItems) {
          console.log("Adding new catalog item:", item.name);

          // Use addMembersFromJson with the proper stratum
          const result = await terria.catalog.group.addMembersFromJson(
            "user", // Use user stratum for dynamically added items
            [item] // Pass as array
          );

          console.log("Item added, result:", result);
        }

        console.log(
          "Final catalog order:",
          terria.catalog.group.memberModels?.map((m) => m.name || m.uniqueId)
        );

        if (newItems.length > 0) {
          console.log("Private catalog updated with new items!");
        } else {
          console.log("Private catalog is up to date.");
        }
      } catch (error) {
        console.error("Failed to load private catalog:", error);
        console.error("Error stack:", error.stack);
      }
    } else {
      console.error("Invalid catalog data structure:", catalogData);
    }
  } catch (error) {
    console.error("Failed to load private catalog:", error);
    throw error;
  }
};

// Apply runtime theme from backend site config
loadTheme();

const terriaOptions = {
  baseUrl: "/twin/build/TerriaJS"
};

// we check exact match for development to reduce chances that production flag isn't set on builds(?)
if (process.env.NODE_ENV === "development") {
  terriaOptions.analytics = new ConsoleAnalytics();
} else {
  terriaOptions.analytics = new GoogleAnalytics();
}

// Construct the TerriaJS application, arrange to show errors to the user, and start it up.
const terria = new Terria(terriaOptions);

// Authentication is handled via httpOnly cookies — browser sends them
// automatically with credentials: "include". No manual header injection needed.

// Create the ViewState before terria.start so that errors have somewhere to go.
const viewState = new ViewState({
  terria: terria
});

// Register all types of catalog members in the core TerriaJS.  If you only want to register a subset of them
// (i.e. to reduce the size of your application if you don't actually use them all), feel free to copy a subset of
// the code in the registerCatalogMembers function here instead.
registerCatalogMembers();

// Register custom search providers in the core TerriaJS. If you only want to register a subset of them, or to add your own,
// insert your custom version of the code in the registerSearchProviders function here instead.
registerSearchProviders();

// Register custom components in the core TerriaJS.  If you only want to register a subset of them, or to add your own,
// insert your custom version of the code in the registerCustomComponentTypes function here instead.
registerCustomComponentTypes(terria);

if (process.env.NODE_ENV === "development") {
  window.viewState = viewState;
}

export default terria
  .start({
    applicationUrl: window.location,
    configUrl: "/twin/config.json",
    shareDataService: new ShareDataService({
      terria: terria
    }),
    beforeRestoreAppState: () => {
      // Load plugins before restoring app state because app state may
      // reference plugin components and catalog items.
      return loadPlugins(viewState, plugins).catch((error) => {
        console.error(`Error loading plugins`);
        console.error(error);
      });
    }
  })
  .catch(function (e) {
    terria.raiseErrorToUser(e);
  })
  .finally(function () {
    // Override the default document title with appName. Check first for default
    // title, because user might have already customized the title in
    // index.ejs
    if (document.title === "Terria Map") {
      document.title = terria.appName;
    }

    // Load init sources like init files and share links
    terria.loadInitSources().then((result) => result.raiseError(terria));

    // Try loading private catalog — server will check auth via httpOnly cookies
    loadPrivateCatalogWithAuth(terria).catch((error) => {
      // 401/403 is expected if not authenticated — silently ignore
      if (!error.message?.includes("401") && !error.message?.includes("403")) {
        console.error("Error loading private catalog:", error);
      }
    });

    try {
      // Automatically update Terria (load new catalogs, etc.) when the hash part of the URL changes.
      updateApplicationOnHashChange(terria, window);
      updateApplicationOnMessageFromParentWindow(terria, window);

      // Show a modal disclaimer before user can do anything else.
      if (terria.configParameters.globalDisclaimer) {
        showGlobalDisclaimer(viewState);
      }

      // Add font-imports
      const fontImports = terria.configParameters.theme?.fontImports;
      if (fontImports) {
        const styleSheet = document.createElement("style");
        styleSheet.type = "text/css";
        styleSheet.innerText = fontImports;
        document.head.appendChild(styleSheet);
      }
    } catch (e) {
      console.error(e);
      console.error(e.stack);
    }
  })
  .then(() => {
    return { terria, viewState };
  })
  .then(({ terria, viewState }) => {
    return { terria, viewState };
  });
