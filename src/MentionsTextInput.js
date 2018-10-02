import React, { Component } from 'react';
import {
  Text,
  View,
  Animated,
  TextInput,
  Platform,
  FlatList,
  ViewPropTypes
} from 'react-native';
import PropTypes from 'prop-types';

const SET_STATE_DELAY = 75;

export default class MentionsTextInput extends Component {
  lastTextLength: number;
  lastTriggerIndex: number;
  triggerMatrix: Array<Object>;
  isResetting: boolean;
  isTrackingStarted: boolean;
  isSelectionChangeHandled: boolean;

  constructor(props) {
    super(props);

    this.state = {
      textInputHeight: '',
      suggestionRowHeight: new Animated.Value(0),
      text: this.props.value ? this.props.value : '',
    };

    this.lastTextLength = 0;
    this.lastTriggerIndex = 0;
    this.triggerMatrix = [];
    this.isTrackingStarted = false;
    this.isSelectionChangeHandled = true;
    this.selection = {};
    this.setSelection = {};
  }

  componentWillMount() {
    this.setState({ textInputHeight: this.props.textInputMinHeight });
  }

  reloadTriggerMatrix(text) {
    if (!text) {
      text = this.state.text;
    }

    this.triggerMatrix = [];
    let start = 0;
    let triggered = false;
    for (let i = 0; i < text.length; i++) {
      if (!triggered && text[i] === '@' && (i == 0 || text[i - 1] === ' ')) {
        start = i;
        triggered = true;
      } else if (triggered && text[i] === ' ') {
        this.triggerMatrix.push([start, i - 1]);
        triggered = false;
      } else if (triggered && i === text.length - 1) {
        this.triggerMatrix.push([start, i]);
      }
    }
  }

  componentWillReceiveProps(nextProps) {
    setTimeout(() => {
      if (this.isTrackingStarted && nextProps.didPressSuggestion && nextProps.value != this.state.text && !this.didDeleteTriggerKeyword) {
        this.reloadTriggerMatrix(nextProps.value);
        this.stopTracking();
        this.setState({ text: nextProps.value }, () => {
          this.setCursorPosition(this.triggerMatrix[this.lastTriggerIndex][1] + 1);
        });
      }
    }, SET_STATE_DELAY);
  }

  setCursorPosition(position: number) {
    if (Platform.OS == 'ios') {
      return;
    }

    setTimeout(() => {
      const index = position + (position == this.state.text.length ? 0 : 1);
      this.setSelection = { start: index, end: index };
      this.forceUpdate();
      this.setSelection = {};
    }, SET_STATE_DELAY);
  }

  resetTextbox() {
    this.isResetting = true;
    this.didPropsChangeText = true;
    this.triggerMatrix = [];
    this.isTrackingStarted = false;
    this.setState({
      textInputHeight: this.props.textInputMinHeight,
      text: '',
    }, () => {
      setTimeout(() => {
        this.isResetting = false;
      }, 20);
    });
  }

  handleReset() {
    this.didTextChange = false;
    this.isTriggerDeleted = false;
    this.didPropsChangeText = false;
    this.lastTextLength = this.state.text.length;
  }

  openSuggestionsPanel() {
    let numOfRows = 0;
    if (this.props.suggestionsData) {
      const isDataLengthBelowMax = this.props.MaxVisibleRowCount >= this.props.suggestionsData.length;
      numOfRows = isDataLengthBelowMax ? this.props.suggestionsData.length : this.props.MaxVisibleRowCount;
    }

    if (numOfRows != 0 && this.props.onOpenSuggestionsPanel) {
      this.props.onOpenSuggestionsPanel();
    }

    if (numOfRows != this.state.suggestionRowHeight) {
      Animated.timing(this.state.suggestionRowHeight, {
        duration: 0,
        toValue: numOfRows * this.props.suggestionRowHeight,
      }).start();
    }
  }

  closeSuggestionsPanel() {
    if (this.props.onCloseSuggestionsPanel) {
      this.props.onCloseSuggestionsPanel();
    }

    Animated.timing(this.state.suggestionRowHeight, {
      toValue: 0,
      duration: 0,
    }).start();
  }

  handleDisplaySuggestions(position) {
    if (!this.triggerMatrix
          || !this.triggerMatrix.length
          || this.shouldDeleteTriggerOnBackspace) {
      return;
    }

    if (!this.isTrackingStarted) {
      this.closeSuggestionsPanel();
      return;
    }

    const keyword = this.getTriggerKeyword(position);
    const delay = this.props.triggerDelay ? this.props.triggerDelay : 0;
    if (keyword && keyword.length > delay) {
      if (this.props.triggerCallback) {
        this.props.triggerCallback(keyword, this.triggerMatrix, this.getSubsequentTriggerIndex(position));
      }

      this.openSuggestionsPanel();
    } else {
      this.closeSuggestionsPanel();
    }
  }

