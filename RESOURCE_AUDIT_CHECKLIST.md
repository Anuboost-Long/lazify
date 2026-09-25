# Resource and installation-size audit checklist

- [x] Record the current packaged macOS application and download sizes.
- [ ] Build and record equivalent Windows and Linux package sizes when release artifacts are available.
- [x] Measure the largest bundled files, directories, native binaries, and dependencies.
- [x] Map optional product features to the processes, packages, and assets they load.
- [x] Identify likely runtime CPU, memory, disk, network, and battery costs from code paths and process lifecycles.
- [x] Separate findings into safe removals, lazy-loading opportunities, configuration changes, and features that need product decisions.
- [x] Confirm whether development-only tools or dependencies are accidentally included in production builds.
- [x] Check that packaging rules exclude tests, source maps, documentation, caches, and unused platform assets.
- [x] Estimate the installation-size and runtime-resource savings for each recommendation.
- [ ] Make no product or packaging changes until the audit findings and proposed removals are reviewed.
