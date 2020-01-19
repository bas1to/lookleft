import React from 'react'
import { connect } from 'react-redux'; 

import AskLandscape from './shared/AskLandscape';
import WebcamStream from './shared/WebcamStream';

import { initViewportListeners } from '../statemanagement/app/ViewportStateManagement'
import { startListeningToServerData } from '../statemanagement/app/AppStateManagement'
import LiveView from './main/LiveView';
import CounterView from './main/CounterView';
import PathView from './main/PathView';
import ConsoleView from './main/ConsoleView';
import DataView from './main/DataView';

import { MODE } from '../utils/constants';
import UIControls from './main/UIControls';
import Menu from './main/Menu';
import InitializingView from './shared/InitializingView';
import { loadUserSettings } from '../statemanagement/app/UserSettingsStateManagement';
import TrackerAccuracyView from './shared/TrackerAccuracyView';

class MainPage extends React.PureComponent {

  componentDidMount() {
    this.props.dispatch(initViewportListeners());
    // TODO Handle specifying canvas size + resizing here, copy from beatthetraffic
    this.props.dispatch(loadUserSettings());
    // TODO See how we handle the YOLO on / off situation
    this.props.dispatch(startListeningToServerData());
    // Make config available on window global
    window.CONFIG = this.props.config.toJS();
  }

  render () {
    return (
      <div className="main-page">
        {this.props.deviceOrientation === 'portrait' &&
          <AskLandscape />
        }
        {!this.props.isListeningToYOLO &&
          <InitializingView requestedFileRecording={this.props.requestedFileRecording} />
        }
        {this.props.isListeningToYOLO &&
          <>
            <UIControls />
            {this.props.showMenu &&  
              <Menu />
            }
            {this.props.mode === MODE.DATAVIEW &&
              <DataView />
            }
            {this.props.mode === MODE.CONSOLEVIEW &&
              <ConsoleView />
            }
            {this.props.mode === MODE.LIVEVIEW &&
              <LiveView />
            }
            {this.props.uiSettings.get('counterEnabled') && this.props.mode === MODE.COUNTERVIEW &&
              <CounterView />
            }
            {/* Need to keep pathview in the DOM as it continuously renders */}
            {this.props.uiSettings.get('pathfinderEnabled') &&
              <PathView hidden={this.props.mode !== MODE.PATHVIEW} />
            }
            {/* Hide it on pathview mode */}
            {this.props.uiSettings.get('heatmapEnabled') &&
              <TrackerAccuracyView hidden={this.props.mode === MODE.PATHVIEW} />
            }
            <WebcamStream />
          </>
        }
        <style jsx>{`
          .main-page {
            width: 100%;
            height: 100%;
            position: absolute;
            top: 0;
            left: 0;
            z-index: 1;
            overflow: hidden;
          }
        `}</style>
      </div>
      
    )
  }
}

export default connect((state) => {
  return {
    deviceOrientation: state.viewport.get('deviceOrientation'),
    mode: state.app.get('mode'),
    isListeningToYOLO: state.app.get('isListeningToYOLO'),
    requestedFileRecording: state.app.getIn(['recordingStatus', 'requestedFileRecording']),
    showMenu: state.app.get('showMenu'),
    uiSettings: state.app.get('uiSettings'),
    config: state.app.get('config')
  }
})(MainPage)
