import React from 'react';

const TWITTER_URL = 'http://twitter.com/tddbin';
const GITHUB_URL = 'http://github.com/tddbin/tddbin-frontend';

export default class NavigationBar extends React.Component {

  constructor() {
    super();
    this.state = {transpileOn: false};
  }

  render() {
    const {
      metaKeySymbol,
      onSave, onResetCode, onTranspileToEs5Changed
    } = this.props;
    const transpileOnOff = (on) => {
      onTranspileToEs5Changed(on);
      this.setState({transpileOn: on});
    };

    return (
      <header className="navigation-bar">
        <span style={{flex: 1}}>
          <button className="logo" />
          <span className="tddbin">TDD bin</span>
          <button className="save" title={`Run tests (${metaKeySymbol}S)`} onClick={onSave}>Run tests</button>
          <button title="Reset code" onClick={onResetCode}>Reset code</button>
          <label className="transpileSwitch">
            Transpile to ES5 <input type="checkbox" onChange={(evt) => transpileOnOff(evt.target.checked)} />
            <div className="transpileHint">
              <h2>What is this for?</h2>
              <p>
                Many modern browsers support a lot of ES6, ES7, ES8 and beyond, here you can control if you want
                your browser to execute the code as is, or if it should be tranpiled first to ES5, which every browser
                is able to execute.<br/>
                <span className={this.state.transpileOn ? 'highlight' : ''}>Why turn it off? To see if the browser does implement this specific feature
                of the JavaScript language.</span><br/>
                <span className={this.state.transpileOn ? '' : 'highlight'}>Why turn it on? Things like <code>import assert from 'assert'</code> would not work
                if they don't get transpiled to ES5 code, since the <code>import</code> statement is only allowed on
                  the top level of a JS file.</span>
              </p>
            </div>
          </label>
        </span>

        <span>
          <a href={TWITTER_URL} className="icon twitter" title="Get in touch." />
          <a href={GITHUB_URL} className="icon github" title="Get (into) the code and contribute." />
        </span>
      </header>
    );
  }

}
