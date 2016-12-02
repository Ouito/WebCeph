import { Event, StoreKeys } from 'utils/constants';
import { Store, Middleware } from 'redux';
import idb from 'idb-keyval';

import {
  persistStateStarted,
  persistStateSucceeded,
  persistStateFailed,
  restorePersistedStateSucceeded,
  restorePersistedStateFailed,
  clearPersistedStateSucceeded,
  clearPersistedStateFailed,
} from 'actions/persistence';

import pickBy from 'lodash/pickBy';
import indexOf from 'lodash/indexOf';

const PERSISTABLE_EVENTS = [
  Event.BROWSER_COMPATIBLITY_CHECK_SUCCEEDED,
  Event.SET_ANALYSIS_SUCCEEDED,
];

const isPersistenceNeededForAction = ({ type }: Action<any>): boolean => {
  return indexOf(PERSISTABLE_EVENTS, type) > -1;
};

const PERSISTABLE_KEYS = [
  StoreKeys.appCachingComplete,
  StoreKeys.compatibilityIsIgnored,
  StoreKeys.missingFeatures,
  StoreKeys.activeAnalysisId,
];

const isStoreEntryPersistable = (key: string): boolean => {
  return indexOf(PERSISTABLE_KEYS, key) > -1;
};

declare var window: Window & { requestIdleCallback?: RequestIdleCallback };

// @TODO: replace with a polyfill?
const rIC = window.requestIdleCallback || ((fn: Function) => fn());

const saveStateMiddleware: Middleware = ({ getState }: Store<any>) => (next: DispatchFunction) =>
  async (action: Action<any>) => {
    if (isPersistenceNeededForAction(action)) {
      next(action);
      console.info(
        `Action ${action.type} has triggered state persistence`
      );
      rIC(async () => {
        try {
          next(persistStateStarted());
          console.info('Persisting state...');
          const stateToPersist = pickBy(
            getState(),
            (_, k) => isStoreEntryPersistable(k as string),
          );
          // @TODO: persist state along with app version
          await idb.set(__VERSION__, stateToPersist);
          console.info('State persisted successfully.');
          return next(persistStateSucceeded());
        } catch (e) {
          console.error(
            `Failed to persist state.`,
            e,
          );
          return next(persistStateFailed({ message: e.message }));
        }
      });
    } else {
      /**
       * Action does not trigger state
       * persistence, so it has been forwarded.
       */
      return next(action);
    }
  };

type RestoredState = { [id: string]: any };

const loadStateMiddleware: Middleware = (_: Store<any>) => (next: DispatchFunction) =>
  async (action: Action<any>) => {
    const { type } = action;
    if (type === Event.LOAD_PERSISTED_STATE_REQUESTED) {
      console.info('Requested loading persisted state');
      next(action);
      try {
        const keys = await idb.keys();
        let restoredState: RestoredState = { };
        if (keys.length === 0) {
          console.info('No persisted state was found.');
        } else if (indexOf(keys, __VERSION__) > -1) {
          console.info(`Found persisted state compatible with this version (${__VERSION__})`);
          restoredState = await idb.get<RestoredState>(__VERSION__);
        } else {
          console.info(
            `Could not find persisted state compatible with this ` +
            `version (${__VERSION__}). Upgrading...`,
          );
          // @TODO: perform any necessary upgrade operations
          await idb.clear(); // @FIXME: Workaround
          // @NOTE: Do not break on switch cases.
          switch (__VERSION__) {
            default:
              restoredState = { };
          }
        }
        console.info('Persisted state loaded successfully');
        return next(restorePersistedStateSucceeded(restoredState));
      } catch (e) {
        console.error(
          `Failed to load persisted state.`,
          e,
        );
        return next(restorePersistedStateFailed({ message: e.message }));
      }
    } else {
      return next(action);
    }
  };

const clearStateMiddleware: Middleware = (_: Store<any>) => (next: DispatchFunction) =>
  async (action: Action<any>) => {
    if (action.type === Event.CLEAR_PRESISTED_STATE_SUCCEEDED) {
      try {
        await idb.clear();
        return next(clearPersistedStateSucceeded());
      } catch (e) {
        console.error(
          `Failed to clean persisted state.`,
          e,
        );
        return next(clearPersistedStateFailed({ message: e.message }));
      }
    } else {
      return next(action);
    }
  };

export { saveStateMiddleware, clearStateMiddleware, loadStateMiddleware };