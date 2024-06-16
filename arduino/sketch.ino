// Available channels with the according pins and labels
const int pins[] = {A0, A1, A2, A3, A4, A5};
const char *pinLabels[] = {"A0", "A1", "A2", "A3", "A4", "A5"};
const int numChannels = sizeof(pins) / sizeof(int);

// Recording parameters
bool sampling = false;
int usedChannels = 3;
int samplingRate = 100;

void setup()
{
    // Set pins' modes to input
    for (int pin : pins)
    {
        pinMode(pin, INPUT);
    }

    // Begin the wired serial communication
    Serial.begin(115200);

    while (!Serial)
    {
        ; // Wait for Serial port to open
    }

    // Signal to the app that we are ready
    Serial.println("READY");
}

void loop()
{
    if (sampling)
    {
        sample();
    }

    if (Serial.available())
    {
        String command = Serial.readStringUntil('\n');
        if (command.startsWith("s"))
        {
            // Command to change settings
            parseSettingsCommand(command);
        }
        else if (command.startsWith("i"))
        {
            // Command to get info
            sendInfo();
        }
    }
}

void parseSettingsCommand(String command)
{
    int commaIndex1 = command.indexOf(',');
    int commaIndex2 = command.indexOf(',', commaIndex1 + 1);
    sampling = (command.charAt(1) == '1');
    usedChannels = command.substring(commaIndex1 + 1, commaIndex2).toInt();
    samplingRate = command.substring(commaIndex2 + 1).toInt();
    Serial.println("OK"); // Send OK response
}

void sendInfo()
{
    String info = String(usedChannels) + "," + String(samplingRate) + ",";
    for (int i = 0; i < numChannels; i++)
    {
        info += pinLabels[i];
        if (i < numChannels - 1)
            info += ",";
    }
    Serial.println(info);
}

void sample()
{
    for (int i = 0; i < usedChannels; i++)
    {
        int value = analogRead(pins[i]);
        Serial.print(value);
        if (i < usedChannels - 1)
            Serial.print(",");
    }
    Serial.println();
    delay(1000 / samplingRate);
}
