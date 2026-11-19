# Security policy

## Supported versions

Until the first stable GitHub Release, security fixes target `main`. Once stable
releases exist, fixes target the latest published release. Older releases and
unmerged branches are not maintained separately.

## Report a vulnerability

Use [GitHub's private vulnerability reporting](https://github.com/ysskrishna/bb-thread-inbox/security/advisories/new).
Include the affected version or commit, reproduction steps, and likely impact.
Do not post credentials, private conversations, or exploit details in public issues.

The maintainer will review the report and coordinate a fix and disclosure. There
is no guaranteed response time or bug bounty program.

## Plugin access

Thread Inbox reads BB thread, project, status, and pull-request information. It
stores filing state and preferences in BB plugin storage. Actions such as thread
deletion use BB APIs and require an explicit user action. Automatic title recovery
uses BB's configured title service; see the [scope review](docs/scope-review.md).
The plugin does not scan listening ports, stop processes, or close terminals.
