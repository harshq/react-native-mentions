import React, { Component } from 'react';
import {
  AppRegistry,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions
} from 'react-native';

import MentionsTextInput from 'react-native-mentions';

import { getUserSuggestions } from './service';

const { height, width } = Dimensions.get('window');
export default class sampleApp extends Component {

  constructor() {
    super();
    this.state = {
      value: "",
      keyword: "",
      data: []
    }
    this.reqTimer = 0;
  }

  renderSuggestionsRow({ item }, hidePanel) {
    return (
      <TouchableOpacity onPress={() => this.onSuggestionTap(item.UserName, hidePanel)}>
        <View style={styles.suggestionsRowContainer}>
          <View style={styles.userIconBox}>
            <Text style={styles.usernameInitials}>{!!item.DisplayName && item.DisplayName.substring(0, 2).toUpperCase()}</Text>
          </View>
          <View style={styles.userDetailsBox}>
            <Text style={styles.displayNameText}>{item.DisplayName}</Text>
            <Text style={styles.usernameText}>@{item.UserName}</Text>
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  onSuggestionTap(username, hidePanel) {
    hidePanel();
    const comment = this.state.value.slice(0, - this.state.keyword.length)
    this.setState({
      data: [],
      value: comment + '@' + username
    })
  }


  callback(keyword) {
    if (this.reqTimer) {
      clearTimeout(this.reqTimer);
    }

    this.reqTimer = setTimeout(() => {
      getUserSuggestions(keyword)
        .then(data => {
          this.setState({
            keyword: keyword,
            data: [...data[0]]
          })
        })
        .catch(err => {
          console.log(err);
        });
    }, 200);
  }

  render() {
    return (
      <View style={styles.container}>
        <Text onPress={() => { this.setState({ value: "" }) }}>Clear textbox</Text>

        <MentionsTextInput
          textInputStyle={{ borderColor: '#ebebeb', borderWidth: 1, padding: 5, fontSize: 15 }}
          suggestionsPanelStyle={{ backgroundColor: 'rgba(100,100,100,0.1)' }}
          loadingComponent={() => <View style={{ flex: 1, width, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator /></View>}
          textInputMinHeight={30}
          textInputMaxHeight={80}
          suggestionsPanelHeight={45}
          trigger={'@'}
          triggerLocation={'new-word-only'} // 'new-word-only', 'anywhere'
          value={this.state.value}
          underlineColorAndroid={'transparent'}
          onChangeText={(val) => { this.setState({ value: val }) }}
          triggerCallback={this.callback.bind(this)}
          renderSuggestionsRow={this.renderSuggestionsRow.bind(this)}
          suggestionsData={this.state.data} // array of objects
          keyExtractor={(item, index) => item.UserName} />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    height: 300,
    justifyContent: 'space-between',
    paddingTop: 100
  },
  suggestionsRowContainer: {
    flexDirection: 'row',
  },
  userAvatarBox: {
    width: 35,
    paddingTop: 2
  },
  userIconBox: {
    height: 45,
    width: 45,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#54c19c'
  },
  usernameInitials: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14
  },
  userDetailsBox: {
    flex: 1,
    justifyContent: 'center',
    paddingLeft: 10,
    paddingRight: 15
  },
  displayNameText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#000'
  },
  usernameText: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.6)'
  }
});


AppRegistry.registerComponent('sample', () => sampleApp);
