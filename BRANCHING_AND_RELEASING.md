# Branching Strategy

- tooling: Development Tooling. Minimal tooling useful when working on all branches. Can be removed in the future (e.g. before pull requests)
- community-notes-feature: The pure community notes feature. Meant to be submit as a future pull-request to Bluesky. Keep development tooling, improvements to other parts of codebase, and Bluenotes brand-related stuff out of this
- bluenotes-rebrand: pure branding, plus changes necessary to make code deployable as independent app

                        upstream/main
                             |
                             |
                             V
                          tooling 
                        ↙         ↘
                      ↙             ↘
                    ↙                 ↘
                  ↙                     ↘
           bluenotes-rebrand   community-notes-feature
                  ↘                     ↙
                    ↘                 ↙
                      ↘             ↙
                        ↘         ↙
                          release

# Ongoing sync

Keep `tooling` current on `upstream/main`, then rebase both working lines onto `tooling`. This is not a release assemble.

    git fetch
    git co tooling
    git rebase upstream/main
    git push --force
    git co community-notes-feature
    git rebase tooling
    git push --force
    git co bluenotes-rebrand
    git rebase tooling
    git push --force

# Release assemble

Use `./prepare-release-interactive.sh`. It rebases `tooling` onto the pinned Bluesky release tag (`BLUESKY_RELEASE_TAG`, default `1.109.0` in the script; override via that env var or the first argument), then rebases both working lines onto `tooling`, then assembles `release` (reset to `bluenotes-rebrand`, merge `community-notes-feature`, force-push). Do not use floating `upstream/main` for that assemble. Deal with any merge conflicts along the way. Deploy is `just deploy` (or the push-to-`release` Fly workflow).