import React from 'react';

const TWITTER_URL = 'http://twitter.com/tddbin';
const GITHUB_URL = 'http://github.com/tddbin/tddbin-frontend';

export default class NavigationBar extends React.Component {

  constructor({transpileToEs5}) {
    super();
    this.state = {transpileToEs5};
  }

  render() {
    const {
      metaKeySymbol,
      onSave, onResetCode, onTranspileToEs5Changed
    } = this.props;
    const transpileOnOff = (transpileToEs5) => {
      onTranspileToEs5Changed(transpileToEs5);
      this.setState({transpileToEs5});
    };
    const transpileCheckbox = <input
      type="checkbox"
      checked={this.state.transpileToEs5 ? 'checked' : ''}
      value={this.state.transpileToEs5}
      onChange={(evt) => transpileOnOff(evt.target.checked)}
    />;

    return (
      <header className="navigation-bar">
        <span style={{flex: 1}}>
          <button className="logo" />
          <span className="tddbin">TDD bin</span>
          <button className="save" title={`Run tests (${metaKeySymbol}S)`} onClick={onSave}>Run tests</button>
          <button title="Reset code" onClick={onResetCode}>Reset code</button>
          <label className="transpileSwitch">
            Transpile to ES5 {transpileCheckbox}
            <div className="transpileHint">
              <p className={this.state.transpileToEs5 ? 'highlight' : ''}>
                <strong>on</strong> - transpiles ES6 (and beyond) into ES5<br />
                Why turn it off? To see if the browser does implement this specific feature
                of the JavaScript language.
              </p>
              <p className={this.state.transpileToEs5 ? '' : 'highlight'}>
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
