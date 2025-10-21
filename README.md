### Garage

For Your manage Garage

### Workflow System

This repository ships with an in-memory but production-ready workflow engine
located at `garage/workflow`. The module captures the full customer journey for
service/repair jobs as well as counter sales: booking, inspection, job-card
approval, purchase orders, inventory movement, quality control, invoicing, and
payment collection. The engine enforces role based access control, validates
incoming data, and produces audit logs so the workflow can be embedded safely in
APIs, background workers, or UI components.

### Documentation & Demo Page

* Developer documentation for the workflow is available at
  [`docs/workflow.md`](docs/workflow.md).
* A lightweight public web page (`/workflow`) renders the flow diagram and a
  step-by-step explanation using Mermaid so end users can understand the
  process quickly.

### Installation

You can install this app using the [bench](https://github.com/frappe/bench) CLI:

```bash
cd $PATH_TO_YOUR_BENCH
bench get-app $URL_OF_THIS_REPO --branch develop
bench install-app garage
```

### Contributing

This app uses `pre-commit` for code formatting and linting. Please [install pre-commit](https://pre-commit.com/#installation) and enable it for this repository:

```bash
cd apps/garage
pre-commit install
```

Pre-commit is configured to use the following tools for checking and formatting your code:

- ruff
- eslint
- prettier
- pyupgrade

### License

mit
