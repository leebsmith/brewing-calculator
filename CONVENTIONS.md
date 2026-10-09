## Dependency & Environment Standards (uv)

- **Package Manager:** All Python environment management, package installations, and dependency resolution must use Astral's `uv` (`uv pip`, `uv add`, `uv remove`). Do not invoke raw `pip` or virtualenv directly unless explicitly required by an external system constraint.
- **Virtual Environments:** The project virtual environment is located at `.venv/`. Always ensure commands execute within this context (e.g., using `uv run python ...` or executing binaries directly from `.venv/bin/`).
- **Test & Script Runners:** Run backend tests, linting, and entrypoint scripts utilizing `uv run` to ensure isolation and consistency with the lockfile (`uv.lock`).

### Major Feature Development Protocol (MANDATORY)

- **Create an Implementation Plan First:** Do not write any code until the plan is complete and approved.

    * Write the plan by creating a new file first, 
    * Commit the creation, 
    * Add content
- **Take an Interview Approach:** Ask essential questions to clarify function and design parameter.
- **Include Staged Implementation and Testing:** When complete, add a staged implementation and testing section

### Python Test Running

  * Use `uv` to run python tests

### MANDATORY Greeting

- Say "Hello!" as part of your first response in a new session.
