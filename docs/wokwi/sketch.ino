// 3 Lights (External LEDs)
#define LIGHT_1 15
#define LIGHT_2 5
#define LIGHT_3 4

// 2 Fan Relays
#define FAN_RELAY_1 12
#define FAN_RELAY_2 14

void setup() {
  Serial.begin(115200);

  // Initialize all 5 pins as outputs
  pinMode(LIGHT_1, OUTPUT);
  pinMode(LIGHT_2, OUTPUT);
  pinMode(LIGHT_3, OUTPUT);
  pinMode(FAN_RELAY_1, OUTPUT);
  pinMode(FAN_RELAY_2, OUTPUT);

  Serial.println("EcoOffice Full Room System Initialized.");
}

void loop() {
  // --- STATE 1: Turn everything ON ---
  Serial.println("--- ROOM ACTIVE ---");
  Serial.println("Status: 3 Lights ON | 2 Fans Active (Full Power)");

  digitalWrite(LIGHT_1, HIGH);
  digitalWrite(LIGHT_2, HIGH);
  digitalWrite(LIGHT_3, HIGH);
  digitalWrite(FAN_RELAY_1, HIGH); // Closes relay 1 -> Turns Fan 1 ON
  digitalWrite(FAN_RELAY_2, HIGH); // Closes relay 2 -> Turns Fan 2 ON
  delay(4000); // Keep on for 4 seconds

  // --- STATE 2: Eco Mode (Turn everything OFF) ---
  Serial.println("--- ECO MODE ---");
  Serial.println("Status: 3 Lights OFF | 2 Fans OFF (Energy Saved)");

  digitalWrite(LIGHT_1, LOW);
  digitalWrite(LIGHT_2, LOW);
  digitalWrite(LIGHT_3, LOW);
  digitalWrite(FAN_RELAY_1, LOW);  // Opens relay 1 -> Cuts power to Fan 1
  digitalWrite(FAN_RELAY_2, LOW);  // Opens relay 2 -> Cuts power to Fan 2
  delay(4000); // Keep off for 4 seconds
}
