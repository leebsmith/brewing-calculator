## Git Hooks & CSS Styling Governance

This repository enforces styling governance and token consistency through version-controlled Git hooks located in `scripts/hooks/`.

### Local Setup

Configure Git to read repository hooks from `scripts/hooks` instead of the default unversioned `.git/hooks/` directory:

```bash
git config core.hooksPath scripts/hooks
```

### Pre-Commit Commit Gate

Direct modifications to `frontend/style.css` are gated to prevent unapproved style drift and protect established design tokens. The `pre-commit` hook validates staged files using a two-stage verification process:

1. **Authorization Perimeter (Gate 1):** Commits containing staged modifications to `frontend/style.css` are rejected by default. To commit authorized changes, include the `CSS_APPROVED` environment variable with your commit command:

   ```bash
   CSS_APPROVED=1 git commit -m "style: description of approved change"
   ```

2. **Token Audit Verification (Gate 2):** When `CSS_APPROVED=1` is provided, the hook automatically executes `scripts/audit-tokens.sh frontend/style.css`. The commit is blocked if any token taxonomy violations, direct primitive escapes, or unauthorized rules are detected.
