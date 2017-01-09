import React, { Component } from 'react';
import {
  AppRegistry,
  StyleSheet,
  Text,
  View,
  Animated,
  TextInput,
  ListView
} from 'react-native';

export class MentionsTextInput extends Component {
  constructor() {
    super();
    this.state = {
      textInputHeight: "",
      isTrackingStrated: false,
      isSuggestionsVisible: false,
      suggestionsPanelHeight: new Animated.Value(0),

    }
    this.isTrackingStrated = false;
  }

  componentWillMount() {
    this.setState({
      textInputHeight: this.props.textInputMinHeight
    })
  }

  componentWillReceiveProps(nextProps) {
    if (!nextProps.value) {
      this.resetTextbox();
    }
  }

  startTracking() {
    this.isTrackingStrated = true;
    this.openSuggestionsPanel();
    this.setState({
      isTrackingStrated: true
    })
  }

  stopTracking() {
    this.isTrackingStrated = false;
    this.closeSuggestionsPanel();
    this.setState({
      isTrackingStrated: false
    })
  }

  openSuggestionsPanel() {
    Animated.spring(this.state.suggestionsPanelHeight, {
      duration: 100,
      toValue: this.props.suggestionsPanelHeight,
      friction: 4,
    }).start();
  }

  closeSuggestionsPanel() {
    Animated.timing(this.state.suggestionsPanelHeight, {
      toValue: 0,
      duration: 100,
    }).start();
  }

  updateSuggestions(lastKeyword) {
    this.props.triggerCallback(lastKeyword);
  }

  identifyKeyword(val) {
    if (this.isTrackingStrated) {
      const pattern = new RegExp(`\\B${this.props.trigger}[a-z0-9_-]+|${this.props.trigger}`, `gi`);
      const keywordArray = val.match(pattern);
      if (keywordArray && !!keywordArray.length) {
        const lastKeyword = keywordArray[keywordArray.length - 1];
        if (lastKeyword.length) { // start showing suggestions if user has typed a letter after trigger
          this.setState({
            isSuggestionsVisible: true
          })
        }
        this.updateSuggestions(lastKeyword);
      }
    }
  }

  onChangeText(val) {
    this.props.onChangeText(val); // pass changed text back
    const lastChar = val.substr(val.length - 1);
    if (lastChar === this.props.trigger) {
      this.startTracking();
    } else if (lastChar === ' ' && this.state.isTrackingStrated || val === "") {
      this.stopTracking();
    }
    this.identifyKeyword(val);
  }

  resetTextbox() {
    this.setState({ textInputHeight: this.props.textInputMinHeight });
  }

  render() {
    return (
      <View>

        <Animated.View style={[{ ...this.props.suggestionsPanelStyle }, { height: this.state.suggestionsPanelHeight }]}>
          <ListView
            keyboardShouldPersistTaps={"always"}
            horizontal={true}
            enableEmptySections={true}
            dataSource={this.props.suggestionsDataSource}
            renderRow={(rowData) => { return this.props.renderSuggestionsRow(rowData, this.stopTracking.bind(this)) } }
            />
        </Animated.View>

        <TextInput
          {...this.props}
          onChange={(event) => {
            this.setState({
              textInputHeight: this.props.textInputMinHeight >= event.nativeEvent.contentSize.height ? this.props.textInputMinHeight : event.nativeEvent.contentSize.height,
            });
          } }
          ref={component => this._textInput = component}
          onChangeText={this.onChangeText.bind(this)}
          multiline={true}
          value={this.props.value}
          style={[{ ...this.props.textInputStyle }, { height: Math.min(this.props.textInputMaxHeight, this.state.textInputHeight) }]}
          placeholder={'Write a comment...'}
          />
      </View>
    )
  }
}