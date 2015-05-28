/* global process */
import React from 'react';
import NavigationBar from '../components/navigation-bar.js';
import KeyboardShortcutOverlay from '../components/keyboard-shortcut-overlay.js';
import KatasNavigation from '../components/katas-navigation.js';

export default class Main extends React.Component {
  render() {
    const {
      metaKeySymbol, onSave, onResetCode,
      editorId, runnerId, shortcuts, es6Katas
    } = this.props;
    return (
      <div>
        <NavigationBar
          metaKeySymbol={metaKeySymbol}
          onSave={onSave}
          onResetCode={onResetCode}
        />

        <EditorAndRunner editorId={editorId} runnerId={runnerId} />

        <KatasNavigation katas={es6Katas}/>

        <KeyboardShortcutOverlay
          metaKeySymbol={metaKeySymbol}
          shortcuts={shortcuts}
        />

        <Analytics />
      </div>
    );
  }
}

class EditorAndRunner extends React.Component {
  render() {
    const {editorId, runnerId} = this.props;
    return (
      <div className="flex-columns-full-width editor-and-runner">
        <div id={editorId} className="editor"></div>
        <div id={runnerId} className="flex-rows-full-height runner"></div>
      </div>
    );
  }
}

class Analytics extends React.Component {
  render() {
    const trackingId = process.env.GA_TRACKING_ID;
    const trackingDomain = process.env.GA_TRACKING_DOMAIN;
    if (!trackingId || !trackingDomain) {
      return null;
    }
    const jsCode = `(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
      (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
      m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
      })(window,document,'script','//www.google-analytics.com/analytics.js','ga');
      ga('create', '${trackingId}', '${trackingDomain}');
      ga('send', 'pageview');
    `;
    return <script dangerouslySetInnerHTML={{__html: jsCode}}></script>
  }
}
