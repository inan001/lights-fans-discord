/**
 * Central State Store for Smart Office Monitoring System
 */

class StateStore {
  constructor() {
    this.state = {
      connectionStatus: 'disconnected', // 'connected' | 'reconnecting' | 'disconnected' | 'simulating'
      lastSync: 'Never',
      devices: this.getInitialDevices(),
      alerts: [],
      timeline: [],
      powerHistory: [] // array of { time: string, power: number } for last 30 mins
    };
    this.listeners = new Set();
  }

  // Generate the initial list of 15 devices with off states
  getInitialDevices() {
    const rooms = ['Drawing Room', 'Work Room 1', 'Work Room 2'];
    const devicesList = [];

    rooms.forEach(room => {
      // Fan 1, Fan 2
      for (let i = 1; i <= 2; i++) {
        const id = `${room.toLowerCase().replace(/\s+/g, '_')}_fan_${i}`;
        devicesList.push({
          id,
          name: `Fan ${i}`,
          room,
          type: 'fan',
          status: 'off',
          power: 0,
          lastChanged: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          lastToggledBy: 'System Initialization'
        });
      }
      // Light 1, Light 2, Light 3
      for (let i = 1; i <= 3; i++) {
        const id = `${room.toLowerCase().replace(/\s+/g, '_')}_light_${i}`;
        devicesList.push({
          id,
          name: `Light ${i}`,
          room,
          type: 'light',
          status: 'off',
          power: 0,
          lastChanged: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          lastToggledBy: 'System Initialization'
        });
      }
    });

    return devicesList;
  }

  /**
   * Subscribe to state updates. Returns unsubscribe function.
   * @param {Function} listener 
   */
  subscribe(listener) {
    this.listeners.add(listener);
    // Initial run
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Update state and notify listeners
   * @param {Object|Function} updates 
   */
  setState(updates) {
    const nextState = typeof updates === 'function' ? updates(this.state) : updates;
    this.state = { ...this.state, ...nextState };
    
    // Auto-calculate sync timestamp if state is updated
    this.state.lastSync = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    this.listeners.forEach(listener => {
      try {
        listener(this.state);
      } catch (err) {
        console.error('Error in state listener:', err);
      }
    });
  }

  /**
   * Get the current snapshot of the state
   */
  getState() {
    return this.state;
  }
}

// Single export instance for the application
export const store = new StateStore();
