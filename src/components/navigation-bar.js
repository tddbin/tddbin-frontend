import React from 'react';

const TWITTER_URL = 'http://twitter.com/tddbin';
const GITHUB_URL = 'http://github.com/tddbin/tddbin-frontend';

export default class NavigationBar extends React.Component {

  render() {
    const {
      metaKeySymbol,
      onSave, onResetCode, onTranspileToEs5Changed
    } = this.props;
    return (
      <header className="navigation-bar">
        <span style={{flex: 1}}>
          <button className="logo" />
          <span className="tddbin">TDD bin</span>
          <button className="save" title={`Run tests (${metaKeySymbol}S)`} onClick={onSave}>Run tests</button>
          <button title="Reset code" onClick={onResetCode}>Reset code</button>
          <label className="transpileSwitch">
            Transpile to ES5 <input type="checkbox" onChange={(evt) => onTranspileToEs5Changed(evt.target.checked)} />
            <div className="transpileHint">
              <h2>Transpile to ES5 - What does that mean?</h2>
              <p>
                skdfhaks jdhalsdjhsjfghsjfhgdjd jghsdfjgsdfg jsdhfg ksjh
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
