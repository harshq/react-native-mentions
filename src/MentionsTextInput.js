import React, { Component } from 'react';
import {
  View,
  Animated,
  TextInput,
  FlatList,
} from 'react-native';

export default class MentionsTextInput extends Component {
  constructor() {
    super();
    this.state = {
      textInputHeight: "",
      isTrackingStrated: false,
      suggestionsPanelHeight: new Animated.Value(0),

    }
    this.isTrackingStrated = false;
    this.previousChar = " ";
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
      friction: 5,
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
      const boundary = this.props.triggerLocation === 'new-word-only' ? 'B': '';
      const pattern = new RegExp(`\\${boundary}${this.props.trigger}[a-z0-9_-]+|\\${boundary}${this.props.trigger}`, `gi`);
      const keywordArray = val.match(pattern);
      if (keywordArray && !!keywordArray.length) {
        const lastKeyword = keywordArray[keywordArray.length - 1];
        this.updateSuggestions(lastKeyword);
      }
    }
  }

  onChangeText(val) {
    this.props.onChangeText(val); // pass changed text back
    const lastChar = val.substr(val.length - 1);
    const wordBoundry = (this.props.triggerLocation === 'new-word-only') ? this.previousChar.trim().length === 0 : true;
    if (lastChar === this.props.trigger && wordBoundry ) {
      this.startTracking();
    } else if (lastChar === ' ' && this.state.isTrackingStrated || val === "") {
      this.stopTracking();
    }
    this.previousChar = lastChar;
    this.identifyKeyword(val);
  }

  resetTextbox() {
    this.setState({ textInputHeight: this.props.textInputMinHeight });
  }

  render() {
    return (
      <View>
        <Animated.View style={[{ ...this.props.suggestionsPanelStyle }, { height: this.state.suggestionsPanelHeight }]}>
          <FlatList
            keyboardShouldPersistTaps={"always"}
            horizontal={true}
            ListEmptyComponent={this.props.loadingComponent}
            enableEmptySections={true}
            data={this.props.suggestionsData}
            keyExtractor={this.props.keyExtractor}
            renderItem={(rowData) => { return this.props.renderSuggestionsRow(rowData, this.stopTracking.bind(this)) } }
            />
        </Animated.View>
        <TextInput
          {...this.props}
          onContentSizeChange={(event) => {
            this.setState({
              textInputHeight: this.props.textInputMinHeight >= event.nativeEvent.contentSize.height ? this.props.textInputMinHeight : event.nativeEvent.contentSize.height + 10,
            });
          } }
          ref={component => this._textInput = component}
          onChangeText={this.onChangeText.bind(this)}
          multiline={true}
          value={this.props.value}
          style={[{ ...this.props.textInputStyle }, { height: Math.min(this.props.textInputMaxHeight, this.state.textInputHeight) }]}
          placeholder={this.props.placeholder ? this.props.placeholder : 'Write a comment...'}
          />
      </View>
    )
  }
}