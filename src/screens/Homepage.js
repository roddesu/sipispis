import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Image, Alert, ActivityIndicator } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';

const Homepage = ({ navigation }) => {
  const [postText, setPostText] = useState('');
  const [posts, setPosts] = useState([]);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const loggedInUser = await AsyncStorage.getItem('loggedInUser');
        if (!loggedInUser) {
          Alert.alert('Not Authenticated', 'Please log in to view posts.');
          navigation.navigate('Login');
          return;
        }
        const user = JSON.parse(loggedInUser);
        setUserId(user.id);
      } catch (error) {
        console.error('Error fetching user:', error);
        Alert.alert('Error', 'There was an issue fetching your login information.');
      }
    };

    fetchUser();
  }, [navigation]);

  useEffect(() => {
    const fetchPosts = async () => {
      if (!userId) return; 
    
      setLoading(true);
      try {
        const response = await axios.get('http://192.168.1.3:3003/get-posts');
        
        if (response.data && Array.isArray(response.data.posts) && response.data.posts.length > 0) {
          setPosts(response.data.posts);
        } else {
          setPosts([]);  
          Alert.alert('No Posts Found', 'There are no posts available at the moment.');
        }
      } catch (error) {
        console.error('Error fetching posts:', error);
        setPosts([]); 
        Alert.alert('Error', 'There was an issue fetching posts. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPosts();
  }, [userId]); 

  const handlePost = async () => {
    if (!postText.trim()) {
      Alert.alert('Empty Post', 'Please write something to post.');
      return;
    }
  
    if (!userId) {
      Alert.alert('Not Logged In', 'Please log in to post.');
      return;
    }
  
    try {
      const response = await axios.post('http://192.168.1.3:3003/create-post', {
        userId,
        content: postText,
      });
  
      if (response.status === 201) {
        setPosts((prevPosts) => [
          { ...response.data.post, comment_count: 1 }, 
          ...prevPosts,
        ]);
        setPostText('');
      } else {
        Alert.alert('Error', 'Something went wrong while posting.');
      }
    } catch (error) {
      console.error('Error posting data:', error);
      Alert.alert('Error', 'There was an issue posting your data.');
    }
  };
  
  const handleLogout = () => {
    Alert.alert('Logged Out', 'You have logged out successfully.');
    AsyncStorage.removeItem('loggedInUser');
    setPosts([]);
    navigation.navigate('Login');
  };

  const handleReply = (postId, postContent) => {
    navigation.navigate('Comment', { postId, post_content: postContent });
  };

  const renderPost = ({ item }) => (
    <View style={styles.singlePostContainer}>
      <View style={styles.postCard}>
        <Text style={styles.postUser}>
          Anonymous • {moment(item.post_created_at).format('MMMM Do YYYY, h:mm:ss a')}
        </Text>
        <Text style={styles.postText}>
          {item.post_content || 'No description available'}
        </Text>
        <Text style={styles.postUpdatedAt}>
          {item.post_updated_at
            ? `Updated at: ${moment(item.post_updated_at).format('MMMM Do YYYY, h:mm:ss a')}`
            : 'No updates'}
        </Text>
        <Text style={styles.commentCount}>
          Comments: {item.comment_count || 0} {/* Ensure comment_count is coming from the backend */}
        </Text>
        <TouchableOpacity style={styles.replyButton} onPress={() => handleReply(item.post_id, item.post_content)}>
          <Text style={styles.replyButtonText}>Reply</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={require('../assets/bmc.png')} style={styles.logo} />
        <Text style={styles.appName}>SafeSpace</Text>
        <View style={styles.profileContainer}>
          <Text style={styles.profileName}>Anonymous</Text>
          <TouchableOpacity onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.postContainer}>
        <TextInput
          style={styles.postInput}
          placeholder="What's on your mind?"
          value={postText}
          onChangeText={setPostText}
          placeholderTextColor="#888"
        />
        <TouchableOpacity style={styles.postButton} onPress={handlePost}>
          <Text style={styles.buttonText}>Post</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#C43D3D" />
        </View>
      ) : posts.length === 0 ? (
        <View style={styles.noPostsContainer}>
          <Text style={styles.noPostsText}>No posts available</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => item.post_id?.toString() || `${item.email}_${item.post_created_at}`}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#757272',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#4D1616',
    padding: 10,
    marginBottom: 20,
    marginTop: 10,
    marginHorizontal: -20,
  },
  logo: {
    width: 40,
    height: 40,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileName: {
    color: '#FFFFFF',
    marginRight: 10,
  },
  logoutText: {
    color: '#C43D3D',
  },
  postContainer: {
    marginBottom: 20,
  },
  postInput: {
    backgroundColor: '#FFFFFF',
    color: '#333',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  postButton: {
    backgroundColor: '#575757',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  singlePostContainer: {
    marginBottom: 20,
  },
  postCard: {
    backgroundColor: '#4D1616',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  postUser: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  postText: {
    color: '#FFFFFF',
    marginTop: 10,
  },
  postUpdatedAt: {
    color: '#AAA',
    marginTop: 5,
  },
  commentCount: {
    color: '#AAA',
    marginTop: 10,
  },
  replyButton: {
    marginTop: 10,
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  replyButtonText: {
    color: '#C43D3D',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noPostsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noPostsText: {
    fontSize: 18,
    color: '#AAA',
    textAlign: 'center',
  },
});

export default Homepage;