from pathlib import Path

from setuptools import find_packages, setup


BASE_DIR = Path(__file__).parent
VERSION_FILE = BASE_DIR / "garage" / "__init__.py"

version_globals: dict[str, str] = {}
exec(VERSION_FILE.read_text(), version_globals)

setup(
    name="garage",
    version=version_globals.get("__version__", "0.0.0"),
    description="Garage management app for Frappe",
    author="Imogi Developer",
    author_email="imogi.indonesia@gmail.com",
    packages=find_packages(),
    include_package_data=True,
    zip_safe=False,
)
