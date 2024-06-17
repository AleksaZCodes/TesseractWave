// Available channels with the according pins and labels
const int pins[] = { A0, A1, A2, A3, A4, A5 };
const int numChannels = sizeof(pins) / sizeof(int);
const char* pinLabels[] = { "A0", "A1", "A2", "A3", "A4", "A5" };

// Recording parameters
bool sampling = false;
int samplingRate = 100;
int usedChannels[] = { 1, 0, 0, 0, 0, 0 };  // 1 for used, 0 for not used
int numUsedChannels = 1;

void setup() {
  // Set pins' modes to input
  for (int i = 0; i < numChannels; i++) {
    pinMode(pins[i], INPUT);
  }

  // Begin the wired serial communication
  Serial.begin(115200);

  while (!Serial) {
    ;  // Wait for Serial port to open
  }

  // Signal to the app that we are ready
  Serial.println("READY");
}

void loop() {
  if (sampling) {
    sample();
  }

  if (Serial.available()) {
    String command = Serial.readStringUntil('\n');
    if (command.startsWith("s")) {
      // Command to change settings
      parseSettingsCommand(command);
    } else if (command.startsWith("i")) {
      // Command to get info
      sendInfo();
    }
  }
}

void parseSettingsCommand(String command) {
  int commaIndex1 = command.indexOf(',');
  int commaIndex2 = command.indexOf(',', commaIndex1 + 1);
  int commaIndex3 = command.indexOf(',', commaIndex2 + 1);

  sampling = (command.charAt(1) == '1');
  samplingRate = command.substring(commaIndex1 + 1, commaIndex2).toInt();

  // Parse usedChannels array
  String usedChannelsStr = command.substring(commaIndex2 + 1);
  for (int i = 0; i < numChannels; i++) {
    usedChannels[i] = (usedChannelsStr.charAt(i) == '1') ? 1 : 0;
  }

  numUsedChannels = 0;
  for (int channel : usedChannels) {
    if (channel == 1) {
      numUsedChannels++;
    }
  }

  Serial.println("OK");  // Send OK response
}

void sendInfo() {
  String info = String(numChannels) + "," + String(samplingRate) + ",";

  // Pin labels
  for (int i = 0; i < numChannels; i++) {
    info += pinLabels[i];
    if (i < numChannels - 1) info += ",";
  }

  info += ",";

  // Used channels
  for (int i = 0; i < numChannels; i++) {
    info += usedChannels[i];
    if (i < numChannels - 1) info += ",";
  }

  Serial.println(info);
}

void sample() {
  for (int i = 0, j = 0; i < numChannels; i++) {
    if (usedChannels[i] == 1) {
      int value = analogRead(pins[i]);
      Serial.print(value);
      if (j < numUsedChannels - 1) Serial.print(",");
      j++;
    }
  }
  Serial.println();
  delay(1000 / samplingRate);
}
