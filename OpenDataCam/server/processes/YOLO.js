const forever = require('forever-monitor');
const config = require('../../config.json');
const simulation30FPSDetectionsData = require('../../static/placeholder/alexeydetections30FPS.json');
const fs = require('fs');
const path = require('path');
const http = require('http');
const killable = require('killable');
const mjpegServer = require('mjpeg-server');
const {
  performance
} = require('perf_hooks');

let YOLO = {
  isStarting: false,
  isStarted: false,
  isInitialized: false,
  process: null,
  simulationMode: false,
  simulationMJPEGServer: null,
  simulationJSONHTTPStreamServer: null
};

module.exports = {
  init: function(simulationMode) {

    YOLO.simulationMode = simulationMode;

    if(!YOLO.simulationMode) {
      var yoloParams = config.NEURAL_NETWORK_PARAMS[config.NEURAL_NETWORK];
      var videoParams = config.VIDEO_INPUTS_PARAMS[config.VIDEO_INPUT];

      var darknetCommand = [];
      var initialCommand = ['./darknet','detector','demo', yoloParams.data , yoloParams.cfg, yoloParams.weights]
      var endCommand = ['-ext_output','-dont_show','-json_port','8070', '-mjpeg_port', '8090']

      // Special case if input camera is specified as a -c flag as we need to add one arg
      if(videoParams.indexOf('-c') === 0) {
        darknetCommand = initialCommand.concat(videoParams.split(" ")).concat(endCommand);
      } else {
        darknetCommand = initialCommand.concat(videoParams).concat(endCommand);
      }

      YOLO.process = new (forever.Monitor)(darknetCommand,{
        max: Number.POSITIVE_INFINITY,
        cwd: config.PATH_TO_YOLO_DARKNET,
        killTree: true
      });

      YOLO.process.on("start", () => {
        console.log('Process YOLO started');
        YOLO.isStarted = true;
        YOLO.isStarting = false;
      });

      YOLO.process.on("stop", () => {
        console.log('Process YOLO stopped');
        YOLO.isStarted = false;
      });

      YOLO.process.on("restart", () => {
        // Forever 
        console.log("Restart YOLO");
      })

      YOLO.process.on("error", (err) => {
        console.log('Process YOLO error');
        console.log(err);
      });

      YOLO.process.on("exit", (err) => {
        console.log('Process YOLO exit');
        console.log(err);
      });
    }

    console.log('Process YOLO initialized');
    YOLO.isInitialized = true;

    // TODO handle other kind of events
    // https://github.com/foreverjs/forever-monitor#events-available-when-using-an-instance-of-forever-in-nodejs
  },

  getStatus: function() {
    return {
      isStarting: YOLO.isStarting,
      isStarted: YOLO.isStarted
    }
  },

  start: function() {
    // Do not start it twice
    if(YOLO.isStarted || YOLO.isStarting) {
      console.log('already started');
      return;
    }
    
    YOLO.isStarting = true;

    if(YOLO.simulationMode) {
      setTimeout(() => {
        // Simulate 5s to start yolo
        this.startYOLOSimulation();
      }, 5000);
    } else {
      if(!YOLO.isStarted) {
        YOLO.process.start();
      }
    }
  },

  stop: function() {
    // TODO LATER add a isStopping state
    if(YOLO.simulationMode && YOLO.simulationServer) {
      YOLO.simulationServer.kill(function () {
        YOLO.isStarted = false;
      });
    } else {
      if(YOLO.isStarted) {
        YOLO.process.stop();
      }
    }
  },

  restart() {
    if(!YOLO.simulationMode) {
      YOLO.process.restart();
    } else {
      YOLO.simulationJSONHTTPStreamServer.kill();
      YOLO.simulationMJPEGServer.kill();
      setTimeout(() => {
        this.startYOLOSimulation()
      }, 5000)
    }
  },

  startYOLOSimulation: function() {
    /**
     *   Used in Dev mode for faster development
     *     - Simulate a MJPEG stream on port 8090
     *     - Update opendatacam tracker on each frame
     */
    var frameNb = 16;
    var mjpegReqHandler = null;
    var timer = null;
    var dataThisFrame = [];
    var JSONStreamRes = null;
    
    console.log("Start HTTP JSON Stream server");

    YOLO.simulationJSONHTTPStreamServer = http.createServer(function(req, res) {
      console.log("Got request on JSON Stream server started");
      JSONStreamRes = res;
      // Send one frame on the JSON stream to start things
      JSONStreamRes.write(JSON.stringify(simulation30FPSDetectionsData.find((detection) => detection.frame_id === frameNb)));
    }).listen(8070);


    killable(YOLO.simulationJSONHTTPStreamServer);
    console.log("Start MJPEG server");
    

    YOLO.simulationMJPEGServer = http.createServer(function(req, res) {
      console.log("Got request on MJPEG server");

      if(mjpegReqHandler) {
        mjpegReqHandler.close();
        clearInterval(timer);
      }
      mjpegReqHandler = mjpegServer.createReqHandler(req, res);
      timer = setInterval(() => {
        updateJPG();
        if(JSONStreamRes) {
          JSONStreamRes.write(JSON.stringify(simulation30FPSDetectionsData.find((detection) => detection.frame_id === frameNb)));
        } else {
          console.log("JSONStream connexion not opened yet");
        }
      }, 34);

      function updateJPG() {
        fs.readFile(path.join(__dirname, '../../static/placeholder/frames') + "/" + String(frameNb).padStart(3, '0') + '.jpg', sendJPGData);
        frameNb++;
      }

      function sendJPGData(err, data) {
        if(err) {
          console.log(err);
        }
        mjpegReqHandler.write(data, function() {
          checkIfFinished();
        });
      }

      function checkIfFinished() {
        if (frameNb > 451) {
          // clearInterval(timer);
          // mjpegReqHandler.close();
          console.log('Reset stream');
          frameNb = 16;
        }
      }
    }).listen(8090);
    killable(YOLO.simulationMJPEGServer);
  },
}
