#include "Adafruit_GFX.h"
#include "Adafruit_HT1632.h"
#include <SoftwareSerial.h>


#define HT_DATA 2
#define HT_WR   3
#define HT_CS   4
#define HT_CS2  5

// Lora Antenna
SoftwareSerial loraSerial(2, 3); // TX, RX

int i;

// use this line for single matrix
Adafruit_HT1632LEDMatrix matrix = Adafruit_HT1632LEDMatrix(HT_DATA, HT_WR, HT_CS);


unsigned char sleepingeye[]  = 
  
 {0x00, 0x00, 0x00, 0x00, 0x00, 0x1e, 0x00, 0x00, 0x02, 0x00, 0x00, 0x04, 0x00, 0x00, 0x08, 0x00, 
  0x03, 0x90, 0x00, 0x00, 0x9e, 0x00, 0x01, 0x00, 0x00, 0x03, 0x80, 0x00, 0x00, 0x00, 0x40, 0x24, 
  0x02, 0x20, 0x42, 0x04, 0x1f, 0x81, 0xf8, 0x29, 0x42, 0x94, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00};
  
unsigned char sleepingeye2[] =  

 {0x00, 0x00, 0x00, 0x00, 0x00, 0x3c, 0x00, 0x00, 0x04, 0x00, 0x00, 0x08, 0x00, 0x03, 0x90, 0x00, 
  0x00, 0xa0, 0x00, 0x01, 0x3c, 0x00, 0x03, 0x80, 0x00, 0x00, 0x00, 0x40, 0x24, 0x02, 0x20, 0x42, 
  0x04, 0x1f, 0x81, 0xf8, 0x29, 0x42, 0x94, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00};

unsigned char eye[]  = 
  
 {0x12, 0x01, 0x20, 0x09, 0x00, 0x90, 0x1f, 0x01, 0xf0, 0x20, 0x82, 0x08, 0x40, 0x44, 0x04, 0x40, 
  0x44, 0x04, 0x40, 0x44, 0x04, 0x0c, 0x44, 0xc0, 0x4c, 0x04, 0xc4, 0x0c, 0x44, 0xc4, 0x40, 0x40, 
  0x04, 0x40, 0x44, 0x04, 0x20, 0x82, 0x08, 0x1f, 0x01, 0xf0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00};
  

  unsigned char lookingeye[]  = 
  
 {
  0x12, 0x01, 0x20, 0x09, 0x00, 0x90, 0x1f, 0x01, 0xf0, 0x20, 0x82, 0x08, 0x40, 0x44, 0x04, 0x40, 
  0x44, 0x04, 0x40, 0x44, 0x04, 0x00, 0x44, 0x00, 0x58, 0x05, 0x84, 0x18, 0x45, 0x84, 0x58, 0x41, 
  0x84, 0x40, 0x44, 0x04, 0x20, 0x82, 0x08, 0x1f, 0x01, 0xf0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00};
  
unsigned char lookingeye2[] =  

 {0x12, 0x01, 0x20, 0x09, 0x00, 0x90, 0x1f, 0x01, 0xf0, 0x20, 0x82, 0x08, 0x40, 0x44, 0x04, 0x40, 
  0x44, 0x04, 0x40, 0x44, 0x04, 0x18, 0x45, 0x80, 0x58, 0x05, 0x84, 0x18, 0x45, 0x84, 0x40, 0x40, 
  0x04, 0x40, 0x44, 0x04, 0x20, 0x82, 0x08, 0x1f, 0x01, 0xf0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00};

  unsigned char car[]  = 
  
 {0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 
  0xfc, 0x00, 0x0e, 0x12, 0x00, 0x1c, 0x11, 0x00, 0x3c, 0x10, 0x80, 0x7f, 0xff, 0xf8, 0x5f, 0xb7, 
  0xfc, 0x5f, 0xff, 0xfe, 0x71, 0xff, 0x8e, 0x6e, 0xff, 0x76, 0x1f, 0x00, 0xf8, 0x0e, 0x00, 0x70};
  
unsigned char car2[] =  

 {0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0xfc, 0x00, 0x0e, 
  0x12, 0x00, 0x1c, 0x11, 0x00, 0x3c, 0x10, 0x80, 0x7f, 0xff, 0xf8, 0x5f, 0xb7, 0xfc, 0x5f, 0xff, 
  0xfa, 0x71, 0xff, 0x8e, 0x60, 0xff, 0x06, 0x0e, 0x00, 0x70, 0x1f, 0x00, 0xf8, 0x0e, 0x00, 0x70};

void setup()   
{     
  Serial.begin(9600);
  loraSerial.begin(9600);            

//when the device is on(no signal and car is coming)
  {matrix.begin(ADA_HT1632_COMMON_16NMOS);
  matrix.clearScreen(); // Make sure the display is cleared
  matrix.drawBitmap(0, 0, sleepingeye, matrix.width(), matrix.height(), 1);
  matrix.writeScreen();
  delay(1000);

   matrix.clearScreen(); // Make sure the display is cleared
  matrix.drawBitmap(0, 0, sleepingeye2, matrix.width(), matrix.height(), 1);
  matrix.writeScreen();
  delay(1000);}
  
  {matrix.begin(ADA_HT1632_COMMON_16NMOS);
  matrix.clearScreen(); // Make sure the display is cleared
  matrix.drawBitmap(0, 0, sleepingeye, matrix.width(), matrix.height(), 1);
  matrix.writeScreen();
  delay(1000);

   matrix.clearScreen(); // Make sure the display is cleared
  matrix.drawBitmap(0, 0, sleepingeye2, matrix.width(), matrix.height(), 1);
  matrix.writeScreen();
  delay(1000);
  
  matrix.clearScreen(); // Make sure the display is cleared
  matrix.drawBitmap(0, 0, lookingeye2, matrix.width(), matrix.height(), 1);
  matrix.writeScreen();}

  

}

int count = 0; //counter for the lookingeye animation
void loop() {

 // 

//if after the device catched the signal

  if(loraSerial.available() > 1){
    String input = loraSerial.readString();
    Serial.println(input);  
    if(input == "on") {

      for (i = 0; i < 4; i++) {
      matrix.begin(ADA_HT1632_COMMON_16NMOS);
      matrix.clearScreen(); // Make sure the display is cleared
      matrix.drawBitmap(0, 0, car, matrix.width(), matrix.height(), 1);
      matrix.writeScreen();
      delay(1000);

      matrix.clearScreen(); // Make sure the display is cleared
      matrix.drawBitmap(0, 0, car2, matrix.width(), matrix.height(), 1);
      matrix.writeScreen();
      delay(1000);

      }
      matrix.clearScreen(); // Make sure the display is cleared
      matrix.drawBitmap(0, 0, lookingeye2, matrix.width(), matrix.height(), 1);
      matrix.writeScreen();
      count = 0;
    }
  }else{
    if(count == 0){
      matrix.clearScreen(); // Make sure the display is cleared
      matrix.drawBitmap(0, 0, lookingeye, matrix.width(), matrix.height(), 1);
      matrix.writeScreen();
    }
    if(count == 50){
      matrix.clearScreen(); // Make sure the display is cleared
      matrix.drawBitmap(0, 0, lookingeye2, matrix.width(), matrix.height(), 1);
      matrix.writeScreen();
    }
    count++;
    if(count == 100){
      count = 0;
    }

  }  
  delay(20);
  
  
}