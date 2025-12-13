/**
 * Plugin constants and configuration
 */

/** Plugin namespace for sharedPluginData storage */
export const PLUGIN_NAMESPACE = 'token_vault';

/** Legacy namespace for backwards compatibility */
export const LEGACY_NAMESPACE = 'design_token_importer';

/** Name of the registry node */
export const REGISTRY_NODE_NAME = '_token_registry';

/** Chunk size for splitting data (90KB to stay under 100KB limit) */
export const CHUNK_SIZE = 90000;

/** Plugin version */
export const PLUGIN_VERSION = '2.0.0';

/** Baseline version */
export const BASELINE_VERSION = '2.0.0';
