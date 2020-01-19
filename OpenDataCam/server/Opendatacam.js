const Tracker = require('node-moving-things-tracker').Tracker;
const YOLO = require('./processes/YOLO');
const isInsideSomeAreas = require('./tracker/utils').isInsideSomeAreas;
const cloneDeep = require('lodash.clonedeep');
const fs = require('fs');
const http = require('http');
const config = require('../config.json');
const Recording = require('./model/Recording');
const DBManager = require('./db/DBManager');
const Logger = require('./utils/Logger');

// YOLO process max retries
const HTTP_REQUEST_LISTEN_TO_YOLO_RETRY_DELAY_MS = 30;
// Max wait time for YOLO to start is 3 min = 180s
const HTTP_REQUEST_LISTEN_TO_YOLO_MAX_RETRIES = 180 * (1000 / HTTP_REQUEST_LISTEN_TO_YOLO_RETRY_DELAY_MS);

const initialState = {
  timeLastFrame: new Date(),
  currentFrame: 0,
  countedItemsHistory: [],
  videoResolution: null,
  countingAreas: {},
  trackerDataForLastFrame: null,
  nbItemsTrackedThisFrame: 0,
  totalItemsTracked: 0,
  _refTrackedItemIdWhenRecordingStarted: 0,
  sseConnexion: null,
  recordingStatus: {
    requestedFileRecording: false,
    isRecording: false,
    currentFPS: 0,
    recordingId: null,
    dateStarted: null,
    filename: ''
  },
  uiSettings: {
    counterEnabled: true,
    pathfinderEnabled: true,
    heatmapEnabled: false
  },
  isListeningToYOLO: false,
  HTTPRequestListeningToYOLO: null,
  HTTPRequestListeningToYOLOMaxRetries: HTTP_REQUEST_LISTEN_TO_YOLO_MAX_RETRIES
}

let Opendatacam = cloneDeep(initialState);

