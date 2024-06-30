#include <TesseractWave.h>

const int pins[] = {A0, A1, A2, A3, A4, A5};
const char *pinLabels[] = {"A0", "A1", "A2", "A3", "A4", "A5"};
const char *boardName = "Arduino Uno";
TesseractWave tw(boardName, pins, pinLabels, sizeof(pins) / sizeof(int));

void setup()
{
  tw.begin();
}

void loop()
{
  tw.loop();
}
