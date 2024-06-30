#include "TesseractWave.h"

TesseractWave::TesseractWave(const char *boardName, int *pins, const char **pinLabels, int numChannels)
    : boardName(boardName), pins(pins), pinLabels(pinLabels), numChannels(numChannels), sampling(false), samplingRate(100)
{
    usedChannels = new int[numChannels];
    for (int i = 0; i < numChannels; i++)
    {
        usedChannels[i] = (i == 0) ? 1 : 0;
    }
    numUsedChannels = 1;
}

TesseractWave::~TesseractWave()
{
    delete[] usedChannels;
}

void TesseractWave::begin()
{
    for (int i = 0; i < numChannels; i++)
    {
        pinMode(pins[i], INPUT);
    }

    Serial.begin(115200);
    while (!Serial)
    {
        ;
    }

    Serial.println("READY");
}

void TesseractWave::loop()
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
            parseSettingsCommand(command);
        }
        else if (command.startsWith("i"))
        {
            sendInfo();
        }
    }
}

void TesseractWave::parseSettingsCommand(String command)
{
    int commaIndex1 = command.indexOf(',');
    int commaIndex2 = command.indexOf(',', commaIndex1 + 1);
    int commaIndex3 = command.indexOf(',', commaIndex2 + 1);

    sampling = (command.charAt(1) == '1');
    samplingRate = command.substring(commaIndex1 + 1, commaIndex2).toInt();

    String usedChannelsStr = command.substring(commaIndex2 + 1);
    for (int i = 0; i < numChannels; i++)
    {
        usedChannels[i] = (usedChannelsStr.charAt(i) == '1') ? 1 : 0;
    }

    numUsedChannels = 0;
    for (int i = 0; i < numChannels; i++)
    {
        if (usedChannels[i] == 1)
        {
            numUsedChannels++;
        }
    }

    Serial.println("OK");
}

void TesseractWave::sendInfo()
{
    String info = String(boardName) + "," + String(numChannels) + "," + String(samplingRate) + ",";

    for (int i = 0; i < numChannels; i++)
    {
        info += pinLabels[i];
        if (i < numChannels - 1)
            info += ",";
    }

    info += ",";

    for (int i = 0; i < numChannels; i++)
    {
        info += usedChannels[i];
        if (i < numChannels - 1)
            info += ",";
    }

    Serial.println(info);
}

void TesseractWave::sample()
{
    for (int i = 0, j = 0; i < numChannels; i++)
    {
        if (usedChannels[i] == 1)
        {
            int value = analogRead(pins[i]);
            Serial.print(value);
            if (j < numUsedChannels - 1)
                Serial.print(",");
            j++;
        }
    }
    Serial.println();
    delay(1000 / samplingRate);
}
