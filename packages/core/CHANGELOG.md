# Change Log

The following is a curated list of changes in the Enact core module, newest changes on the top.

## [unreleased]

### Added

- `core/util/Job` to replace `core/jobs` with an API that reduced the chance of job name collisions

### Removed

- `core/jobs` and replaced it with `core/util/Job`
- `core/selection` which was only used internally by `ui/GroupItem`
- `kind` and `hoc` named exports from root module. Should be directly imported via `@enact/core/kind` and `@enact/core/hoc`, respectively.
- `core/fetch` which was no longer used elsewhere by Enact.

## [1.0.0-beta.4] - 2017-03-10

### Added

- `core/kind` support for `contextTypes`
- `core/utils` function `extractAriaProps()` for redirecting ARIA props when the root node of a component isn't focusable

### Changed

- `core/handle` to allow binding to components. This also introduces a breaking change in the return value of handle methods.

## [1.0.0-beta.3] - 2017-02-21

### Addded

- `core/handle` function `forEventProp` to test properties on an event

## [1.0.0-beta.2] - 2017-01-30

### Added

- Support for a new `handlers` block for components created with `core/kind` to allow cached event handlers
- `core/handle` handler `forKey`
- `core/keymap` module to abstract keyboard key codes behind common names (e.g. 'up' and 'down')

### Removed

- `core/handle.withArgs` helper function which is no longer needed with the addition of the `handlers` support in `kind()`

## [1.0.0-beta.1] - 2016-12-30

### Added

- `core/factory` which provides the means to support design-time customization of components

## [1.0.0-alpha.5] - 2016-12-16

### Fixed

- `core/dispatcher` to support pre-rendering

## [1.0.0-alpha.4] - 2016-12-2

No developer-facing changes.

## [1.0.0-alpha.3] - 2016-11-8

### Added

- `core/dispatcher` - an event dispatcher for global events (e.g. `window` and `document` events) that fire outside of the React tree

## [1.0.0-alpha.2] - 2016-10-21

This version includes a lot of refactoring from the previous release. Developers need to switch to the new enact-dev command-line tool.

### Added

- `stopImmediate` to `core/handle`
- Many more unit tests

### Changed

- Computed properties in `kind()` no longer mutate props. In other words, changing the value of a prop in one computed property does not affect the value of that prop in another computed property.

### Fixed

- Inline docs updated to be more consistent and comprehensive

## [1.0.0-alpha.1] - 2016-09-26

Initial release