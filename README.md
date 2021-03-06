# Look Left

A warning device for pedestrians, that shows a signal when a car is approaching.

## Table of Contents

* [Table of Contents](#table-of-contents)
* [General Info](#general-info)
* [Getting Started](#getting-started)
    * [Prerequisites](#prerequisites)
    * [Flashing the Jetson](#flashing-the-jetson)
    * [Installation](#installation)
    * [Usage](#usage)
* [Acknowledgements](#acknowledgements)
* [Software architecture](#software-architecture)
* [License](#license)

## General Info

Look Left is part of an interdisciplinary project of FU Berlin and Weißensee School of Art and Design Berlin with the topic Smart City. Look Left is designed to help minimize the number of traffic accidents involving pedestrians crossing the street. The warning device is to be hung at dangerous crossing points. A modified OpenDataCam is being used to track cars and when a vehicle is approaching the warning device shows a visual signal, prompting the pedestrians to pay attention and look around before crossing. ([OpenDataCam]( https://github.com/opendatacam/opendatacam) is an open source tool by [Move-Lab](https://www.move-lab.com/).)
The camera consists of a Nvidia Jetson AGX Xavier board running the modified OpenDataCam and a USB camera connected to the board.
The warning device itself consists of an LED panel, controlled by an Arduino.
The devices communicate via LoRa. Since they are not too far away from each other there is no need for an Internet connection.

[See video of the devices](https://vimeo.com/391959944)

![Our Device](https://github.com/bas1to/lookleft/blob/master/Documentation/Picture%20of%20our%20Device.jpeg)

## Getting Started

### Prerequisites
+ Nvidia Jetson AGX Xavier, Nvidia Jetson X2 or Nvidia Jetson Nano
+ A USB Webcam e.g. Logitech C920 HD Pro
+ 2x Arduino Uno boards
+ 2x LoRa modules and antennas (OSOYOO SX1276 LoRa Radio Wireless 868Mhz UART Serial Module)
+ A [HT1632C](https://learn.adafruit.com/16x24-led-matrix/introduction) LED panel by Adafruit
+ Cables

### Flashing the Jetson
[Guide to how to flash your Jetson](https://github.com/opendatacam/opendatacam/blob/master/documentation/jetson/FLASH_JETSON.md) 

[Prepare Jetson AGX Xavier for a flash](https://www.youtube.com/watch?v=-nX8eD7FusQ) (Youtube Video)

### Installation
- **The camera:**
  1. [Install the OpenDataCam on your Jetson board](https://github.com/bas1to/lookleft/blob/master/Documentation/Installation_Guide_OpenDataCam.md).
  2. Connect the USB camera to the Jetson board.
  3. [Connect](https://github.com/bas1to/lookleft/blob/master/Documentation/lora%20chip%20cam.jpeg) the LoRa module and antenna to the Arduino board.

  | Arduino Uno | OSOYOO UART LoRa wireless module |
  | ----------- | -------------------------------- |
  | GND | M0 |
  | GND | M1 |
  | D3 | RXD |
  | D2 | TXD |
  | NC | AUX |
  | 5V | VCC |
  | GND | GND |
  
  5. [Connect](https://github.com/bas1to/lookleft/blob/master/Documentation/connect%20jetson.jpeg) the Arduino board with the Jetson board. (Allways unplug all devices from power before connecting cables.)
  6. Run the [transmitter script](https://github.com/bas1to/lookleft/blob/master/transmitter.ino) on the Arduino. (You need the Arduino IDE for that.)
  7. (Start the Jetson)
  
- **The warning device:**
  1. [Connect](https://github.com/bas1to/lookleft/blob/master/Documentation/led%20panel.jpeg) the LED panel and the second Arduino.  
  2. [Connect](https://github.com/bas1to/lookleft/blob/master/Documentation/lora%20chip%20warning.jpeg) the second LoRa module and antenna to the Arduino.  
  3. Run the [receiver script]( https://github.com/bas1to/lookleft/blob/master/receiver_panel_improved.ino) on the Arduino. (You need the Arduino IDE for that.)

### Usage
- Set up the devices on your selected locations and turn on the Jetson board. The camera will start automatically.
- Switch to the `Count Itmes` tab an set a counting line as needed. Everytime a vehicle crosses this line the warning will be send and the LED panel will warn the pedestrians.
- Note: Our setup is limited for detecting vehicles only at the moment. (You can change that in the `config.json`.)
- You need a monitor for setting up the camera and the counting line. After that the setup works fine without monitor and any peripherals.

## Software architecture

The OpenDataCam is capable of recognizing and tracking diffrent objectives. It is using the real-time object detection system YOLO (you only look once). We use this tracking feature to start a pythonscript child process or to be more detailed: Everytime a from us selected object is counted and before it is written into the mongodb we start our script. The script then sets a pin on the Jetson microcontroller high. That pin is connected to an arduino uno that is connected to a LoRa chip and antenna which then sends a predetermined string (of your choice) via the LoRa network over the radio frenquency 9600 (you can change it) to our warning device and the other arduino uno (also with the LoRa chip and antenna). Our warning device is always listening for the string and when the right string is read, the device leaves the idle state and changes to the warning state. After 8 seconds it changes back to the idle state if it hasn't received another warning.

## Acknowledgements
Bastian Breibert: [https://github.com/bas1to]( https://github.com/bas1to)

Janis Hahn: [https://github.com/TheTolpan](https://github.com/TheTolpan)

Ralitsa Dineva: [https://github.com/ralitsadineva]( https://github.com/ralitsadineva)

Carolina Sprick: [https://github.com/carosprick]( https://github.com/carosprick)

Minseong Kim: [https://github.com/kmsk07]( https://github.com/kmsk07)

Yichao Wang: [https://github.com/yichaowang467]( https://github.com/yichaowang467)

We want to thank the CityLab for constant assisstance and the hardware they lend us and also the professors and all other participants of FU-Berlin and KH-Berlin who made the project possible and all their feedback and advice. 

## License
This project is licensed under the MIT License - see the [LICENSE.txt]( https://github.com/bas1to/lookleft/blob/master/LICENSE.txt) file for details
