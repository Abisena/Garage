from garage.patches.post_model_sync.add_default_roles import ensure_default_roles


def execute():
    """Re-run default role creation to ensure all sites have them."""
    ensure_default_roles()