  handleDeleteTriggerOnBackspace(position = 0, index = -2) { // eslint-disable-line no-magic-numbers
    if (!this.triggerMatrix || !this.triggerMatrix.length || this.didPropsChangeText) {
      return;
    }

    if (index === -2) { // eslint-disable-line no-magic-numbers
      index = this.getSubsequentTriggerIndex(position);
    }

    const isAtEnd = position === this.state.text.length - 1;
    const isTriggerSymbolOnly = this.triggerMatrix[index][0] === this.triggerMatrix[index][1];
    const isAtEndOfTrigger = this.triggerMatrix[index][1] === position;
    const isFollowedBySpace = this.state.text[position + 1] === ' ';

    this.shouldDeleteTriggerOnBackspace = !isTriggerSymbolOnly && isAtEndOfTrigger && (isAtEnd || isFollowedBySpace);
  }

  handleClick(position) {
    if (!this.triggerMatrix || !this.triggerMatrix.length) {
      return;
    }

    const index = this.getSubsequentTriggerIndex(position);
    this.handleDeleteTriggerOnBackspace(position, index);

    if (this.isPositionWithinTrigger(position, index)) {
      this.startTracking(position, index);
      return;
    }


    if (position === -1 // eslint-disable-line no-magic-numbers
          || this.state.text && this.state.text[position] === ' '
          || !this.isPositionWithinTrigger(position)) {
      this.stopTracking();
    }
  }

  handleTriggerSplitBySpace(position) {
    if (!this.triggerMatrix
          || !this.triggerMatrix.length
          || !this.isTrackingStarted
          || position < 1
          || position >= this.state.text.length) {
      return;
    }

    const index = this.getSubsequentTriggerIndex(position);
    this.triggerMatrix[index][1] = position - 1;
  }

  isTriggerSplitBySpace(position) {
    if (!this.triggerMatrix || !this.triggerMatrix.length) {
      return false;
    }

    const index = this.getSubsequentTriggerIndex(position);
    return this.isPositionWithinTrigger(position, index)
              && this.isTrackingStarted
              && this.state.text[position] === ' ';
  }

  isSelectionReplaced() {
    return this.triggerMatrix
              && this.triggerMatrix.length
              && this.state.text
              && this.state.text[this.triggerMatrix[this.triggerMatrix.length - 1][0]] != '@';
  }

  getDistanceToNextSpace(index = -1) { // eslint-disable-line no-magic-numbers
    if (index === -1 || !this.state.text || !this.state.text.length || index > this.state.text.length) { // eslint-disable-line no-magic-numbers
      return 0;
    }

    const spaceIndex = this.state.text.indexOf(' ', index);
    return spaceIndex === -1 ? this.state.text.length - 1 - index : spaceIndex - index; // eslint-disable-line no-magic-numbers
  }

  getTriggerKeyword(position, index = -2) { // eslint-disable-line no-magic-numbers
    if (!this.triggerMatrix || !this.triggerMatrix.length || !this.isTrackingStarted) {
      return;
    }

    if (index === -2) { // eslint-disable-line no-magic-numbers
      index = this.getSubsequentTriggerIndex(position);
    }

    if (index === -1 || index >= this.triggerMatrix.length) { // eslint-disable-line no-magic-numbers
      return;
    }

    const start = this.triggerMatrix[index][0];
    const end = this.triggerMatrix[index][1];
    const pattern = new RegExp(`${this.props.trigger}[a-zA-Z0-9_-]*`, `gi`);
    const triggerText = this.state.text.slice(start, end + this.getDistanceToNextSpace(end) + 1);
    const keywordArray = triggerText.match(pattern);

    return keywordArray && keywordArray.length ? keywordArray[0] : '';
  }

  updateTriggerMatrixIndex(position, index = -2) { // eslint-disable-line no-magic-numbers
    if (!this.triggerMatrix || !this.triggerMatrix.length || !this.isTrackingStarted) {
      return;
    }

    if (index === -2) { // eslint-disable-line no-magic-numbers
      index = this.getSubsequentTriggerIndex(position);
    }

    const keyword = this.getTriggerKeyword(position, index);
    if (!keyword || !keyword.length) {
      return;
    }

    this.triggerMatrix[index][1] = this.triggerMatrix[index][0] + keyword.length - 1;
  }

