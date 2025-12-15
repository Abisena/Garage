import frappe

ROLE_NAMES = [
    "Admin",
    "Head Admin",
    "Registrasi",
    "Customer Service",
    "Head Customer Service",
    "Front Desk",
    "Service",
    "Head Service",
    "Servis",
    "Service Advisor",
    "Technician",
    "Teknisi",
    "Mechanic",
    "Mekanik",
    "Foreman",
    "Head Teknisi",
    "Sparepart",
    "Spare Part",
    "Head Sparepart",
    "Head Spare Part",
    "Inventory",
    "Inventory Controller",
    "Pengadaan",
    "Head Pengadaan",
    "Procurement",
    "Head Procurement",
    "Buying",
    "Finance",
    "Head Finance",
    "Keuangan",
    "Accountant",
    "Head Accountant",
    "Cashier",
    "Head Cashier",
    "Administrator",
    "Manager Bengkel",
    "Head Manager Bengkel",
    "Garage Manager",
    "System Manager",
]


def ensure_default_roles():
    """Create default Garage roles if they do not exist."""
    for role_name in ROLE_NAMES:
        if frappe.db.exists("Role", role_name):
            continue

        role = frappe.new_doc("Role")
        role.role_name = role_name
        role.desk_access = 1
        role.insert(ignore_permissions=True)


def execute():
    """Ensure default Garage roles exist so they can be assigned from Role DocType."""
    ensure_default_roles()