module.exports = {

  reset: function() {
    return new Promise((resolve, reject) => {
      // Reset counter
      Opendatacam = cloneDeep(initialState);
      // Reset tracker
      Tracker.reset();
    })
  },

  /*
    Example countingAreas

    { 
      yellow: { point1: { x: 35.05624790519486, y: 69.33333587646484 }, point2: { x: 111.38124638170021, y: 27.11111068725586 } },
      turquoise: null 
    }
  */
  registerCountingAreas : function(countingAreas) {
    // Reset existing
    Opendatacam.countingAreas = {}
    DBManager.persistAppSettings({
      countingAreas: countingAreas
    })
    Object.keys(countingAreas).map((countingAreaKey) => {
      if(countingAreas[countingAreaKey]) {
        this.registerSingleCountingArea(countingAreaKey, countingAreas[countingAreaKey]);
      }
    })
  },

  registerSingleCountingArea(key, data) {

    // Remap coordinates to image reference size
    // The editor canvas can be smaller / bigger
    let resizedData = {
      point1: {
        x: data.location.point1.x * Opendatacam.videoResolution.w / data.location.refResolution.w,
        y: data.location.point1.y * Opendatacam.videoResolution.h / data.location.refResolution.h,
      },
      point2: {
        x: data.location.point2.x * Opendatacam.videoResolution.w / data.location.refResolution.w,
        y: data.location.point2.y * Opendatacam.videoResolution.h / data.location.refResolution.h,
      }
    }

    // Determine the linear function for this counting area
    // Y = aX + b
    // -> a = dY / dX
    // -> b = Y1 - aX1
    // NOTE: We need to invert the Y coordinates to be in a classic Cartesian coordinate system
    // The coordinates in inputs are from the canvas coordinates system 

    let { point1, point2 } = resizedData;

    let a = (- point2.y + point1.y) / (point2.x - point1.x);
    let b = - point1.y - a * point1.x;
    // Store xBounds to determine if the point is "intersecting" the line on the drawn part
    let xBounds = {
      xMin: Math.min(point1.x, point2.x),
      xMax: Math.max(point1.x, point2.x)
    }

    Opendatacam.countingAreas[key] = data;

    Opendatacam.countingAreas[key]['computed'] = {
      a: a,
      b: b,
      xBounds: xBounds
    }
  },

  countItem: function(trackedItem, countingAreaKey, frameId) {
    if(Opendatacam.recordingStatus.isRecording) {
      var countedItem = {
        frameId: frameId,
        timestamp: new Date(),
        area: countingAreaKey,
        name: trackedItem.name,
        id: trackedItem.id
      }
      // Add it to the history
      Opendatacam.countedItemsHistory.push(countedItem)
    }
    // Mark tracked item as counted this frame for display
    trackedItem.counted.push({
      areaKey: countingAreaKey,
      timeMs: new Date().getTime()
    });
    return countedItem;
  },

  /* Persist in DB */ 
  persistNewRecordingFrame: function(
    frameId,
    frameTimestamp,
    counterSummary,
    trackerSummary,
    countedItemsForThisFrame,
    trackerDataForThisFrame
  ) {
    
    const trackerEntry = {
      recordingId: Opendatacam.recordingStatus.recordingId,
      frameId: frameId,
      timestamp: frameTimestamp,
      objects: trackerDataForThisFrame.map((trackerData) => {
        return {
          id: trackerData.id,
          x: Math.round(trackerData.x),
          y: Math.round(trackerData.y),
          w: Math.round(trackerData.w),
          h: Math.round(trackerData.h),
          bearing: Math.round(trackerData.bearing),
          confidence: Math.round(trackerData.confidence * 100),
          name: trackerData.name
        }
      })
    }

    DBManager.updateRecordingWithNewframe(
      Opendatacam.recordingStatus.recordingId,
      frameTimestamp,
      counterSummary,
      trackerSummary,
      countedItemsForThisFrame,
      trackerEntry
    ).then(() => {
      // console.log('success updateRecordingWithNewframe');
    }, (error) => {
      console.log(error);
      console.log('error updateRecordingWithNewframe');
    })
  },

  updateWithNewFrame: function(detectionsOfThisFrame, frameId) {
    // Set yolo status to started if it's not the case
    if(!Opendatacam.isListeningToYOLO) {
      Opendatacam.isListeningToYOLO = true;
      Opendatacam.HTTPRequestListeningToYOLOMaxRetries = initialState.HTTPRequestListeningToYOLOMaxRetries;
      // Start recording depending on the previous flag
      if(this.isFileRecordingRequested()) {
        this.startRecording(true);
        Opendatacam.recordingStatus.requestedFileRecording = false;
      }
    }

    // If we didn't get the videoResolution yet
    if(!Opendatacam.videoResolution) {
      console.log('Didn\'t get video resolution yet, not sending tracker info');
      return;
    }

    // Compute FPS
    const frameTimestamp = new Date();
    const timeDiff = Math.abs(frameTimestamp.getTime() - Opendatacam.timeLastFrame.getTime());
    Opendatacam.timeLastFrame = frameTimestamp;
    // console.log(`YOLO detections FPS: ${1000 / timeDiff}`);
    Opendatacam.recordingStatus.currentFPS = Math.round(1000 / timeDiff)

    // Scale detection
    let detectionScaledOfThisFrame = detectionsOfThisFrame.map((detection) => {
      return {
        name: detection.name,
        x: detection.relative_coordinates.center_x * Opendatacam.videoResolution.w,
        y: detection.relative_coordinates.center_y * Opendatacam.videoResolution.h,
        w: detection.relative_coordinates.width * Opendatacam.videoResolution.w,
        h: detection.relative_coordinates.height * Opendatacam.videoResolution.h,
        counted: false,
        confidence: detection.confidence
      };
    });

    // If VALID_CLASSES if set, we should keep only those and filter out the rest
    if(config.VALID_CLASSES && config.VALID_CLASSES.indexOf("*") === -1) {
      detectionScaledOfThisFrame = detectionScaledOfThisFrame.filter((detection) => config.VALID_CLASSES.indexOf(detection.name) > -1)
      console.log(`Filtered out ${detectionsOfThisFrame.length - detectionScaledOfThisFrame.length} detections that weren't valid classes`)
    }

    // console.log(`Received Detection:`);
    // console.log('=========');
    // console.log(JSON.stringify(detectionScaledOfThisFrame));
    // console.log('=========');
    // console.log('Update tracker with this frame')
    // console.log(`Frame id: ${Opendatacam.currentFrame}`);
    // console.log('=========')
     
    Tracker.updateTrackedItemsWithNewFrame(detectionScaledOfThisFrame, Opendatacam.currentFrame);

    let trackerDataForThisFrame = Tracker.getJSONOfTrackedItems();
    let countedItemsForThisFrame = [];

    Opendatacam.nbItemsTrackedThisFrame = trackerDataForThisFrame.length;

    // Compute nbItemsTrackedSinceRecordingStarted based on ids (assume that id increment is one)
    const biggestTrackedItemIdThisFrame = trackerDataForThisFrame[trackerDataForThisFrame.length - 1].id;
    const nbItemsTrackedSinceRecordingStarted = biggestTrackedItemIdThisFrame - Opendatacam._refTrackedItemIdWhenRecordingStarted;
    Opendatacam.totalItemsTracked = nbItemsTrackedSinceRecordingStarted;
  
    // Compute deltaYs for all tracked items (between the counting lines and the tracked items position)
    // And check if trackedItem are going through some counting areas 
    // For each new tracked item
    trackerDataForThisFrame = trackerDataForThisFrame.map((trackedItem) => {

      // For each counting areas
      var countingDeltas = Object.keys(Opendatacam.countingAreas).map((countingAreaKey) => {
        let countingAreaProps = Opendatacam.countingAreas[countingAreaKey].computed;
        // deltaY = Y(detection) - Y(on-counting-line)
        // NB: negating Y detection to get it in "normal" coordinates space
        // deltaY = - Y(detection) - a X(detection) - b
        let deltaY = - trackedItem.y - countingAreaProps.a * trackedItem.x - countingAreaProps.b;

        // If trackerDataForLastFrame exists, we can if we items are passing through the counting line
        if(Opendatacam.trackerDataForLastFrame) {
          // Find trackerItem data of last frame
          let trackerItemLastFrame = Opendatacam.trackerDataForLastFrame.data.find((itemLastFrame) => itemLastFrame.id === trackedItem.id)
          // If trackedItemLastFrame exist and deltaY was computed last frame
          if(trackerItemLastFrame && trackerItemLastFrame.countingDeltas[countingAreaKey]) {
            let lastDeltaY = trackerItemLastFrame.countingDeltas[countingAreaKey]
            // Remind counted status
            if(trackerItemLastFrame.counted) {
              // console.log(`${trackerItemLastFrame.id} appear to have been counted on last frame`);
              trackedItem.counted = trackerItemLastFrame.counted;
            } else {
              trackedItem.counted = [];
            }

            if(Math.sign(lastDeltaY) !== Math.sign(deltaY)) {

              // Object trajectory must intersept the counting line between xBounds
              // We know it intersept between those two frames, check if they are
              // corresponding to the bounds
              let minX = Math.min(trackerItemLastFrame.x, trackedItem.x);
              let maxX = Math.max(trackerItemLastFrame.x, trackedItem.x);

              if(countingAreaProps.xBounds.xMin <= maxX && 
                countingAreaProps.xBounds.xMax >= minX) {

                // console.log("*****************************")
                // console.log("COUNTING SOMETHING")
                // console.log("*****************************")
                // // console.log(trackedItem);

                // Do not count twice the same tracked item
                if(trackedItem.counted.find((countedEvent) => countedEvent.areaKey === countingAreaKey)) {
                  // already counted on this areaKey, do not count twice 
                  Logger.log('Already counted, do not count it twice')
                } else {
                  // Tracked item has cross the {countingAreaKey} counting line
                  // Count it
                  // console.log(`Counting ${trackedItem.id}`);
                  let countedItem = this.countItem(trackedItem, countingAreaKey, frameId);
                  countedItemsForThisFrame.push(countedItem);

                  // SEND PING
                  // Start Python-Script
                  var util = require("util");

                  var spawn = require("child_process").spawn;
                  var process = spawn('python3',["Energy.py"]);

                  util.log('readingin')

                  process.stdout.on('data',function(chunk){

                    var textChunk = chunk.toString('utf8');// buffer to string

                    util.log(textChunk);
                  });
                  // END OF PING SENDING
                  
                }
  
                

              } else {
                // console.log('NOT IN xBOUNDS');
                // console.log(countingAreaProps.xBounds);
                // console.log(trackedItem)
              }

              
            }
          }
        }

        return {
          countingAreaKey: countingAreaKey,
          deltaY: deltaY
        }

      });

      // Convert counting delta to a map
      var countingDeltaMap = {}
      
      countingDeltas.map((countingDelta) => {
        countingDeltaMap[countingDelta.countingAreaKey] = countingDelta.deltaY
      })

      return {
        ...trackedItem,
        countingDeltas: countingDeltaMap
      }
    })

    // console.log('Tracker data');
    // console.log('=========')
    // console.log(JSON.stringify(trackerDataForThisFrame));
    // console.log('=========')

    // Increment frame number
    Opendatacam.currentFrame++;

    // Remember trackerData for last frame
    Opendatacam.trackerDataForLastFrame = {
      frameIndex: Opendatacam.currentFrame - 1,
      data: trackerDataForThisFrame
    }

    let counterSummary = this.getCounterSummary();
    let trackerSummary = this.getTrackerSummary();

    // console.log(Opendatacam.zombiesAreas);

    // Persist to db
    if(Opendatacam.recordingStatus.isRecording && frameId >= 50) {
      // Only record from frame 50, the start of a stream is very buggy
      // and send bad JSON objects
      this.persistNewRecordingFrame(
        frameId,
        frameTimestamp,
        counterSummary,
        trackerSummary,
        countedItemsForThisFrame,
        trackerDataForThisFrame
      );
    }

    this.sendUpdateToClient();

  },

  sendUpdateToClient: function() {
    // Stream it to client if SSE request is open
    if(Opendatacam.sseConnexion) {
      // console.log('sending message');
      // console.log(`send frame ${Opendatacam.trackerDataForLastFrame.frameIndex}`);
      Opendatacam.sseConnexion(`data:${JSON.stringify({
        trackerDataForLastFrame: Opendatacam.trackerDataForLastFrame,
        counterSummary: this.getCounterSummary(),
        trackerSummary: this.getTrackerSummary(),
        videoResolution: Opendatacam.videoResolution, 
        appState: {
          yoloStatus: YOLO.getStatus(),
          isListeningToYOLO: Opendatacam.isListeningToYOLO,
          recordingStatus: Opendatacam.recordingStatus
        }
      })}\n\n`);
    }
  },

  getCounterSummary: function() {

    // Generate dashboard from countingHistory
    // example
    // {
    //   "turquoise": {
    //     {
    //       car: 0,
    //       truck: 0,
    //       person: 0,
    //       bicycle: 0,
    //       motorbike: 0,
    //       bus: 0,
    //       _total: 0
    //     }
    //   }
    //   "blablal": {
    //   }
    // }

    var counterSummary = {};

    Opendatacam.countedItemsHistory.forEach((countedItem) => {
      if(!counterSummary[countedItem.area]) {
        counterSummary[countedItem.area] = {}
        counterSummary[countedItem.area]['_total'] = 0;
      }

      if(!counterSummary[countedItem.area][countedItem.name]) {
        counterSummary[countedItem.area][countedItem.name] = 1;
      } else {
        counterSummary[countedItem.area][countedItem.name]++;
      }
      counterSummary[countedItem.area]['_total']++;
    })

    return counterSummary;
  },

  getTrackerSummary: function() {
    return {
      totalItemsTracked: Opendatacam.totalItemsTracked
    }
  },

  getCounterHistory: function() {
    return Opendatacam.countedItemsHistory;
  },

  getCountingAreas: function() {
    return Opendatacam.countingAreas;
  },

  getTrackedItemsThisFrame: function() {
    return Opendatacam.trackerDataForLastFrame;
  },

  startStreamingData(sse) {
    Opendatacam.sseConnexion = sse;
  },

  startRecording(isFile) {
    console.log('Start recording');
    Opendatacam.recordingStatus.isRecording = true;
    Opendatacam.recordingStatus.dateStarted = new Date();
    Opendatacam.totalItemsTracked = 0;
    const filename = isFile ? config.VIDEO_INPUTS_PARAMS.file.split('/').pop() : '';
    Opendatacam.recordingStatus.filename = filename;

    // Store lowest ID of currently tracked item when start recording 
    // to be able to compute nbObjectTracked
    const currentlyTrackedItems = Tracker.getJSONOfTrackedItems() 
    const highestTrackedItemId = currentlyTrackedItems[currentlyTrackedItems.length - 1].id;
    Opendatacam._refTrackedItemIdWhenRecordingStarted = highestTrackedItemId - currentlyTrackedItems.length;

    

    // Persist recording
    DBManager.insertRecording(new Recording(
      Opendatacam.recordingStatus.dateStarted, 
      Opendatacam.recordingStatus.dateStarted,
      Opendatacam.countingAreas,
      Opendatacam.videoResolution,
      filename
    )).then((recording) => {
      Opendatacam.recordingStatus.recordingId = recording.insertedId;
    }, (error) => {
      console.log(error);
    })
  },

  stopRecording() {
    console.log('Stop recording');
    // Reset counters
    Opendatacam.recordingStatus.isRecording = false;

    Opendatacam.countedItemsHistory = [];
    
    
  },

  setVideoResolution(videoResolution) {
    var self = this;
    console.log('setvideoresolution')
    Opendatacam.videoResolution = videoResolution;
    // Restore counting areas if defined
    DBManager.getAppSettings().then((appSettings) => {
      if(appSettings && appSettings.countingAreas) {
        console.log('Restore counting areas');
        self.registerCountingAreas(appSettings.countingAreas)
      }
    });
  },

  // Listen to 8070 for Tracker data detections
  listenToYOLO(urlData) {
    var self = this;
    // HTTPJSONSTREAM req
    if(Opendatacam.isListeningToYOLO) {
      // Already listening
      console.log('Already listening')
      return;
    }

    var options = {
      hostname: urlData.address,
      port:     8070,
      path:     '/',
      method:   'GET'
    };

    Logger.log('Send request to connect to YOLO JSON Stream')
    self.HTTPRequestListeningToYOLO = http.request(options, function(res) {
      Logger.log(`statusCode: ${res.statusCode}`)
      var message = ""; // variable that collects chunks
      var separator = "}"; // consider chunk complete if I see this char

      res.on('data', function(chunk) {
        var msgChunk = chunk.toString();
        Logger.log('----')
        Logger.log('----')
        Logger.log('----')
        Logger.log('----')
        Logger.log('JSON Message received')
        Logger.log('----')
        Logger.log('----')
        Logger.log('----')
        Logger.log(msgChunk);
        Logger.log('----')
        Logger.log('----')
        Logger.log('----')
        Logger.log('----')
        Logger.log('----')
        Logger.log('----')
        Logger.log('----')

        let lastChar = '';
        let isMessageComplete = false;

        // This ignores the "," message of the stream separating the frame data
        if(msgChunk.trim().length === 1) {
          Logger.log('----')
          Logger.log('----')
          Logger.log('----')
          Logger.log('------- IGNORE CHUNK , most likely a coma')
          Logger.log('----')
          Logger.log('----')
        } else {
          message += msgChunk;
          lastChar = message[message.length -1];
          isMessageComplete = lastChar === separator;
        }

        if(isMessageComplete) {
          try {
            Logger.log('Message complete, parse it')
            if(message.charAt(0) === ',') {
              Logger.log('First char is a comma, remove it')
              message = message.substr(1);
            }
            var detectionsOfThisFrame = JSON.parse(message);
            message = '';
            self.updateWithNewFrame(detectionsOfThisFrame.objects, detectionsOfThisFrame.frame_id);
          } catch (error) {
            console.log("Error with message send by YOLO, not valid JSON")
            message = '';
            Logger.log(message);
            Logger.log(error);
            // res.emit('close');
          }
        }
      });

      res.on('close', () => {
        if(Opendatacam.isListeningToYOLO)  {
          console.log("==== HTTP Stream closed by darknet, reset UI ====")
          console.log("==== If you are running on a file, it is restarting  because you reached the end ====")
          console.log("==== If you are running on a camera, it might have crashed for some reason and we are trying to restart ====")
          // YOLO process will auto-restart, so re-listen to it
          // reset retries counter
          Opendatacam.isListeningToYOLO = false;
          Opendatacam.HTTPRequestListeningToYOLOMaxRetries = HTTP_REQUEST_LISTEN_TO_YOLO_MAX_RETRIES;
          if(config.VIDEO_INPUT === "file") {
            self.stopRecording();
          }
          self.sendUpdateToClient();
          self.listenToYOLO(urlData);
        } else {
          // Counting stopped by user, keep yolo running
        }
      });
    });

    self.HTTPRequestListeningToYOLO.on('error', function(e) {
      // TODO Need a YOLO.isRunning()
      if(
        !Opendatacam.isListeningToYOLO &&
        Opendatacam.HTTPRequestListeningToYOLOMaxRetries > 0
      ) {
        Logger.log(`Will retry in ${HTTP_REQUEST_LISTEN_TO_YOLO_RETRY_DELAY_MS} ms`)
        // Retry, YOLO might not have started server just yet
        setTimeout(() => {
          Logger.log("Retry connect to YOLO");
          self.listenToYOLO(urlData);
          Opendatacam.HTTPRequestListeningToYOLOMaxRetries--;
        }, HTTP_REQUEST_LISTEN_TO_YOLO_RETRY_DELAY_MS)
      } else {
        YOLO.stop();
        console.log('Something went wrong: ' + e.message);
        console.log('Too much retries, YOLO took more than 3 min to start, likely an error')
        console.log(Opendatacam.HTTPRequestListeningToYOLOMaxRetries)
      }
    });

    // Actually send request
    self.HTTPRequestListeningToYOLO.end();
  },

  setUISettings(settings) {
    console.log('Save UI settings')
    console.log(JSON.stringify(settings))
    Opendatacam.uiSettings = settings;
  },

  getUISettings() {
    return Opendatacam.uiSettings;
  },

  isRecording() {
    return Opendatacam.recordingStatus.isRecording;
  },

  isFileRecordingRequested() {
    return Opendatacam.recordingStatus.requestedFileRecording;
  },

  requestFileRecording() {
    Opendatacam.recordingStatus.requestedFileRecording = true;
    console.log('Ask YOLO to restart to record on a file ');
    YOLO.restart();
  },

  getCurrentRecordingId() {
    return Opendatacam.recordingStatus.recordingId;
  },

  getStatus() {
    return {
      counterSummary: this.getCounterSummary(),
      trackerSummary: this.getTrackerSummary(),
      videoResolution: Opendatacam.videoResolution, 
      appState: {
        yoloStatus: YOLO.getStatus(),
        isListeningToYOLO: Opendatacam.isListeningToYOLO,
        recordingStatus: Opendatacam.recordingStatus
      }
    }
  },

  clean() {
    if(this.HTTPRequestListeningToYOLO) {
      this.HTTPRequestListeningToYOLO.destroy();
    }
  }
}