  stopTracking() {
    this.closeSuggestionsPanel();
    this.isTrackingStarted = false;
  }

  getSubsequentTriggerIndex(position, start = 0, end = Number.MAX_SAFE_INTEGER, lastBiggerIndex = -1) {
    if (!this.triggerMatrix || !this.triggerMatrix.length || start > end) {
      return lastBiggerIndex;
    }

    if (lastBiggerIndex == -1) { // eslint-disable-line no-magic-numbers
      lastBiggerIndex = this.triggerMatrix.length - 1;
    }

    if (end === Number.MAX_SAFE_INTEGER) {
      end = this.triggerMatrix.length - 1;
    }


    if (start == end) {
      return this.triggerMatrix[start][0] <= position && position <= this.triggerMatrix[start][1] ? start : lastBiggerIndex;
    }

    const middle = Math.trunc((start + end) / 2);
    if (this.triggerMatrix[middle][0] <= position && position <= this.triggerMatrix[middle][1]) {
      return middle;

    } else if (this.triggerMatrix[middle][1] < position) {
      return this.getSubsequentTriggerIndex(position, middle + 1, end, lastBiggerIndex);

    } else {
      return this.getSubsequentTriggerIndex(position, start, middle - 1, middle);
    }
  }

  isPositionWithinTrigger(position = 0, index = -2) { // eslint-disable-line no-magic-numbers
    if (index === -2) { // eslint-disable-line no-magic-numbers
      index = this.getSubsequentTriggerIndex(position);
    }

    return this.triggerMatrix
              && this.triggerMatrix.length
              && this.triggerMatrix[index][0] <= position
              && position <= this.triggerMatrix[index][1];
  }

  isPositionAfterBiggestTrigger(position = 0, index = 0) {
    return !this.triggerMatrix
              || !this.triggerMatrix.length
              || this.triggerMatrix[index][1] < position
              && index === this.triggerMatrix.length - 1;
  }

  isPositionBeforeNextTrigger(position = 0, index = 0) {
    return !this.triggerMatrix
              || !this.triggerMatrix.length
              || position < this.triggerMatrix[index][0];
  }

  isTriggerMatrixEmpty(index = 0) {
    return index === -1; // eslint-disable-line no-magic-numbers
  }

  startTracking(position, index = -2) { // eslint-disable-line no-magic-numbers
    this.isTrackingStarted = true;

    if (index === -2) { // eslint-disable-line no-magic-numbers
      index = this.getSubsequentTriggerIndex(position);
    }

    if (this.isTriggerMatrixEmpty(index)) {
      this.triggerMatrix = [[position, position]];
      this.lastTriggerIndex = 0;

    } else if (this.isPositionBeforeNextTrigger(position, index)) {
      this.triggerMatrix.splice(index, 0, [position, position]);
      this.lastTriggerIndex = index;

    } else if (this.isPositionAfterBiggestTrigger(position, index)) {
      this.triggerMatrix.push([position, position]);
      this.lastTriggerIndex = this.triggerMatrix.length - 1;

    } else if (this.isPositionWithinTrigger(position, index)) {
      this.lastTriggerIndex = index;
    }
  }

  handleTriggerMatrixShiftRight(position, index) {
    if (this.isPositionAfterBiggestTrigger(position, index)) {
      return;
    }

    for (let i = index; i < this.triggerMatrix.length; i++) {
      if (this.isPositionWithinTrigger(position - 1, i)) {
        continue;
      }

      this.triggerMatrix[i][0] += this.getTextDifference();
      this.triggerMatrix[i][1] += this.getTextDifference();
    }
  }

  updateStateForDeletedTrigger(text, selectionIndex) {
    this.didTextChange = true;
    this.didDeleteTriggerKeyword = true;
    this.shouldDeleteTriggerOnBackspace = false;
    this.handleTriggerMatrixShiftLeft(selectionIndex - 1, this.getSubsequentTriggerIndex(selectionIndex), 1);

    if (this.props.onChangeText) {
      this.props.onChangeText(text);
    }

    this.setState({ text: text }, () => {
      this.setCursorPosition(selectionIndex);
      this.startTracking(selectionIndex);
    });
  }

  deleteTriggerKeyword(index, addSpace) {
    const start = this.triggerMatrix[index][0];
    const end = this.triggerMatrix[index][1];

    if (start >= end) {
      return;
    }

    const preTriggerText = this.state.text.slice(0, start + 1);
    const postTriggerText = this.state.text.slice(end, this.state.text.length);
    const space = postTriggerText.length && addSpace ? ' ' : '';
    const text = preTriggerText + space + postTriggerText;

    this.handleTriggerDeletion(index);

    setTimeout(() => {
      this.updateStateForDeletedTrigger(text, start);
    }, SET_STATE_DELAY);
  }

