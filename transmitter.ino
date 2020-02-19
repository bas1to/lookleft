#include <SoftwareSerial.h>

#define IN  4
 

SoftwareSerial loraSerial(2, 3); // TX, RX

// using the command "on" may cause problems with other devices sending the same string
// we recommend generating a random string with a tool like https://passwordsgenerator.net/
// set length to 6 and only select lowercase characters, uppercase characters and numbers
// remember to paste the string in the receiver_panel.ino

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
