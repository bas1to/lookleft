## How to install our modified OpenDataCam

- [1. OpenCV 3.4.3 with Gstreamer:](#1-opencv-343-with-gstreamer-)
- [2. Darknet (Neural network framework running YOLO)](#2-darknet-neural-network-framework-running-yolo-)
- [3. Node.js and mongodb](#3-nodejs-and-mongodb)
- [4. Opendatacam](#4-opendatacam)

### 1. OpenCV 3.4.3 with Gstreamer:

Make sure that your Nvidia Microcontroller is connected to the internet.

Use these commands to install the main ODC parts:

```bash
# Removes old OpenCV files
sudo apt-get purge libopencv*

# Download .deb files

# For Jetson Nano:
wget https://github.com/opendatacam/opencv-builds/raw/master/opencv-nano-3.4.3/OpenCV-3.4.3-aarch64-libs.deb
wget https://github.com/opendatacam/opencv-builds/raw/master/opencv-nano-3.4.3/OpenCV-3.4.3-aarch64-dev.deb
wget https://github.com/opendatacam/opencv-builds/raw/master/opencv-nano-3.4.3/OpenCV-3.4.3-aarch64-python.deb

# For Jetson TX2
wget https://github.com/opendatacam/opencv-builds/raw/master/opencv-tx2-3.4.3/OpenCV-3.4.3-aarch64-libs.deb
wget https://github.com/opendatacam/opencv-builds/raw/master/opencv-tx2-3.4.3/OpenCV-3.4.3-aarch64-dev.deb
wget https://github.com/opendatacam/opencv-builds/raw/master/opencv-tx2-3.4.3/OpenCV-3.4.3-aarch64-python.deb

# For Jetson Xavier
wget https://github.com/opendatacam/opencv-builds/blob/master/opencv-xavier-3.4.3/OpenCV-3.4.3-aarch64-libs.deb
wget https://github.com/opendatacam/opencv-builds/blob/master/opencv-xavier-3.4.3/OpenCV-3.4.3-aarch64-dev.deb
wget https://github.com/opendatacam/opencv-builds/blob/master/opencv-xavier-3.4.3/OpenCV-3.4.3-aarch64-python.deb

# Install .deb files
sudo dpkg -i OpenCV-3.4.3-aarch64-libs.deb
sudo apt-get install -f
sudo dpkg -i OpenCV-3.4.3-aarch64-dev.deb
sudo dpkg -i OpenCV-3.4.3-aarch64-python.deb

# Verify opencv version
pkg-config --modversion opencv
```

### 2. Darknet (Neural network framework running YOLO)


```bash
git clone --depth 1 -b opendatacam https://github.com/opendatacam/darknet
```

#### Modify the Makefile before compiling

Open the `Makefile` in the darknet folder and make these changes:

*For Jetson Nano*

```Makefile
# Set these variable to 1:
GPU=1
CUDNN=1
OPENCV=1

# Uncomment the following line
# For Jetson TX1, Tegra X1, DRIVE CX, DRIVE PX - uncomment:
ARCH= -gencode arch=compute_53,code=[sm_53,compute_53]
```

*For Jetson TX2*

```Makefile
# Set these variable to 1:
GPU=1
CUDNN=1
OPENCV=1

# Uncomment the following line
# For Jetson Tx2 or Drive-PX2 uncomment
ARCH= -gencode arch=compute_62,code=[sm_62,compute_62]
```

*For Jetson Xavier*

```Makefile
# Set these variable to 1:
GPU=1
CUDNN=1
CUDNN_HALF=1
OPENCV=1

# Uncomment the following line
# Jetson XAVIER
ARCH= -gencode arch=compute_72,code=[sm_72,compute_72]
```

#### Compile darknet

```bash

cd darknet 
# Optional
sudo nvpmodel -m 0
sudo jetson_clocks
# not Optional
make
```

To fix the "nvcc not found" error update `Makefile`
```bash

NVCC=/usr/local/cuda/bin/nvcc

```

#### Download weight file


```bash
cd darknet # Optional if you are in the wrong folder

# YOLOv2-VOC
wget https://pjreddie.com/media/files/yolo-voc.weights --no-check-certificate
# YOLOv3-tiny
wget https://pjreddie.com/media/files/yolov3-tiny.weights --no-check-certificate
# YOLOv3
wget https://pjreddie.com/media/files/yolov3.weights --no-check-certificate
```


### 3. Node.js and mongodb

```bash
# Install node.js
sudo apt-get install curl
curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### Mongodb for Jetson devices (ARM64):

```bash
# Mongodb Installation

sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 9DA31620334BD75D9DCB49F368818C72E52529D4
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu xenial/mongodb-org/4.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-4.0.list
sudo apt-get update
sudo apt-get install -y openssl libcurl3 mongodb-org

# Start service
sudo systemctl start mongod

# Enable service on boot
sudo systemctl enable mongod
```


### 4. Opendatacam

- Download source

```bash
git clone --depth 1 https://github.com/bas1to/lookleft/opendatacam.git
cd opendatacam
```

- Specify **ABSOLUTE** `PATH_TO_YOLO_DARKNET` path in `opendatacam/config.json`

```json
{
  "PATH_TO_YOLO_DARKNET" : "/home/nvidia/darknet"
}
```

```bash
# To get the absolute path, go the darknet folder and type
pwd .
```

- Specify `VIDEO_INPUT` and `NEURAL_NETWORK` in `opendatacam/config.json` 

*For Jetson Nano (recommended)*

```json
{
  "VIDEO_INPUT": "usbcam",
  "NEURAL_NETWORK": "yolov3-tiny"
}
```

*For Jetson TX2 (recommended)*

```json
{
  "VIDEO_INPUT": "usbcam",
  "NEURAL_NETWORK": "yolov2-voc"
}
```

*For Jetson Xavier (recommended)*

```json
{
  "VIDEO_INPUT": "usbcam",
  "NEURAL_NETWORK": "yolov3"
}
```


- Install **OpenDataCam**

```bash
cd <path/to/open-data-cam>
npm install
npm run build
```

- Run **OpenDataCam**

```bash
cd <path/to/open-data-cam>
npm run start
```

- Config **OpenDataCam** to run on boot

Do this so the OpenDataCam will **start automatically**.

```bash
# install pm2
npm install pm2 -g |

# go to opendatacam folder
cd <path/to/open-data-cam>
# launch pm2 at startup
# this command gives you instructions to configure pm2 to
# start at ubuntu startup, follow them
sudo pm2 startup

# Once pm2 is configured to start at startup
# Configure pm2 to start the Open Traffic Cam app
sudo pm2 start npm --name "opendatacam" -- start
sudo pm2 save
```
Then go to your `Startup Applications` and press `add` in the `Startup Applications Preferences` window.

Fill in the following information for the fields:

Name: Autostart chromium

Command: chromium-browser http://localhost:8080 --start-fullscreen

**Workaround for the OpenDataCam Bug**

Sadly the OpenDataCam has a Bug right now. The RAM isn't clearing itself and the microcontroller we used (Nvidia Jetson Xavier) 
crashed after 30 minutes. When this bug is fixed ignore the next part.

To automatically restart the Microcontroller every 20 minutes do this:

Type in your console:
```bash
sudo crontab -e

# go with your arrow key to the bottom of the text and type

*/20 * * * * root /sbin/shutdown -r now
```
Restart the Board. Now it should restart every 20 minutes. (10:20 , 10:40 and so on)