  handleTriggerDeletion(index) {
    this.isTriggerDeleted = true;
    this.triggerMatrix.splice(index, 1);
  }

  handleTriggerMatrixShiftLeft(position, index, difference = -this.getTextDifference()) {
    if (!this.triggerMatrix
            || this.triggerMatrix.length <= index
            || this.isPositionAfterBiggestTrigger(position, index)) {
      return;
    }

    if (this.shouldDeleteTriggerOnBackspace) {
      this.deleteTriggerKeyword(index);
      return;
    }

    if (position === this.triggerMatrix[index][0] - 1) {
      this.handleTriggerDeletion(index);
      if (this.triggerMatrix.length <= index) {
        return;
      }
    }

    for (let i = index; i < this.triggerMatrix.length; i++) {
      if (this.isPositionWithinTrigger(position, i)) {
        continue;
      }

      this.triggerMatrix[i][0] -= difference;
      this.triggerMatrix[i][1] -= difference;
    }
  }

  getTextDifference() {
    return this.state.text.length - this.lastTextLength;
  }

  handleTriggerMatrixChanges(position, index = -2) { // eslint-disable-line no-magic-numbers
    if (!this.triggerMatrix || !this.triggerMatrix.length || this.getTextDifference() == 0) {
      return;
    }

    if (index === -2) { // eslint-disable-line no-magic-numbers
      index = this.getSubsequentTriggerIndex(position);
    }

    if (index === -1 || index >= this.triggerMatrix.length) { // eslint-disable-line no-magic-numbers
      return;
    }

    if (this.getTextDifference() < 0) {
      this.handleTriggerMatrixShiftLeft(position, index);
    } else {
      this.handleTriggerMatrixShiftRight(position, index);
      this.shouldDeleteTriggerOnBackspace = false;
    }
  }

  handleTyping(position) {
    const lastChar = this.state.text[position];
    const wordBoundary = (this.props.triggerLocation === 'new-word-only') ? position === 0 || this.state.text[position - 1] === ' ' : true;

    this.handleTriggerMatrixChanges(position);
    this.handleDeleteTriggerOnBackspace(position);

    if (this.isTriggerDeleted) {
      this.stopTracking();

    } else if (this.isSelectionReplaced()) {
      this.reloadTriggerMatrix();

    } else if (!this.isTrackingStarted && lastChar === this.props.trigger && wordBoundary) {
      this.startTracking(position);

    } else if (this.isTriggerSplitBySpace(position)) {
      this.handleTriggerSplitBySpace(position);
      this.stopTracking();

    } else if (this.isTrackingStarted && (lastChar === ' ' || this.state.text === '')) {
      this.stopTracking();

    } else if (this.isTrackingStarted) {
      this.updateTriggerMatrixIndex(position - 1);
    }
  }

  handleSelectionChange(selection) {
    this.isSelectionChangeHandled = true;
    this.didDeleteTriggerKeyword = false;

    const position = selection.end - 1;
    if (this.didTextChange && selection.start === selection.end) {
      this.handleTyping(position);

    } else if (selection.start === selection.end) {
      this.handleClick(position);

    } else {
      // cursor selecting chars from selection.start to selection.end
    }

    this.handleDisplaySuggestions(position);
    this.handleReset();
  }

  handleTriggeringForPaste(text) {
    let keyword = null;
    let index = null;
    if (this.triggerMatrix.length && this.selection.start == this.selection.end) {
      this.triggerMatrix.forEach((points, i) => {
        // cursor is inside keyword when it is from after the trigger character to touching the end of the word
        if (this.selection.end > points[0] && this.selection.end <= points[1] + 1) {
          keyword = text.slice(points[0], points[1] + 1);
          index = i;
        }
      });
    }

    this.props.triggerCallback(keyword, this.triggerMatrix, index);
  }

  onSelectionChange(selection) {
    this.selection = {};
    this.setSelection = {};
    if (this.props.onSelectionChange) {
      this.props.onSelectionChange(selection);
    }

    if (this.didTextChange) {
      this.handleSelectionChange(selection);
      return;
    }

    this.isSelectionChangeHandled = false;
    this.selection = selection;

    setTimeout(() => {
      if (!this.isSelectionChangeHandled) {
        this.handleSelectionChange(selection);
      }
    }, 15);
  }

  isTextDifferenceGreaterThanOne(text1, text2) {
    return !text1 && text2.length > 1 || text1.length < text2.length - 1;
  }

