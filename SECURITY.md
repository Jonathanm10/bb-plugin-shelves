# Security policy

## Supported versions

Security fixes target the latest published stable release and `main`. Older releases and
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
deletion use BB APIs and require an explicit user action. Previously saved icon
paths can read that explicit image from the project through BB. No automatic
icon discovery, historical PR scanning, or title-service calls are included.
The plugin does not scan listening ports, stop processes, or close terminals.
