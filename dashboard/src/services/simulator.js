/**
 * Client-Side Live Simulator Service
 * Generates dynamic device states, power draws, alert warnings, and activity timelines.
 */

import { store } from '../store/state.js';

const OPERATORS = [
  { name: 'Nafisa Rahman', email: 'nafisa.rahman@yahoo.com', phone: '+8801812345678' },
  { name: 'Tanvir Hossain', email: 'tanvir.hossain@yahoo.com', phone: '+8801912345678' }
];

class DeviceSimulator {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    
    // Set status to simulating
    store.setState({ connectionStatus: 'simulating' });

    // Initialize historical data for the last 30 minutes (30 data points, 1 min apart)
    this.initializePowerHistory();

    // Load initial mock alerts & timeline activities
    this.loadInitialData();

    // Start background simulation loop
    this.intervalId = setInterval(() => {
      this.tick();
    }, 5000); // Trigger a simulation event every 5 seconds
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
  }

  // Prepopulate power history with realistic wattage fluctuations
  initializePowerHistory() {
    const history = [];
    const now = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const timePoint = new Date(now.getTime() - i * 60000);
      const timeStr = timePoint.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      // Prepopulate a mix of states yielding 100W to 500W
      const mockPower = 100 + Math.floor(Math.random() * 400);
      history.push({ time: timeStr, power: mockPower });
    }

    store.setState({ powerHistory: history });
  }

  loadInitialData() {
    const timeNow = new Date();
    
    // 1. Initial Timeline events
    const initialTimeline = [
      {
        id: 'init_1',
        timestamp: this.getOffsetTimeString(timeNow, 12),
        type: 'device_toggle',
        description: `<span class="operator-highlight">Nafisa Rahman</span> turned <span style="color:var(--success-color);font-weight:600;">ON</span> Light 1 in Drawing Room`
      },
      {
        id: 'init_2',
        timestamp: this.getOffsetTimeString(timeNow, 10),
        type: 'device_toggle',
        description: `<span class="operator-highlight">Tanvir Hossain</span> turned <span style="color:var(--success-color);font-weight:600;">ON</span> Fan 2 in Work Room 1`
      },
      {
        id: 'init_3',
        timestamp: this.getOffsetTimeString(timeNow, 7),
        type: 'alert_raised',
        description: `Alert created: <span style="color:var(--danger-color);font-weight:600;">Drawing Room devices active for more than 2 hours</span>`
      },
      {
        id: 'init_4',
        timestamp: this.getOffsetTimeString(timeNow, 3),
        type: 'device_toggle',
        description: `<span class="operator-highlight">Nafisa Rahman</span> turned <span style="color:var(--text-muted);font-weight:600;">OFF</span> Light 2 in Work Room 2`
      }
    ];

    // 2. Initial Alerts
    const initialAlerts = [
      {
        id: 'alert_after_hours',
        severity: 'warning',
        room: 'Work Room 2',
        description: 'Work Room 2 has devices ON after office hours (9 AM - 5 PM).',
        timestamp: this.getOffsetTimeString(timeNow, 15)
      },
      {
        id: 'alert_duration',
        severity: 'danger',
        room: 'Drawing Room',
        description: 'Drawing Room devices active for more than two hours.',
        timestamp: this.getOffsetTimeString(timeNow, 7)
      }
    ];

    // Configure some devices as ON by default to reflect these alerts and power calculations
    const defaultState = store.getState();
    const updatedDevices = defaultState.devices.map(device => {
      // Drawing Room Light 1: ON (corresponds to init_1)
      if (device.id === 'drawing_room_light_1') {
        return { ...device, status: 'on', power: 15, lastToggledBy: 'Nafisa Rahman', lastChanged: this.getOffsetTimeString(timeNow, 12) };
      }
      // Work Room 1 Fan 2: ON (corresponds to init_2)
      if (device.id === 'work_room_1_fan_2') {
        return { ...device, status: 'on', power: 60, lastToggledBy: 'Tanvir Hossain', lastChanged: this.getOffsetTimeString(timeNow, 10) };
      }
      // Work Room 2 Fan 1: ON (to match after-hours alert)
      if (device.id === 'work_room_2_fan_1') {
        return { ...device, status: 'on', power: 60, lastToggledBy: 'System Auto', lastChanged: this.getOffsetTimeString(timeNow, 20) };
      }
      // Work Room 2 Light 3: ON
      if (device.id === 'work_room_2_light_3') {
        return { ...device, status: 'on', power: 15, lastToggledBy: 'System Auto', lastChanged: this.getOffsetTimeString(timeNow, 15) };
      }
      return device;
    });

    store.setState({
      devices: updatedDevices,
      alerts: initialAlerts,
      timeline: initialTimeline
    });

    this.recalculatePower();
  }

  // Get time string offset by N minutes ago
  getOffsetTimeString(baseDate, minsAgo) {
    const t = new Date(baseDate.getTime() - minsAgo * 60000);
    return t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  // Simulates a single tick of backend updates (occurs every 5 seconds)
  tick() {
    const currentState = store.getState();
    if (currentState.connectionStatus !== 'simulating') return;

    // 10% chance to simulate a random operator toggling a device
    if (Math.random() < 0.3) {
      this.simulateRandomToggle();
    } else {
      // Otherwise just tick the power history and refresh connection stats
      this.recalculatePower();
    }
  }

  simulateRandomToggle() {
    const state = store.getState();
    const randomIndex = Math.floor(Math.random() * state.devices.length);
    const device = state.devices[randomIndex];
    const newStatus = device.status === 'on' ? 'off' : 'on';
    const operator = OPERATORS[Math.floor(Math.random() * OPERATORS.length)];
    
    this.toggleDeviceState(device.id, newStatus, operator.name);
  }

  /**
   * Action executor to toggle device state in central store, triggers timeline log and alerts rules.
   */
  toggleDeviceState(deviceId, status, operatorName = 'System Auto') {
    const state = store.getState();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    const updatedDevices = state.devices.map(device => {
      if (device.id === deviceId) {
        const power = status === 'on' ? (device.type === 'fan' ? 60 : 15) : 0;
        return {
          ...device,
          status,
          power,
          lastChanged: timeStr,
          lastToggledBy: operatorName
        };
      }
      return device;
    });

    // Create a new timeline event
    const targetDevice = state.devices.find(d => d.id === deviceId);
    const actionColor = status === 'on' ? 'var(--success-color)' : 'var(--text-muted)';
    const newEvent = {
      id: `evt_${Date.now()}`,
      timestamp: timeStr,
      type: 'device_toggle',
      description: `<span class="operator-highlight">${operatorName}</span> turned <span style="color:${actionColor};font-weight:600;">${status.toUpperCase()}</span> ${targetDevice.name} in ${targetDevice.room}`
    };

    // Update state
    store.setState(prev => ({
      devices: updatedDevices,
      timeline: [newEvent, ...prev.timeline].slice(0, 50) // Keep latest 50 events
    }));

    // Recalculate power usage & re-evaluate alerts
    this.recalculatePower();
    this.evaluateAlertRules(deviceId, status, operatorName);
  }

  recalculatePower() {
    const state = store.getState();
    let totalPower = 0;
    let activeDevicesCount = 0;

    state.devices.forEach(d => {
      if (d.status === 'on') {
        totalPower += d.power;
        activeDevicesCount++;
      }
    });

    // Update power history (rolling 30 mins)
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let updatedHistory = [...state.powerHistory];
    
    // Add current watt usage. If last point matches current minute, update it, otherwise push new and shift.
    if (updatedHistory.length > 0 && updatedHistory[updatedHistory.length - 1].time === timeStr) {
      updatedHistory[updatedHistory.length - 1].power = totalPower;
    } else {
      updatedHistory.push({ time: timeStr, power: totalPower });
      if (updatedHistory.length > 30) {
        updatedHistory.shift();
      }
    }

    store.setState({
      powerHistory: updatedHistory
    });
  }

  evaluateAlertRules(triggerDeviceId, triggerStatus, operatorName) {
    const state = store.getState();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const currentHour = new Date().getHours();
    
    const triggerDevice = state.devices.find(d => d.id === triggerDeviceId);
    const room = triggerDevice.room;
    
    let updatedAlerts = [...state.alerts];
    let newAlertRaised = false;

    // Rule 1: Devices left ON after office hours (9 AM - 5 PM)
    const isAfterHours = currentHour < 9 || currentHour >= 17;
    const roomDevices = state.devices.filter(d => d.room === room);
    const roomHasActiveDevices = roomDevices.some(d => d.status === 'on');
    
    const afterHoursAlertId = `alert_after_hours_${room.toLowerCase().replace(/\s+/g, '_')}`;
    const afterHoursAlertIndex = updatedAlerts.findIndex(a => a.id === afterHoursAlertId);

    if (isAfterHours && roomHasActiveDevices) {
      if (afterHoursAlertIndex === -1) {
        // Raise new alert
        const desc = `${room} has devices ON after office hours (9 AM - 5 PM).`;
        updatedAlerts.unshift({
          id: afterHoursAlertId,
          severity: 'warning',
          room,
          description: desc,
          timestamp: timeStr
        });
        newAlertRaised = true;
        this.addAlertTimelineNode(desc, timeStr);
      }
    } else {
      // Clear alert if no devices are ON or if back to office hours
      if (afterHoursAlertIndex !== -1) {
        updatedAlerts.splice(afterHoursAlertIndex, 1);
      }
    }

    // Rule 2: Room devices active for more than 2 hours.
    // If a user turns a device ON, there's a 15% chance to simulate a warning that the room has had devices on for 2+ hours
    const durationAlertId = `alert_duration_${room.toLowerCase().replace(/\s+/g, '_')}`;
    const durationAlertIndex = updatedAlerts.findIndex(a => a.id === durationAlertId);

    if (triggerStatus === 'on' && Math.random() < 0.25) {
      if (durationAlertIndex === -1) {
        const desc = `${room} devices active for more than two hours continuously.`;
        updatedAlerts.unshift({
          id: durationAlertId,
          severity: 'danger',
          room,
          description: desc,
          timestamp: timeStr
        });
        newAlertRaised = true;
        this.addAlertTimelineNode(desc, timeStr);
      }
    }

    if (newAlertRaised) {
      store.setState({ alerts: updatedAlerts });
    }
  }

  addAlertTimelineNode(description, timestamp) {
    const alertEvent = {
      id: `evt_alert_${Date.now()}`,
      timestamp,
      type: 'alert_raised',
      description: `Alert created: <span style="color:var(--danger-color);font-weight:600;">${description}</span>`
    };

    store.setState(prev => ({
      timeline: [alertEvent, ...prev.timeline].slice(0, 50)
    }));
  }
}

export const simulator = new DeviceSimulator();
export { OPERATORS };