  hasNewLineChar(text) {
    return text && text.length > 0 && text.indexOf('\n') !== -1;
  }

  onChangeText(text) {
    if (this.isResetting) {
      return;
    }

    if (this.hasNewLineChar(text)) {
      this.props.onKeyPress({ nativeEvent: { key: "Enter" } });
      return;
    }

    if (this.isTextDifferenceGreaterThanOne(this.state.text, text)) {
      // reset triggerMatrix for pasted text/autocorrect
      this.reloadTriggerMatrix(text);
      if (this.triggerMatrix.length > 0) {
        this.handleTriggeringForPaste(text);
      }
    }

    this.didTextChange = true;
    this.setState({ text }, () => {
      if (!this.isSelectionChangeHandled) {
        this.handleSelectionChange(this.selection);
      }
    });

    if (this.props.onChangeText) {
      this.props.onChangeText(text);
    }
  }

  onContentSizeChange(event) {
    const singleLineThreshold = Platform.OS == 'android' ? 12 : 0;
    const heightDifference = event.nativeEvent.contentSize.height - this.props.textInputMinHeight;
    const newHeight = event.nativeEvent.contentSize.height + 10;
    const height = heightDifference <= singleLineThreshold ? this.props.textInputMinHeight : newHeight;

    this.setState({ textInputHeight: height });

    if (this.props.onContentSizeChange) {
      event.nativeEvent.contentSize.height = height;
      this.props.onContentSizeChange(event);
    }
  }

  render() {
    return (
      <View>
        <Animated.View style={[{ ...this.props.suggestionsPanelStyle }, { height: this.state.suggestionRowHeight }]}
                       accessible={false}>
          <FlatList
            keyboardShouldPersistTaps={"always"}
            horizontal={this.props.horizontal}
            ListEmptyComponent={this.props.loadingComponent}
            ItemSeparatorComponent={() => { return this.props.ItemSeparatorComponent ? this.props.ItemSeparatorComponent() : <View/> }}
            enableEmptySections={true}
            data={this.props.suggestionsData}
            keyExtractor={this.props.keyExtractor}
            renderItem={(rowData) => { return this.props.renderSuggestionsRow(rowData.item, this.stopTracking.bind(this)); }}
          />
        </Animated.View>
        <TextInput
          {...this.props}
          onContentSizeChange={this.onContentSizeChange.bind(this)}
          ref={component => this._textInput = component}
          accessibilityLabel={ 'chat_input_text' }
          onChangeText={this.onChangeText.bind(this)}
          onSelectionChange={(event) => { this.onSelectionChange(event.nativeEvent.selection); }}
          disableFullscreenUI={!!this.props.disableFullscreenUI}
          returnKeyType={this.props.returnKeyType ? this.props.returnKeyType : 'send'}
          maxLength={this.props.maxLength ? this.props.maxLength : Number.MAX_SAFE_INTEGER}
          enablesReturnKeyAutomatically={this.props.enablesReturnKeyAutomatically ? this.props.enablesReturnKeyAutomatically : false}
          underlineColorAndroid={this.props.underlineColorAndroid ? this.props.underlineColorAndroid : 'black'}
          editable={this.props.editable}
          onFocus={ () => {if (this.props.onFocus) {this.props.onFocus();}} }
          onBlur={ () => {if (this.props.onBlur) {this.props.onBlur();}} }
          multiline={true}
          selection={Platform.OS == 'android' ? this.setSelection : undefined}
          value={this.state.text}
          style={[{ ...this.props.textInputStyle }, { height: Math.min(this.props.textInputMaxHeight, this.state.textInputHeight) }]}
          placeholder={this.props.placeholder}
          onKeyPress={(e) => { if (this.props.onKeyPress) {this.props.onKeyPress(e);} }}
        />
      </View>
    );
  }
}

MentionsTextInput.propTypes = {
  textInputStyle: TextInput.propTypes.style,
  suggestionsPanelStyle: ViewPropTypes.style,
  loadingComponent: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.element,
  ]),
  editable: PropTypes.bool,
  textInputMinHeight: PropTypes.number,
  textInputMaxHeight: PropTypes.number,
  trigger: PropTypes.string.isRequired,
  triggerLocation: PropTypes.oneOf(['new-word-only', 'anywhere']).isRequired,
  value: PropTypes.string.isRequired,
  onChangeText: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  triggerCallback: PropTypes.func.isRequired,
  renderSuggestionsRow: PropTypes.oneOfType([
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
  loadingComponent: () => <Text accessible={false}>Loading...</Text>,
  textInputMinHeight: 30,
  textInputMaxHeight: 80,
  horizontal: true,
  editable: true,
}
