/**
 * @format
 */

import React from 'react';
import { AppRegistry, Text, TextInput } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

const originalTextRender = Text.render;
Text.render = function (...args) {
  const origin = originalTextRender.apply(this, args);
  return React.cloneElement(origin, { allowFontScaling: false });
};

const originalTextInputRender = TextInput.render;
TextInput.render = function (...args) {
  const origin = originalTextInputRender.apply(this, args);
  return React.cloneElement(origin, { allowFontScaling: false });
};

AppRegistry.registerComponent(appName, () => App);
