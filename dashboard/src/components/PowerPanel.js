/**
 * Power Analytics Panel Component
 * Houses the cumulative watt hero card, dial gauge load index, per-room progress bars,
 * and a live rolling Chart.js line chart for the last 30 minutes.
 */

import { store } from '../store/state.js';
import { getIcon } from '../utils/helpers.js';

export class PowerPanel {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.chart = null;
    this.previousPower = 0;

    store.subscribe(state => this.render(state));
  }

  // Linear numeric animation helper for power wattage counter
  animatePowerNumber(targetValue) {
    const powerNumberEl = document.getElementById('live-total-watts');
    if (!powerNumberEl) return;

    let start = this.previousPower;
    const end = targetValue;
    if (start === end) return;

    const duration = 600; // ms
    const startTime = performance.now();

    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out quad formula
      const easedProgress = progress * (2 - progress);
      const currentVal = Math.round(start + (end - start) * easedProgress);
      
      if (powerNumberEl) {
        powerNumberEl.innerHTML = `${currentVal}<span class="hero-unit">W</span>`;
      }

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        this.previousPower = end;
      }
    };

    requestAnimationFrame(step);
  }

  updateChart(powerHistory) {
    const canvas = document.getElementById('analytics-line-chart');
    if (!canvas) return;

    const labels = powerHistory.map(h => h.time);
    const data = powerHistory.map(h => h.power);

    if (!this.chart) {
      // Initialize Chart.js
      const ctx = canvas.getContext('2d');
      
      // Create glowing gradient for line chart area fill
      const fillGradient = ctx.createLinearGradient(0, 0, 0, 150);
      fillGradient.addColorStop(0, 'rgba(59, 130, 246, 0.25)');
      fillGradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');

      this.chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Total Power Draw (W)',
            data: data,
            borderColor: '#3b82f6',
            borderWidth: 2,
            pointBackgroundColor: '#3b82f6',
            pointBorderColor: '#0f172a',
            pointBorderWidth: 1.5,
            pointRadius: 3,
            pointHoverRadius: 5,
            fill: true,
            backgroundColor: fillGradient,
            tension: 0.3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#0f172a',
              titleColor: '#94a3b8',
              bodyColor: '#f8fafc',
              borderColor: '#334155',
              borderWidth: 1,
              padding: 8,
              cornerRadius: 6,
              displayColors: false,
              callbacks: {
                label: (context) => `Power: ${context.parsed.y} W`
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: {
                color: '#64748b',
                font: { size: 9, family: 'Outfit' },
                maxRotation: 0,
                autoSkip: true,
                maxTicksLimit: 6
              }
            },
            y: {
              grid: {
                color: 'rgba(255, 255, 255, 0.03)',
                lineWidth: 1
              },
              ticks: {
                color: '#64748b',
                font: { size: 9, family: 'Outfit' },
                stepSize: 100
              },
              min: 0,
              max: 550 // Total max possible power is 495W
            }
          }
        }
      });
    } else {
      // Update existing chart instance
      this.chart.data.labels = labels;
      this.chart.data.datasets[0].data = data;
      this.chart.update('none'); // Update without full transition to conserve performance
    }
  }

  render(state) {
    const { devices, powerHistory } = state;
    
    // Max capacity calculations: 2 fans (60W) + 3 lights (15W) = 165W per room
    const MAX_ROOM_POWER = 165;
    const MAX_TOTAL_POWER = 495;

    // Calculate current room levels and device counts
    let activeDevicesCount = 0;
    let drawingRoomPower = 0;
    let workRoom1Power = 0;
    let workRoom2Power = 0;

    devices.forEach(device => {
      if (device.status === 'on') {
        activeDevicesCount++;
        const p = device.power;
        if (device.room === 'Drawing Room') drawingRoomPower += p;
        else if (device.room === 'Work Room 1') workRoom1Power += p;
        else if (device.room === 'Work Room 2') workRoom2Power += p;
      }
    });

    const totalPower = drawingRoomPower + workRoom1Power + workRoom2Power;
    const loadPercentage = Math.min(Math.round((totalPower / MAX_TOTAL_POWER) * 100), 100);

    // Compute progress bar percentages relative to room capacity (165W)
    const dpPercent = Math.min(Math.round((drawingRoomPower / MAX_ROOM_POWER) * 100), 100);
    const w1Percent = Math.min(Math.round((workRoom1Power / MAX_ROOM_POWER) * 100), 100);
    const w2Percent = Math.min(Math.round((workRoom2Power / MAX_ROOM_POWER) * 100), 100);

    // Determine colors for progress bars based on loads
    const getBarColor = (pct) => {
      if (pct > 75) return 'var(--danger-color)';
      if (pct > 40) return 'var(--warning-color)';
      return 'var(--primary-color)';
    };

    // Calculate SVG circular stroke offset for Dial Gauge
    // Circumference = 2 * pi * r = 2 * 3.14159 * 35 = 220
    const circumference = 220;
    const dashOffset = circumference - (loadPercentage / 100) * circumference;

    // If container is empty, structure the elements
    if (!this.container.querySelector('.power-metrics-hero')) {
      this.container.innerHTML = `
        <div class="panel-header">
          <h2 class="panel-title">
            ${getIcon('zap', 'title-icon', 18)}
            Power Analytics
          </h2>
          <span style="font-size:0.7rem; color:var(--text-muted); font-weight:600; text-transform:uppercase; background:rgba(255,255,255,0.03); border:1px solid var(--border-color); padding: 0.15rem 0.5rem; border-radius: 4px;">
            Live
          </span>
        </div>

        <div class="panel-content" style="display:flex; flex-direction:column; justify-content:space-between; height:100%;">
          <!-- Hero cumulative usage and Gauge section -->
          <div class="power-metrics-hero">
            <div class="hero-left">
              <span class="hero-label">Current Usage</span>
              <span class="hero-watts" id="live-total-watts">${totalPower}<span class="hero-unit">W</span></span>
              <span class="hero-active-devices" id="live-active-devices-count">${activeDevicesCount} / 15 active devices</span>
            </div>
            
            <div class="dial-gauge-wrapper">
              <svg width="86" height="86" class="dial-svg">
                <defs>
                  <linearGradient id="gauge-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="#3b82f6" />
                    <stop offset="60%" stop-color="#f59e0b" />
                    <stop offset="100%" stop-color="#ef4444" />
                  </linearGradient>
                </defs>
                <circle cx="43" cy="43" r="35" class="dial-circle-bg" />
                <circle cx="43" cy="43" r="35" class="dial-circle-fill" id="dial-indicator" />
              </svg>
              <div class="dial-percentage" id="dial-pct-label">${loadPercentage}%</div>
            </div>
          </div>

          <!-- Per-room Progress bars breakdown -->
          <div class="room-bars-section">
            <div class="bar-row">
              <div class="bar-info">
                <span class="bar-name">Drawing Room</span>
                <span class="bar-value" id="bar-val-dp">${drawingRoomPower} W</span>
              </div>
              <div class="bar-track">
                <div class="bar-fill" id="bar-fill-dp" style="width: ${dpPercent}%; background: ${getBarColor(dpPercent)};"></div>
              </div>
            </div>

            <div class="bar-row">
              <div class="bar-info">
                <span class="bar-name">Work Room 1</span>
                <span class="bar-value" id="bar-val-w1">${workRoom1Power} W</span>
              </div>
              <div class="bar-track">
                <div class="bar-fill" id="bar-fill-w1" style="width: ${w1Percent}%; background: ${getBarColor(w1Percent)};"></div>
              </div>
            </div>

            <div class="bar-row">
              <div class="bar-info">
                <span class="bar-name">Work Room 2</span>
                <span class="bar-value" id="bar-val-w2">${workRoom2Power} W</span>
              </div>
              <div class="bar-track">
                <div class="bar-fill" id="bar-fill-w2" style="width: ${w2Percent}%; background: ${getBarColor(w2Percent)};"></div>
              </div>
            </div>
          </div>

          <!-- Live Chart container -->
          <div class="chart-container-wrapper">
            <h3 class="chart-title">30-Minute Power History</h3>
            <div class="chart-canvas-holder">
              <canvas id="analytics-line-chart"></canvas>
            </div>
          </div>
        </div>
      `;
      this.previousPower = totalPower;
    } else {
      // Element updates (efficient state modifications)
      this.animatePowerNumber(totalPower);
      
      const devicesCountEl = document.getElementById('live-active-devices-count');
      if (devicesCountEl) devicesCountEl.textContent = `${activeDevicesCount} / 15 active devices`;

      const dialIndicator = document.getElementById('dial-indicator');
      if (dialIndicator) dialIndicator.style.strokeDashoffset = dashOffset;

      const dialPctLabel = document.getElementById('dial-pct-label');
      if (dialPctLabel) dialPctLabel.textContent = `${loadPercentage}%`;

      // Progress bar updates
      const dpBar = document.getElementById('bar-fill-dp');
      if (dpBar) {
        dpBar.style.width = `${dpPercent}%`;
        dpBar.style.backgroundColor = getBarColor(dpPercent);
      }
      const dpVal = document.getElementById('bar-val-dp');
      if (dpVal) dpVal.textContent = `${drawingRoomPower} W`;

      const w1Bar = document.getElementById('bar-fill-w1');
      if (w1Bar) {
        w1Bar.style.width = `${w1Percent}%`;
        w1Bar.style.backgroundColor = getBarColor(w1Percent);
      }
      const w1Val = document.getElementById('bar-val-w1');
      if (w1Val) w1Val.textContent = `${workRoom1Power} W`;

      const w2Bar = document.getElementById('bar-fill-w2');
      if (w2Bar) {
        w2Bar.style.width = `${w2Percent}%`;
        w2Bar.style.backgroundColor = getBarColor(w2Percent);
      }
      const w2Val = document.getElementById('bar-val-w2');
      if (w2Val) w2Val.textContent = `${workRoom2Power} W`;
    }

    // Chart.js rendering (async/timeout check to ensure DOM has rendered completely)
    setTimeout(() => {
      this.updateChart(powerHistory);
    }, 50);
  }
}
