import React, { Component } from 'react'
import SVG from 'react-inlinesvg';

class OpenMoji extends Component {

  render() {
    return (
      <SVG 
        className="svg-openmoji w-10" 
        cacheGetRequests={true}
        src={`/static/icons/openmojis/${this.props.icon}`} 
        aria-label={this.props.label}
      />
    )
  }
}

export default OpenMoji


