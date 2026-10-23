# Free public code scanning

Owner-authorized scope, October 23, 2026: [WITHYS-726](https://linear.app/clr-technologies-inc/issue/WITHYS-726).
DeepSource and SonarQube Cloud may analyze already-public code in
`CLR-Technologies-Inc/withys-public` on their free plans. This scoped addition to
the [maintenance contract](public-maintenance.md) preserves its budget and private
export boundaries. It does not add general build/test/deployment CI.

The existing [BSD-3-Clause license](../LICENSE) is
[OSI approved](https://opensource.org/license/bsd-3-clause); preserve it.
Gitar, paid trials, payment methods, paid AI features, SCA add-ons and automatic
top-ups are outside this setup.

## DeepSource

1. Connect only this public repository. Preserve unrelated projects and plans.
   Do not automatically activate newly discovered repositories.
2. Select the free **Open Source** plan: currently 1,000 static analysis runs per
   month. Stop at the free limit rather than upgrade.
3. Under team **Policies > AI & Agents**, turn **Enable AI Agents** off. Do not
   install Autofix or enable SCA, paid trials, payment methods or auto top-up.
4. Enable reading `.deepsource.toml`. It configures JavaScript/TypeScript, Rust
   and Docker static analysis, identifies tests and excludes generated files.
5. Activate analysis, select `staging` as the default branch when supported, and
   verify a completed scan of the public staging revision.

The TOML file cannot establish the free plan or disable dashboard AI settings.
Verify both in the provider account before activation.
DeepSource runs these analyzers on its service; it needs no GitHub runner job.

## SonarQube Cloud

1. Create a public project on free **SonarQube for OSS**, using the existing
   OSI-approved license. Do not start paid trials or enable paid add-ons.
2. Connect only `CLR-Technologies-Inc/withys-public`. Keep **Automatically import
   new GitHub repositories** off. Preserve any existing private or paid
   organization; use an eligible free organization for this project.
3. Set the project's main branch to `staging`. Disable **Automatic Analysis**
   when using Actions to avoid duplicate/incompatible analysis.
4. Set repository Actions variables `SONAR_ORGANIZATION` and `SONAR_PROJECT_KEY`
   to the exact provider-generated keys. Put an analysis-scoped token in repository
   secret `SONAR_TOKEN`; never commit or print it.
5. After verifying the free plan, public visibility and protected `staging`/`main`
   branches, set `SONAR_SCANNING_ENABLED` to `true` and run the workflow on one of
   those branches. Before activation the job is skipped, which is not a scan pass.

The workflow uses standard GitHub-hosted `ubuntu-latest`, read-only repository
permissions, immutable action revisions and a 15-minute timeout. Token-bearing
scans run only on `main`/`staging`, after review; manual runs on other refs are
also excluded. No pull request event, schedule or new required check is added.
Checkout does not fetch Private, submodules or LFS, and does not persist Git
credentials. No application install/build/test scripts execute.

`sonar-project.properties` limits analysis to `app`, separates tests, excludes
generated output and respects SCM exclusions. No coverage percentage is claimed
without a coverage report. Findings apply to the public revision, not private-only
code or integration paths. Reconcile shared fixes through the existing process.

## Verification and rollback

Record the free-plan status, public-only access, disabled paid features, scanned
commit and completed analysis links in WITHYS-726. Provider activation, config
merge and first successful scans are separate acceptance steps; config files
alone do not establish a working service.

To pause Sonar, set `SONAR_SCANNING_ENABLED` to `false`. To pause DeepSource,
deactivate this repository's analysis. Remove the Sonar token when no longer
needed. Revert config through a staging PR; retain Semgrep and Dependabot.

References: [DeepSource billing](https://docs.deepsource.com/docs/platform/reference/billing),
[analyzers](https://docs.deepsource.com/docs/platform/reference/core-analyzers),
[AI policy](https://docs.deepsource.com/docs/platform/dashboard/team/policies),
[Sonar plans](https://docs.sonarsource.com/sonarqube-cloud/administering-sonarcloud/managing-subscription/subscription-plans),
[standard runners](https://docs.github.com/en/actions/reference/runners/github-hosted-runners).
