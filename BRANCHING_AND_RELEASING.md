# Branching Strategy

- tooling: Development Tooling. Minimal tooling useful when working on all branches. Can be removed in the future (e.g. before pull reuqests)
- community-notes-feature: The pure community notes feature. Meant to be submit as a future pull-request to Bluesky. Keep development tooling, improvements to other parts of codebsae, and Bluenotes brand-related stuff out of this
- bluenotes-rebrand: pure branding, plus changes necessary to make code deployable as independent app

                        upsteram/main
                             |
                             |
                             V
                          tooling 
                        ↙         ↘
                      ↙             ↘
                    ↙                 ↘
                  ↙                     ↘
           bluenotes-brand   community-notes-feature
                  ↘                     ↙
                    ↘                 ↙
                      ↘             ↙
                        ↘         ↙
                          release

# Deployment Steps

Use the following steps to deploy a new version. Deal with any merge conflicts you may encounter along the way.

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
    git co release
    git reset bluenotes-rebrand --hard
    git merge community-notes-feature
    git push --force
    just deploy