/**
 * Global registry that maps tab IDs to their live <webview> DOM elements.
 * The store uses this to call webview methods (goBack, reload, etc.)
 * without holding direct DOM refs.
 */
const registry = new Map()

export default {
  set(id, el)    { registry.set(id, el) },
  get(id)        { return registry.get(id) },
  delete(id)     { registry.delete(id) },
  has(id)        { return registry.has(id) },
}
