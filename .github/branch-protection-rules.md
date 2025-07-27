# Branch Protection Rules Configuration

This document outlines the recommended branch protection rules for the HandoverKey repository to ensure code quality and security.

## Main Branch Protection

### Required Settings for `main` branch:

1. **Require a pull request before merging**
   - ✅ Require approvals: **2**
   - ✅ Dismiss stale PR approvals when new commits are pushed
   - ✅ Require review from code owners
   - ✅ Restrict pushes that create files that have a path matching a pattern: `packages/core/src/crypto/*` (requires crypto expert review)

2. **Require status checks to pass before merging**
   - ✅ Require branches to be up to date before merging
   - **Required status checks:**
     - `CI Pipeline / Security Audit`
     - `CI Pipeline / Code Quality`
     - `CI Pipeline / Build Packages`
     - `CI Pipeline / Unit Tests (core)`
     - `CI Pipeline / Unit Tests (shared)`
     - `CI Pipeline / Unit Tests (api)`
     - `CI Pipeline / Integration Tests`
     - `CI Pipeline / Security Scan`
     - `PR Quality Checks / PR Validation`
     - `PR Quality Checks / Coverage Check`
     - `PR Quality Checks / Security Review`
     - `CodeQL Security Analysis`

3. **Require conversation resolution before merging**
   - ✅ All conversations must be resolved

4. **Require signed commits**
   - ✅ Require signed commits for enhanced security

5. **Require linear history**
   - ✅ Require linear history (no merge commits)

6. **Additional restrictions**
   - ✅ Restrict pushes to matching branches (only allow through PRs)
   - ✅ Allow force pushes: **Disabled**
   - ✅ Allow deletions: **Disabled**

## Develop Branch Protection

### Required Settings for `develop` branch:

1. **Require a pull request before merging**
   - ✅ Require approvals: **1**
   - ✅ Dismiss stale PR approvals when new commits are pushed
   - ✅ Require review from code owners (for crypto changes)

2. **Require status checks to pass before merging**
   - ✅ Require branches to be up to date before merging
   - **Required status checks:**
     - `CI Pipeline / Security Audit`
     - `CI Pipeline / Code Quality`
     - `CI Pipeline / Build Packages`
     - `CI Pipeline / Unit Tests (core)`
     - `CI Pipeline / Unit Tests (shared)`
     - `CI Pipeline / Unit Tests (api)`
     - `CI Pipeline / Integration Tests`

3. **Additional restrictions**
   - ✅ Restrict pushes to matching branches
   - ✅ Allow force pushes: **Disabled**
   - ✅ Allow deletions: **Disabled**

## Release Branch Protection

### Required Settings for `release/*` branches:

1. **Require a pull request before merging**
   - ✅ Require approvals: **2**
   - ✅ Require review from code owners
   - ✅ Dismiss stale PR approvals when new commits are pushed

2. **Require status checks to pass before merging**
   - **Required status checks:**
     - All CI Pipeline checks
     - `Release Pipeline / Validate Release`
     - `Release Pipeline / Release Tests`
     - `Release Pipeline / Security Scan Release`

3. **Additional restrictions**
   - ✅ Restrict pushes to matching branches
   - ✅ Allow force pushes: **Disabled**
   - ✅ Allow deletions: **Disabled**

## Code Owners Configuration

Create a `.github/CODEOWNERS` file with the following content:

```
# Global owners
* @handoverkey/core-team

# Security-critical files require security team review
packages/core/src/crypto/ @handoverkey/security-team @handoverkey/crypto-experts
packages/api/src/auth/ @handoverkey/security-team
packages/api/src/middleware/security.ts @handoverkey/security-team

# Database changes require database expert review
packages/database/ @handoverkey/database-experts

# Infrastructure and deployment
.github/workflows/ @handoverkey/devops-team
docker-compose.yml @handoverkey/devops-team
Dockerfile @handoverkey/devops-team

# Documentation
docs/ @handoverkey/docs-team
README.md @handoverkey/docs-team
```

## Repository Settings

### General Settings:
- ✅ **Allow merge commits**: Disabled
- ✅ **Allow squash merging**: Enabled (default)
- ✅ **Allow rebase merging**: Enabled
- ✅ **Always suggest updating pull request branches**: Enabled
- ✅ **Allow auto-merge**: Enabled (for dependabot)
- ✅ **Automatically delete head branches**: Enabled

### Security Settings:
- ✅ **Private vulnerability reporting**: Enabled
- ✅ **Dependency graph**: Enabled
- ✅ **Dependabot alerts**: Enabled
- ✅ **Dependabot security updates**: Enabled
- ✅ **Dependabot version updates**: Enabled
- ✅ **Code scanning alerts**: Enabled
- ✅ **Secret scanning alerts**: Enabled
- ✅ **Push protection**: Enabled

### Access Settings:
- ✅ **Base permissions**: Read
- ✅ **Member privileges**: 
  - Allow members to create issues: Enabled
  - Allow members to create discussions: Enabled

## Rulesets (GitHub's New Branch Protection)

If using GitHub's new Rulesets feature, configure:

### Main Branch Ruleset:
```yaml
name: "Main Branch Protection"
target: "main"
rules:
  - type: "pull_request"
    parameters:
      required_approving_review_count: 2
      dismiss_stale_reviews_on_push: true
      require_code_owner_review: true
      require_last_push_approval: true
  - type: "required_status_checks"
    parameters:
      strict_required_status_checks_policy: true
      required_status_checks:
        - "CI Pipeline / Security Audit"
        - "CI Pipeline / Code Quality"
        - "CI Pipeline / Build Packages"
        - "CI Pipeline / Unit Tests (core)"
        - "CI Pipeline / Unit Tests (shared)"
        - "CI Pipeline / Unit Tests (api)"
        - "CI Pipeline / Integration Tests"
        - "CI Pipeline / Security Scan"
        - "PR Quality Checks / PR Validation"
        - "CodeQL Security Analysis"
  - type: "non_fast_forward"
  - type: "required_signatures"
```

## Implementation Steps

1. **Enable branch protection rules** in repository settings
2. **Create teams** mentioned in CODEOWNERS
3. **Configure required status checks** after first CI run
4. **Set up code owners** file
5. **Enable security features** in repository settings
6. **Test the workflow** with a test PR

## Monitoring and Maintenance

- **Weekly review** of failed status checks
- **Monthly audit** of branch protection effectiveness
- **Quarterly update** of required status checks as CI evolves
- **Annual review** of code owners and team assignments

This configuration ensures that:
- All code changes are reviewed
- Security-critical changes get expert review
- All tests pass before merging
- Code quality standards are maintained
- Security vulnerabilities are caught early
- The main branch remains stable and deployable