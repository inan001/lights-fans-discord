/**
 * Office Device Monitor — ESP32 Sketch (1-Room Representative Circuit)
 * =====================================================================
 * 
 * HARDWARE CONCEPT
 * ────────────────
 * This sketch demonstrates how a single room's 5 devices (2 fans + 3 lights)
 * would be sensed and reported by an ESP32 microcontroller.
 * 
 * In real deployment:
 *   - LEDs in the Wokwi sim represent relay modules controlling AC devices
 *   - Pushbuttons represent physical toggle switches or relay feedback pins
 *   - An ACS712 current sensor on the mains line would measure actual wattage
 *   - The ESP32 would push state over WiFi to the backend API
 * 
 * PIN MAPPING
 * ───────────
 *   Output (device control / indicator):
 *     GPIO 23 → Light 1 (via 220Ω resistor)
 *     GPIO 22 → Light 2 (via 220Ω resistor)
 *     GPIO 21 → Light 3 (via 220Ω resistor)
 *     GPIO 19 → Fan 1   (via 220Ω resistor)
 *     GPIO 18 → Fan 2   (via 220Ω resistor)
 * 
 *   Input (toggle buttons, INPUT_PULLUP — active LOW):
 *     GPIO 13 → Button for Light 1
 *     GPIO 12 → Button for Light 2
 *     GPIO 14 → Button for Light 3
 *     GPIO 27 → Button for Fan 1
 *     GPIO 26 → Button for Fan 2
 * 
 *   Analog (optional current sensing):
 *     GPIO 34 (ADC1_CH6) → ACS712 current sensor output
 * 
 * WATTAGE ASSUMPTIONS
 * ───────────────────
 *   Fan ON  = 60 W     Fan OFF  = 0 W
 *   Light ON = 15 W    Light OFF = 0 W
 */

#include <WiFi.h>

// ── Pin Definitions ─────────────────────────────────────────────────
const int LIGHT_PINS[]  = {23, 22, 21};
const int FAN_PINS[]    = {19, 18};
const int LIGHT_BTNS[]  = {13, 12, 14};
const int FAN_BTNS[]    = {27, 26};
const int CURRENT_PIN   = 34;   // ACS712 analog input (optional)

const int NUM_LIGHTS = 3;
const int NUM_FANS   = 2;

// ── Device State ────────────────────────────────────────────────────
bool lightState[3] = {false, false, false};
bool fanState[2]   = {false, false};
bool lastBtnLight[3] = {HIGH, HIGH, HIGH};
bool lastBtnFan[2]   = {HIGH, HIGH};

// ── Wattage Constants ───────────────────────────────────────────────
const float LIGHT_WATTS = 15.0;
const float FAN_WATTS   = 60.0;

// ── Timing ──────────────────────────────────────────────────────────
unsigned long lastReport = 0;
const unsigned long REPORT_INTERVAL = 5000; // Report every 5 seconds

void setup() {
  Serial.begin(115200);
  Serial.println("═══════════════════════════════════════");
  Serial.println("  Office Device Monitor — 1 Room Demo");
  Serial.println("═══════════════════════════════════════");

  // Configure output pins (device indicators / relay control)
  for (int i = 0; i < NUM_LIGHTS; i++) {
    pinMode(LIGHT_PINS[i], OUTPUT);
    digitalWrite(LIGHT_PINS[i], LOW);
  }
  for (int i = 0; i < NUM_FANS; i++) {
    pinMode(FAN_PINS[i], OUTPUT);
    digitalWrite(FAN_PINS[i], LOW);
  }

  // Configure input pins (toggle buttons with internal pull-up)
  for (int i = 0; i < NUM_LIGHTS; i++) {
    pinMode(LIGHT_BTNS[i], INPUT_PULLUP);
  }
  for (int i = 0; i < NUM_FANS; i++) {
    pinMode(FAN_BTNS[i], INPUT_PULLUP);
  }

  // Optional: current sense pin
  pinMode(CURRENT_PIN, INPUT);

  Serial.println("[init] All pins configured. Waiting for button input...");
  Serial.println();
}

void loop() {
  // ── Read toggle buttons (debounced edge detection) ────────────
  for (int i = 0; i < NUM_LIGHTS; i++) {
    bool btn = digitalRead(LIGHT_BTNS[i]);
    if (btn == LOW && lastBtnLight[i] == HIGH) {
      lightState[i] = !lightState[i];
      digitalWrite(LIGHT_PINS[i], lightState[i] ? HIGH : LOW);
      Serial.printf("[toggle] Light %d → %s\n", i + 1, lightState[i] ? "ON" : "OFF");
      delay(50); // debounce
    }
    lastBtnLight[i] = btn;
  }

  for (int i = 0; i < NUM_FANS; i++) {
    bool btn = digitalRead(FAN_BTNS[i]);
    if (btn == LOW && lastBtnFan[i] == HIGH) {
      fanState[i] = !fanState[i];
      digitalWrite(FAN_PINS[i], fanState[i] ? HIGH : LOW);
      Serial.printf("[toggle] Fan %d → %s\n", i + 1, fanState[i] ? "ON" : "OFF");
      delay(50); // debounce
    }
    lastBtnFan[i] = btn;
  }

  // ── Periodic status report ────────────────────────────────────
  if (millis() - lastReport >= REPORT_INTERVAL) {
    lastReport = millis();
    reportStatus();
  }

  delay(10); // main loop pace
}

/**
 * Prints a JSON status report to Serial.
 * In production this would be an HTTP POST to the backend API.
 */
void reportStatus() {
  float totalWatts = 0;

  Serial.println("─── Room Status Report ────────────────");

  for (int i = 0; i < NUM_LIGHTS; i++) {
    float w = lightState[i] ? LIGHT_WATTS : 0;
    totalWatts += w;
    Serial.printf("  Light %d: %s  (%.0f W)\n", i + 1, lightState[i] ? "ON " : "OFF", w);
  }
  for (int i = 0; i < NUM_FANS; i++) {
    float w = fanState[i] ? FAN_WATTS : 0;
    totalWatts += w;
    Serial.printf("  Fan   %d: %s  (%.0f W)\n", i + 1, fanState[i] ? "ON " : "OFF", w);
  }

  // Read analog current sensor (ACS712)
  int rawADC = analogRead(CURRENT_PIN);
  float voltage = (rawADC / 4095.0) * 3.3;
  // ACS712-05B: 185 mV/A, quiescent voltage = VCC/2 = 2.5V
  float current = (voltage - 2.5) / 0.185;
  if (current < 0) current = 0;

  Serial.printf("  ── Total: %.0f W", totalWatts);
  Serial.printf("  |  Current Sensor: %.2f A (raw ADC: %d)\n", current, rawADC);
  Serial.println("───────────────────────────────────────");

  // In production, this is where we'd POST to the backend:
  // httpClient.begin("http://backend-server:4000/devices/report");
  // httpClient.addHeader("Content-Type", "application/json");
  // httpClient.POST(jsonPayload);
}
