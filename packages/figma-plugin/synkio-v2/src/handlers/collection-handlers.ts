// =============================================================================
// Collection Handlers - Get/Save collections and style types
// =============================================================================

import { StyleType } from '../lib/types';

import {
  saveSimple,
  loadSimple,
  KEYS,
} from '../lib/storage';

import {
  getCollectionInfos,
  getStyleTypeInfos,
} from '../lib/collector';

import { recalculateSyncStatus } from '../utils';
import { debug } from '../lib/debug';
import { SendMessage } from './types';

// =============================================================================
// handleGetCollections - Get list of collections with exclusion status
// =============================================================================

export async function handleGetCollections(send: SendMessage): Promise<void> {
  const excludedCollections = loadSimple<string[]>(KEYS.EXCLUDED_COLLECTIONS) || [];
  const collectionInfos = await getCollectionInfos();
  const collections = collectionInfos.map(c => ({
    ...c,
    excluded: excludedCollections.includes(c.name),
  }));

  send({
    type: 'collections-update',
    collections,
  });
}

// =============================================================================
// handleSaveExcludedCollections - Save excluded collections and recalculate status
// =============================================================================

export async function handleSaveExcludedCollections(
  collections: string[],
  send: SendMessage
): Promise<void> {
  debug('handleSaveExcludedCollections called with:', collections);
  saveSimple(KEYS.EXCLUDED_COLLECTIONS, collections);
  await handleGetCollections(send);
  // Recalculate sync status since excluded collections affect pending changes
  debug('Calling recalculateSyncStatus...');
  await recalculateSyncStatus(send);
  debug('recalculateSyncStatus completed');
}

// =============================================================================
// handleGetStyleTypes - Get list of style types with exclusion status
// =============================================================================

export async function handleGetStyleTypes(send: SendMessage): Promise<void> {
  const excludedStyleTypes = loadSimple<StyleType[]>(KEYS.EXCLUDED_STYLE_TYPES) || [];
  const styleTypeInfos = await getStyleTypeInfos();
  const styleTypes = styleTypeInfos.map(s => ({
    ...s,
    excluded: excludedStyleTypes.includes(s.type),
  }));

  send({
    type: 'style-types-update',
    styleTypes,
  });
}

// =============================================================================
// handleSaveExcludedStyleTypes - Save excluded style types and recalculate status
// =============================================================================

export async function handleSaveExcludedStyleTypes(
  styleTypes: StyleType[],
  send: SendMessage
): Promise<void> {
  debug('handleSaveExcludedStyleTypes called with:', styleTypes);
  saveSimple(KEYS.EXCLUDED_STYLE_TYPES, styleTypes);
  await handleGetStyleTypes(send);
  // Recalculate sync status since excluded style types affect pending changes
  debug('Calling recalculateSyncStatus...');
  await recalculateSyncStatus(send);
  debug('recalculateSyncStatus completed');
}
