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
              <p className={this.state.transpileOn ? 'highlight' : ''}>
                <strong>on</strong> - transpiles ES6 (and beyond) into ES5<br />
                Why turn it off? To see if the browser does implement this specific feature
                of the JavaScript language.
              </p>
              <p className={this.state.transpileOn ? '' : 'highlight'}>
                <strong>off</strong> - leaves code as is and runs tests (does NOT transpile code to ES5)<br />
                Why turn it on? Things like <code>import assert from 'assert'</code> would not work
                if they don't get transpiled to ES5 code, since the <code>import</code> statement is only allowed on
                  the top level of a JS file.
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
