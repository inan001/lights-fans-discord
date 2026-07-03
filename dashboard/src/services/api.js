/**
 * Backend API and WebSocket Service Layer
 * Automatically connects to backend REST/WS, with smart fallbacks to local simulation when offline.
 */

import { store } from '../store/state.js';
import { simulator } from './simulator.js';

class ApiService {
  constructor() {
    this.wsUrl = 'ws://localhost:4000';
    this.baseUrl = 'http://localhost:4000/';
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
    this.reconnectDelay = 3000; // 3 seconds
    this.isManualDisconnect = false;
  }

  /**
   * Initializes connections. If WS fails, triggers simulator.
   */
  async init() {
    this.isManualDisconnect = false;
    this.reconnectAttempts = 0;
    await this.connectWebSocket();
  }

  async connectWebSocket() {
    if (this.ws) {
      this.ws.close();
    }

    store.setState({ connectionStatus: 'reconnecting' });
    console.log(`Connecting to WebSocket: ${this.wsUrl}...`);

    try {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connection established successfully!');
        this.reconnectAttempts = 0;
        store.setState({ connectionStatus: 'connected' });
        
        // Stop client simulator if it was running
        simulator.stop();

        // Fetch initial data from REST API
        this.syncInitialData();
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          this.handleWebSocketMessage(payload);
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      this.ws.onclose = (event) => {
        console.log(`WebSocket closed: Code ${event.code}, Reason: ${event.reason}`);
        if (!this.isManualDisconnect) {
          this.handleConnectionFailure();
        }
      };

      this.ws.onerror = (err) => {
        console.error('WebSocket connection error:', err);
        // Onclose will handle the retry
      };

    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
      this.handleConnectionFailure();
    }
  }

  handleConnectionFailure() {
    this.reconnectAttempts++;
    if (this.reconnectAttempts <= this.maxReconnectAttempts) {
      console.warn(`WebSocket connection failed. Reconnection attempt ${this.reconnectAttempts} of ${this.maxReconnectAttempts}...`);
      store.setState({ connectionStatus: 'reconnecting' });
      setTimeout(() => {
        this.connectWebSocket();
      }, this.reconnectDelay);
    } else {
      console.error('Failed to connect to backend after maximum attempts. Falling back to local simulation mode.');
      store.setState({ connectionStatus: 'simulating' });
      
      // Start browser simulator
      simulator.start();
    }
  }

  // REST API simulation triggers / mock data fetching
  async syncInitialData() {
    if (store.getState().connectionStatus !== 'connected') return;

    try {
      // Fetch devices
      const devicesRes = await fetch(`${this.apiUrl}/devices`);
      const devices = await devicesRes.json();
      
      // Fetch power logs
      const powerRes = await fetch(`${this.apiUrl}/power`);
      const powerData = await powerRes.json();

      // Fetch alerts
      const alertsRes = await fetch(`${this.apiUrl}/alerts`);
      const alerts = await alertsRes.json();

      // Fetch timeline logs
      const historyRes = await fetch(`${this.apiUrl}/history`);
      const history = await historyRes.json();

      store.setState({
        devices,
        alerts,
        timeline: history,
        powerHistory: powerData
      });
    } catch (err) {
      console.error('Error syncing REST initial data:', err);
      // Fallback to simulation data even if WS opened but REST endpoints crashed
      store.setState({ connectionStatus: 'simulating' });
      simulator.start();
    }
  }

  /**
   * Action dispatcher: Toggles a device's state.
   * Sends REST POST/PUT when connected, or redirects to local simulator in fallback mode.
   * @param {string} deviceId 
   * @param {string} status 'on' | 'off'
   * @param {string} operatorName name of active operator
   */
  async toggleDevice(deviceId, status, operatorName) {
    const connectionStatus = store.getState().connectionStatus;
    
    if (connectionStatus === 'simulating') {
      // Client-side simulation mode
      simulator.toggleDeviceState(deviceId, status, operatorName);
      return;
    }

    // Direct API route
    try {
      const res = await fetch(`${this.apiUrl}/devices/${deviceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, operator: operatorName })
      });

      if (!res.ok) {
        throw new Error(`Failed to update device: ${res.statusText}`);
      }
      
      console.log(`Command sent to backend: Toggle ${deviceId} to ${status}`);
    } catch (err) {
      console.error('API toggle request failed:', err);
      // Trigger user warning alert
      alert(`API toggle failed. Please retry connection or use simulation mode.`);
    }
  }

  // Message dispatcher for real backend WebSocket channels
  handleWebSocketMessage(payload) {
    const { event, data } = payload;
    console.log(`Received websocket event: ${event}`, data);

    switch (event) {
      case 'device_updated':
        // Updates status, power, lastChanged for target device ID
        store.setState(state => {
          const updatedDevices = state.devices.map(d => 
            d.id === data.id ? { ...d, ...data } : d
          );
          return { devices: updatedDevices };
        });
        break;

      case 'power_updated':
        // Receives whole office power stats or updates chart history
        store.setState(state => {
          let updatedHistory = [...state.powerHistory];
          updatedHistory.push(data);
          if (updatedHistory.length > 30) {
            updatedHistory.shift();
          }
          return { powerHistory: updatedHistory };
        });
        break;

      case 'alert_created':
        // Inserts new warning alert card at top of stack
        store.setState(state => ({
          alerts: [data, ...state.alerts]
        }));
        break;

      case 'history_updated':
        // Pushes timeline log item
        store.setState(state => ({
          timeline: [data, ...state.timeline].slice(0, 50)
        }));
        break;

      case 'connection_lost':
        // Force reconnect routine
        console.warn('Backend notified server connection lost event.');
        this.connectWebSocket();
        break;
        
      default:
        console.warn(`Unhandled websocket event: ${event}`);
    }
  }

  disconnect() {
    this.isManualDisconnect = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    simulator.stop();
    store.setState({ connectionStatus: 'disconnected' });
  }
}

export const api = new ApiService();
