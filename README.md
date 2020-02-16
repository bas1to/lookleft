# Look Left

A warning device for pedestrians, that shows a signal when a car is approaching.

## Table of Contents

* [Table of Contents](#table-of-contents)
* [General Info](#general-info)
* [Getting Started](#getting-started)
    * [Prerequisites](#prerequisites)
    * [Installation](#installation)
    * [Usage](#usage)
* [Acknowledgements](#acknowledgements)
* [License](#license)

## General Info

Look Left is part of an interdisciplinary project of FU Berlin and Weissensee School of Art and Design Berlin with the topic Smart City. Look Left is designed to help minimize the number of traffic accidents involving pedestrians crossing the street. The warning device is to be hung at dangerous crossing points. A modified OpenDataCam is being used to track cars and when a vehicle is approaching the warning device shows a visual signal, prompting the pedestrians to pay attention and look around before crossing. ([OpenDataCam]( https://github.com/opendatacam/opendatacam) is an open source tool by Moovel Lab.)
The camera consists of a Nvidia Jetson Xavier board running the modified OpenDataCam and a USB camera connected to the board.
The warning device itself consists of LED panel, controlled by an Arduino.
The devices communicate via LoRa. Since they are not too far away from each other there is no need for Internet connection.

(Photos of the device and the visual signals)

## Getting Started

### Prerequisites
+ Nvidia Jetson Xavier or a similar board
+ A Webcam
+ 2x Arduino Uno boards
+ 2x LoRa modules and antennas (OSOYOO SX1276 LoRa Radio Wireless 868Mhz UART Serial Module)
+ A LED panel
+ Cables

### Installation
- The Camera:
  1. First install the OpenDataCam on your Jetson board. Follow the instructions [here]( https://github.com/bas1to/lookleft/blob/master/opendatacam/documentation/USE_WITHOUT_DOCKER.md). In step 4. use the following command instead of the first one:
  
  ```
  git clone --depth 1 https://github.com/bas1to/lookleft/opendatacam.git
  ```

  2. Connect the USB camera to the Jetson board.
  3. Connect the LoRa module and antenna to the Arduino board.

  | Arduino Uno | OSOYOO UART LoRa wireless module |
  | ----------- | -------------------------------- |
  | GND | M0 |
  | GND | M1 |
  | D3 | RXD |
  | D2 | TXD |
  | NC | AUX |
  | 5V | VCC |
  | GND | GND |

  4. Connect the Arduino board with the Jetson board.
- The warning device
  1. Connect the LED panel and the second Arduino.
  2. Connect the second LoRa module and antenna to the Arduino (like step 3. in the previous section).  Run the transmitter script on the first Arduino (the camera) and the [receiver script]( https://github.com/bas1to/lookleft/blob/master/receiver_panel.ino) on the second Arduino (the warning device). (You need the Arduino IDE for that.)


### Usage
Hang up the devices and turn on the Jetson board. The camera will start automatically. 
(Screenshots to come)

## Acknowledgements
Bastian Breibert: [https://github.com/bas1to]( https://github.com/bas1to)

Janis Hahn: [https://github.com/TheTolpan](https://github.com/TheTolpan)

Ralitsa Dineva: [https://github.com/ralitsadineva]( https://github.com/ralitsadineva)

Carolina Sprick: [https://github.com/carosprick]( https://github.com/carosprick)

Minseong Kim: [https://github.com/kmsk07]( https://github.com/kmsk07)

Yichao Wang: [https://github.com/yichaowang467]( https://github.com/yichaowang467)

## License
This project is licensed under the MIT License - see the [LICENSE.txt]( https://github.com/bas1to/lookleft/blob/master/LICENSE.txt) file for details
