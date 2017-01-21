import React, { Component } from 'react';
import {
  AppRegistry,
  StyleSheet,
  Text,
  View,
  ListView,
  TouchableHighlight
} from 'react-native';
import {MentionsTextInput} from 'react-native-mentions';
import { getUserSuggestions } from './service';

export default class sampleApp extends Component {
 
  constructor() {
    super();
    const ds = new ListView.DataSource({ rowHasChanged: (r1, r2) => r1 !== r2 });
    this.state = {
      value: "",
      keyword: "",
      ds: ds
    }
    this.reqTimer = 0;
  }

  renderSuggestionsRow(rowData, hidePanel) {
    return (
      <TouchableHighlight onPress={() => this.onSuggestionTap(rowData.UserName, hidePanel)}>
        <View style={styles.suggestionsRowContainer}>
          <View style={styles.userAvatarBox}>
            <View style={styles.userIconBox}>
              <Text style={styles.usernameInitials}>{!!rowData.DisplayName && rowData.DisplayName.substring(0, 2).toUpperCase()}</Text>
            </View>
          </View>
          <View style={styles.userDetailsBox}>
            <Text style={styles.displayNameText}>{rowData.DisplayName}</Text>
            <Text style={styles.usernameText}>@{rowData.UserName}</Text>
          </View>
        </View>
      </TouchableHighlight>
    )
  }

  onSuggestionTap(username, hidePanel) {
    hidePanel();
    const comment = this.state.value.slice(0, - this.state.keyword.length)
    this.setState({
      ds: this.state.ds.cloneWithRows([]),
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
            ds: this.state.ds.cloneWithRows([...data])
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
        <Text onPress={()=>{ this.setState({value : ""}) }}>Clear textbox</Text>

        <MentionsTextInput
          textInputStyle={{ borderColor: '#ebebeb', borderWidth: 1, padding: 5, fontSize: 15 }}
          textInputMinHeight={35}
          textInputMaxHeight={85}
          returnKeyType={'send'}
          trigger={'@'}
          triggerLocation={'new-word-only'} // 'new-word-only', 'anywhere'
          value={this.state.value}
          onChangeText={(val) => { this.setState({ value: val }) } }
          suggestionsPanelHeight={45}
          renderSuggestionsRow={this.renderSuggestionsRow.bind(this)}
          suggestionsPanelStyle={{ backgroundColor: 'rgba(100,100,100,0.1)' }}
          suggestionsDataSource={this.state.ds}
          triggerCallback={this.callback.bind(this)}
          onKeyPress={(e) => { e.nativeEvent.key == "Enter" ? console.log("ENTER") : false } } />
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
    padding: 5,
    flexDirection: 'row',
    paddingRight: 15,
    paddingBottom: 15,
  },
  userAvatarBox: {
    width: 35,
    paddingTop: 2
  },
  userIconBox: {
    margin: 5,
    height: 25,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3498db'
  },
  usernameInitials: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12
  },
  userDetailsBox: {
    flex: 1,
    margin: 5
  },
  displayName: {
    fontSize: 12,
    fontWeight: '500'
  },
  usernameText: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.6)'
  }
});


AppRegistry.registerComponent('sampleApp', () => sampleApp);
