frappe.ready(() => {
    // Redirect legacy desk routes to the current targets.
    const redirectLegacyRoute = () => {
        const route = frappe.get_route();
        if (!route || !route.length) {
            return;
        }

        const [firstSegment] = route;
        if (firstSegment === "customer-entry") {
            frappe.set_route("List", "Customer Entry");
        }
    };

    // Handle the initial load and any subsequent route changes.
    redirectLegacyRoute();
    frappe.router.on("change", redirectLegacyRoute);
});
