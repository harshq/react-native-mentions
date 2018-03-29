import React, { Component } from 'react';
import {
  Text,
  View,
  Alert,
  Animated,
  TextInput,
  FlatList,
  ViewPropTypes
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import PropTypes from 'prop-types';
// import ParsedText from 'react-native-parsed-text';

const styles = {
  searchWrapper: {
    overflow: 'hidden',
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderColor: '#f0f0f0',
    borderWidth: 1,
    borderRadius: 4,
    justifyContent: 'space-between'
  },
  searchIcon: {
    padding: 10,
    alignSelf: 'center',
  },
  input: {
    flex: 1,
    paddingTop: 10,
    paddingRight: 10,
    paddingBottom: 10,
    paddingLeft: 0,
    backgroundColor: 'white',
    color: '#424242'
  }
}

export default class MentionsTextInput extends Component {
  constructor() {
    super();
    this.state = {
      textInputHeight: "",
      isTrackingStarted: false,
      suggestionRowHeight: new Animated.Value(0),
      currentTrigger: "",
      currentTriggerIndex: -1
    }
    this.isTrackingStarted = false;
    this.previousChar = " ";
  }

  componentWillMount() {
    this.setState({
      textInputHeight: this.props.textInputMinHeight
    })
  }

  componentDidMount() {
    if (this.props.focus) {
      this._textInput.focus()
    }
  }

  componentWillReceiveProps(nextProps) {
    if (!nextProps.inputValue) {
      this.resetTextbox();
    } else if (this.isTrackingStarted && !nextProps.horizontal && nextProps.suggestionsData[this.state.currentTriggerIndex] && nextProps.suggestionsData[this.state.currentTriggerIndex].length !== 0) {
      const numOfRows = nextProps.MaxVisibleRowCount >= nextProps.suggestionsData[this.state.currentTriggerIndex] ? nextProps.suggestionsData[this.state.currentTriggerIndex].length : nextProps.MaxVisibleRowCount;
      const height = numOfRows * nextProps.suggestionRowHeight;
      this.openSuggestionsPanel(height);
    }
  }

  startTracking(trigger) {
    this.isTrackingStarted = true;
    this.openSuggestionsPanel();
    this.setState({
      isTrackingStarted: true,
      currentTrigger: trigger,
      currentTriggerIndex: this.props.trigger.indexOf(trigger)
    })
  }

  stopTracking() {
    this.isTrackingStarted = false;
    this.closeSuggestionsPanel();
    this.setState({
      isTrackingStarted: false,
      currentTrigger: "",
      currentTriggerIndex: -1
    })
  }

  openSuggestionsPanel(height) {
    Animated.timing(this.state.suggestionRowHeight, {
      toValue: height ? height : this.props.suggestionRowHeight,
      duration: 100,
    }).start();
  }

  closeSuggestionsPanel() {
    Animated.timing(this.state.suggestionRowHeight, {
      toValue: 0,
      duration: 100,
    }).start();
  }

  updateSuggestions(lastKeyword, trigger) {
    const triggerIndex = this.state.currentTriggerIndex
    if (triggerIndex > -1) {
      this.props.triggerCallback[triggerIndex](lastKeyword);
    }

  }

  identifyKeyword(val) {
    if (this.isTrackingStarted) {
      const trigger = this.state.currentTrigger
      const boundary = this.props.triggerLocation === 'new-word-only' ? 'B' : '';
      const pattern = new RegExp(`\\${boundary}${trigger}[a-z0-9_-]+|\\${boundary}${trigger}`, `gi`);
      const keywordArray = val.match(pattern);
      if (keywordArray && !!keywordArray.length) {
        this.state.currentTrigger = trigger
        const lastKeyword = keywordArray[keywordArray.length - 1];
        this.updateSuggestions(lastKeyword, trigger);
      }
    }
  }

  onChangeText(val) {
    this.props.onChangeText(val); // pass changed text back
    const lastChar = val.substr(val.length - 1);
    const wordBoundry = (this.props.triggerLocation === 'new-word-only') ? this.previousChar.trim().length === 0 : true;
    if (this.props.trigger.indexOf(lastChar) > -1 && wordBoundry) {
      this.startTracking(lastChar);
    } else if (lastChar === ' ' && this.state.isTrackingStarted || val === "") {
      this.stopTracking();
    }
    this.previousChar = lastChar;
    this.identifyKeyword(val);
  }

  resetTextbox() {
    this.previousChar = " ";
    this.stopTracking();
    this.setState({ textInputHeight: this.props.textInputMinHeight });
  }

  render() {
    // <ParsedText
    // parse={this.props.mentionParsers}
    // childrenProps={{allowFontScaling: false}}>
    //   {this.props.inputValue}
    // </ParsedText>
    const self = this;
    if (this.props.focus) {
      setTimeout(() => {
        self._textInput.focus()
      }, 500)
    }
    return (
      <View>
        <Animated.View style={[{ ...this.props.suggestionsPanelStyle }, { height: this.state.suggestionRowHeight }]}>
          <FlatList
            keyboardShouldPersistTaps={"always"}
            horizontal={this.props.horizontal}
            ListEmptyComponent={this.props.loadingComponent}
            enableEmptySections={true}
            data={this.props.suggestionsData[this.state.currentTriggerIndex]}
            keyExtractor={this.props.keyExtractor}
            inverted={true}
            renderItem={(rowData) => { return this.props.renderSuggestionsRow[this.state.currentTriggerIndex](rowData, this.stopTracking.bind(this)) }}
          />
        </Animated.View>
        <View style={styles.searchWrapper}>
          {this.props.renderLeftSideIcon && this.props.renderLeftSideIcon()}
          <TextInput
            {...this.props}
            onContentSizeChange={(event) => {
              this.setState({
                textInputHeight: this.props.textInputMinHeight >= event.nativeEvent.contentSize.height ? this.props.textInputMinHeight : event.nativeEvent.contentSize.height + 10,
              });
            }}
            ref={component => this._textInput = component}
            onChangeText={this.onChangeText.bind(this)}
            multiline={true}
            style={[{ ...this.props.textInputStyle }, { height: Math.min(this.props.textInputMaxHeight, this.state.textInputHeight) }]}
            placeholder={this.props.placeholder ? this.props.placeholder : 'Write a comment...'}
          >
            {this.props.inputValue}
          </TextInput>
          {this.props.renderRightSideIcon && this.props.renderRightSideIcon()}
        </View>

      </View>
    )
  }
}

MentionsTextInput.propTypes = {
  textInputStyle: TextInput.propTypes.style,
  suggestionsPanelStyle: ViewPropTypes.style,
  loadingComponent: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.element,
  ]),
  textInputMinHeight: PropTypes.number,
  textInputMaxHeight: PropTypes.number,
  trigger: PropTypes.array.isRequired,
  triggerLocation: PropTypes.oneOf(['new-word-only', 'anywhere']).isRequired,
  inputValue: PropTypes.string.isRequired,
  onChangeText: PropTypes.func.isRequired,
  triggerCallback: PropTypes.array.isRequired,
  renderSuggestionsRow: PropTypes.oneOfType([
    PropTypes.array,
    PropTypes.func,
    PropTypes.element,
  ]).isRequired,
  suggestionsData: PropTypes.array.isRequired,
  keyExtractor: PropTypes.func.isRequired,
  horizontal: PropTypes.bool,
  suggestionRowHeight: PropTypes.number.isRequired,
  MaxVisibleRowCount: function(props, propName, componentName) {
    if(!props.horizontal && !props.MaxVisibleRowCount) {
      return new Error(
        `Prop 'MaxVisibleRowCount' is required if horizontal is set to false.`
      );
    }
  }
};

MentionsTextInput.defaultProps = {
  textInputStyle: { borderColor: '#ebebeb', borderWidth: 1, fontSize: 15 },
  suggestionsPanelStyle: { backgroundColor: 'rgba(100,100,100,0.1)' },
  loadingComponent: () => <Text>Loading...</Text>,
  textInputMinHeight: 30,
  textInputMaxHeight: 80,
  horizontal: true,
}
