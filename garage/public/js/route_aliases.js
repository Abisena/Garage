(() => {
    const boot = () => {
        const redirectLegacyRoute = () => {
            const route = frappe.get_route();
            if (!route || !route.length) return;
            if (route[0] === "customer-entry") {
                frappe.set_route("List", "Customer Entry");
            }
        };

        redirectLegacyRoute();
        frappe.router.on("change", redirectLegacyRoute);
    };

    const applySidebarTheme = () => {
        document.querySelectorAll('.standard-sidebar-item.selected').forEach(el => {
            el.style.setProperty('background-color', '#1e3a5f', 'important');
            el.style.setProperty('border-radius', '6px', 'important');
            el.querySelectorAll('a, a span').forEach(child => {
                child.style.setProperty('color', '#ffffff', 'important');
                child.style.setProperty('font-weight', '700', 'important');
            });
        });
    };

    if (typeof frappe !== "undefined" && typeof frappe.ready === "function") {
        frappe.ready(boot);
        frappe.ready(() => {
            applySidebarTheme();
            frappe.router.on("change", () => setTimeout(applySidebarTheme, 200));
        });
    } else {
        document.addEventListener("DOMContentLoaded", boot);
    }
})();
