#include <SoftwareSerial.h>

#define IN  4
 

SoftwareSerial loraSerial(2, 3); // TX, RX

String turnOn = "on";


void setup() {
  pinMode(IN, INPUT);
  Serial.begin(9600);
  loraSerial.begin(9600);
  
}

void loop() {

  if(digitalRead(IN) == HIGH) {
    loraSerial.print(turnOn);
    if (digitalRead(IN) == HIGH) {
      while(digitalRead(IN) == HIGH);
    } else {
      delay(100);
    }
  }
  
  


}
