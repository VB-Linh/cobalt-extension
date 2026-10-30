// src/content/toolbar/toolbarState.js

/**
 * Valid feedback states for Floating Toolbar.
 * @readonly
 * @enum {string}
 */
export const TOOLBAR_STATES = Object.freeze({
  IDLE: 'idle',
  HOVERED: 'hovered',
  PROCESSING: 'processing',
  AMBIGUOUS: 'ambiguous',
  SUCCESS: 'success',
  ERROR: 'error',
  UNCONFIGURED: 'unconfigured',
  DISMISSED: 'dismissed',
});

/**
 * Allowed transitions mapping for feedback state machine.
 */
const VALID_TRANSITIONS = {
  [TOOLBAR_STATES.IDLE]: new Set([
    TOOLBAR_STATES.HOVERED,
    TOOLBAR_STATES.UNCONFIGURED,
    TOOLBAR_STATES.PROCESSING,
    TOOLBAR_STATES.DISMISSED,
  ]),
  [TOOLBAR_STATES.HOVERED]: new Set([
    TOOLBAR_STATES.IDLE,
    TOOLBAR_STATES.PROCESSING,
    TOOLBAR_STATES.UNCONFIGURED,
    TOOLBAR_STATES.DISMISSED,
  ]),
  [TOOLBAR_STATES.UNCONFIGURED]: new Set([
    TOOLBAR_STATES.HOVERED,
    TOOLBAR_STATES.IDLE,
    TOOLBAR_STATES.PROCESSING,
    TOOLBAR_STATES.DISMISSED,
  ]),
  [TOOLBAR_STATES.PROCESSING]: new Set([
    TOOLBAR_STATES.SUCCESS,
    TOOLBAR_STATES.ERROR,
    TOOLBAR_STATES.AMBIGUOUS,
    TOOLBAR_STATES.HOVERED,
    TOOLBAR_STATES.IDLE,
    TOOLBAR_STATES.DISMISSED,
  ]),
  [TOOLBAR_STATES.AMBIGUOUS]: new Set([
    TOOLBAR_STATES.PROCESSING,
    TOOLBAR_STATES.SUCCESS,
    TOOLBAR_STATES.ERROR,
    TOOLBAR_STATES.HOVERED,
    TOOLBAR_STATES.IDLE,
    TOOLBAR_STATES.DISMISSED,
  ]),
  [TOOLBAR_STATES.SUCCESS]: new Set([
    TOOLBAR_STATES.HOVERED,
    TOOLBAR_STATES.IDLE,
    TOOLBAR_STATES.DISMISSED,
  ]),
  [TOOLBAR_STATES.ERROR]: new Set([
    TOOLBAR_STATES.PROCESSING,
    TOOLBAR_STATES.HOVERED,
    TOOLBAR_STATES.IDLE,
    TOOLBAR_STATES.DISMISSED,
  ]),
  [TOOLBAR_STATES.DISMISSED]: new Set(), // Terminal state
};

/**
 * Manages the UI feedback state machine for a single Floating Toolbar instance.
 */
export class ToolbarStateManager {
  /**
   * @param {string} [initialState=TOOLBAR_STATES.IDLE]
   */
  constructor(initialState = TOOLBAR_STATES.IDLE) {
    this._state = initialState;
    this._payload = null;
    this._listeners = new Set();
  }

  /**
   * Returns the current feedback state.
   * @returns {string}
   */
  getState() {
    return this._state;
  }

  /**
   * Returns current payload or notice data.
   * @returns {any}
   */
  getPayload() {
    return this._payload;
  }

  /**
   * Checks whether the toolbar is dismissed.
   * @returns {boolean}
   */
  isDismissed() {
    return this._state === TOOLBAR_STATES.DISMISSED;
  }

  /**
   * Checks whether the toolbar is currently visible (hovered or active feedback).
   * @returns {boolean}
   */
  isVisible() {
    return this._state !== TOOLBAR_STATES.IDLE && this._state !== TOOLBAR_STATES.DISMISSED;
  }

  /**
   * Transitions to a new feedback state if valid.
   * 
   * @param {string} nextState
   * @param {any} [payload=null]
   * @returns {boolean} True if transition succeeded, false otherwise.
   */
  setState(nextState, payload = null) {
    if (this._state === TOOLBAR_STATES.DISMISSED) {
      return false; // Terminal state: once dismissed, cannot transition
    }

    if (this._state === nextState) {
      this._payload = payload;
      this._notify(this._state, this._state, payload);
      return true;
    }

    const allowed = VALID_TRANSITIONS[this._state];
    if (!allowed || !allowed.has(nextState)) {
      console.warn(`[X Video Tools] Invalid toolbar state transition: ${this._state} -> ${nextState}`);
      return false;
    }

    const previousState = this._state;
    this._state = nextState;
    this._payload = payload;

    this._notify(this._state, previousState, payload);
    return true;
  }

  /**
   * Subscribes a listener to state transitions.
   * 
   * @param {(currentState: string, previousState: string, payload: any) => void} listener
   * @returns {() => void} Unsubscribe function
   */
  subscribe(listener) {
    if (typeof listener !== 'function') {
      return () => {};
    }
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }

  /**
   * Notifies all registered listeners of a state change.
   * 
   * @private
   * @param {string} current
   * @param {string} previous
   * @param {any} payload
   */
  _notify(current, previous, payload) {
    for (const listener of this._listeners) {
      try {
        listener(current, previous, payload);
      } catch (err) {
        console.error('[X Video Tools] Error in toolbar state subscriber:', err);
      }
    }
  }

  /**
   * Destroys state manager and clears listeners.
   */
  destroy() {
    this._listeners.clear();
    this._payload = null;
  }
}

/**
 * Creates a new ToolbarStateManager instance.
 * @param {string} [initialState]
 * @returns {ToolbarStateManager}
 */
export function createToolbarStateManager(initialState) {
  return new ToolbarStateManager(initialState);
}
