#ifndef TesseractWave_h
#define TesseractWave_h

#include <Arduino.h>

class TesseractWave
{
public:
    TesseractWave(const char *boardName, int *pins, const char **pinLabels, int numChannels);
    ~TesseractWave();
    void begin();
    void loop();
    void parseSettingsCommand(String command);
    void sendInfo();
    void sample();

private:
    const char *boardName;
    int *pins;
    const char **pinLabels;
    int numChannels;
    bool sampling;
    int samplingRate;
    int *usedChannels;
    int numUsedChannels;
};

#endif