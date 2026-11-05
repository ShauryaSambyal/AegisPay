"""Environment gate for the AegisPay ML service.

Prints the interpreter version, imports every runtime and test dependency,
prints the installed version of each package, and exits non-zero if anything
is missing or the interpreter is not Python 3.11.

Usage (from the repository root):
    .\\ml-service\\.venv\\Scripts\\python.exe ml-service\\scripts\\check_env.py
"""

from __future__ import annotations

import importlib
import sys

# (import name, distribution name) — dist name differs for some packages.
REQUIRED = [
    ("fastapi", "fastapi"),
    ("uvicorn", "uvicorn"),
    ("pydantic", "pydantic"),
    ("pandas", "pandas"),
    ("numpy", "numpy"),
    ("sklearn", "scikit-learn"),
    ("xgboost", "xgboost"),
    ("shap", "shap"),
    ("statsmodels", "statsmodels"),
    ("joblib", "joblib"),
    ("matplotlib", "matplotlib"),
    ("networkx", "networkx"),
    ("pytest", "pytest"),
    ("httpx", "httpx"),
]

EXPECTED_MAJOR_MINOR = (3, 11)


def main() -> int:
    failures: list[str] = []

    print(f"python  : {sys.version.split()[0]}  ({sys.executable})")
    if sys.version_info[:2] != EXPECTED_MAJOR_MINOR:
        failures.append(
            f"Python {EXPECTED_MAJOR_MINOR[0]}.{EXPECTED_MAJOR_MINOR[1]}.x required, "
            f"found {sys.version_info.major}.{sys.version_info.minor}"
        )

    print("\npackage versions")
    print("-" * 46)
    for module_name, dist_name in REQUIRED:
        try:
            module = importlib.import_module(module_name)
        except Exception as exc:  # noqa: BLE001 - report every import failure
            failures.append(f"import {module_name} failed: {exc!r}")
            print(f"{dist_name:<16} FAILED ({exc!r})")
            continue
        version = getattr(module, "__version__", "unknown")
        print(f"{dist_name:<16} {version}")

    # Import the application itself so a broken package layout fails here too.
    try:
        sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parents[1]))
        importlib.import_module("src")
        print(f"\n{'aegispay.src':<16} OK")
    except Exception as exc:  # noqa: BLE001
        failures.append(f"import src failed: {exc!r}")
        print(f"\n{'aegispay.src':<16} FAILED ({exc!r})")

    print("-" * 46)
    if failures:
        print("\nENVIRONMENT CHECK: FAILED")
        for item in failures:
            print(f"  - {item}")
        return 1

    print("\nENVIRONMENT CHECK: OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
