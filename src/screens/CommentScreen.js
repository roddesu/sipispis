import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Alert, FlatList, ActivityIndicator } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';

const CommentScreen = ({ route, navigation }) => {
  const { postId, post_content, post_created_at } = route.params; 
  const [commentText, setCommentText] = useState('');
  const [userId, setUserId] = useState(null);
  const [comments, setComments] = useState([]); 
  const [loading, setLoading] = useState(false); 
  const [posting, setPosting] = useState(false); 

  const fetchUserId = async () => {
    try {
      const loggedInUser = await AsyncStorage.getItem('loggedInUser');
      if (loggedInUser) {
        const user = JSON.parse(loggedInUser);
        setUserId(user.id);
      } else {
        Alert.alert('Not Logged In', 'Please log in to post a comment.');
        navigation.navigate('Login');
      }
    } catch (error) {
      console.error('Error fetching user from AsyncStorage:', error);
      Alert.alert('Error', 'An error occurred while checking your login status.');
    }
  };

  const fetchComments = async () => {
    setLoading(true);
    try {
      const cachedComments = await AsyncStorage.getItem(`comments_${postId}`);
      console.log('Cached comments:', cachedComments);
  
      if (cachedComments) {
        setComments(JSON.parse(cachedComments));
      }
  
      const response = await axios.get(`http://192.168.1.3:3003/get-comments/${postId}`);
      if (response.status === 200) {
        console.log('Fetched comments:', response.data.comments);
        setComments(response.data.comments);
  
        await AsyncStorage.setItem(`comments_${postId}`, JSON.stringify(response.data.comments));
      } else {
        Alert.alert('Error', 'Post not found or no comments available for this post.');
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      Alert.alert('Error', 'There was an issue fetching comments. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
 
  const addCommentToUI = (comment) => {
    setComments((prevComments) => [comment, ...prevComments]);
  };

  const handleCommentSubmission = async () => {
    if (!commentText.trim()) {
      Alert.alert('Empty Comment', 'Please write a comment before submitting.');
      return;
    }
  
    if (!userId) {
      Alert.alert('Not Logged In', 'Please log in to comment.');
      return;
    }
  
    setPosting(true);
  
    try {
      const response = await axios.post('http://192.168.1.10:3003/create-comment', {
        postId,
        userId,
        comment: commentText,
      });
  
      if (response.status === 201) {
        Alert.alert('Comment Posted', 'Your comment has been posted.');
        setCommentText(''); 

        const newComment = {
          comment_id: response.data.comment.id, 
          content: commentText,
          created_at: new Date().toISOString(),
        };
  
        addCommentToUI(newComment);
  
        const updatedComments = [newComment, ...comments];
        await AsyncStorage.setItem(`comments_${postId}`, JSON.stringify(updatedComments));
  
        fetchComments();
      } else {
        Alert.alert('Error', 'There was an issue posting your comment. Please try again later.');
      }
    } catch (error) {
      console.error('Error posting comment:', error.response ? error.response.data : error.message);
      Alert.alert('Error', error.response ? error.response.data.message : 'There was an issue posting your comment.');
    } finally {
      setPosting(false);
    }
  };
  
  
  useEffect(() => {
    fetchUserId();
    fetchComments(); 
  }, []);

  const CommentItem = React.memo(({ comment }) => {
    console.log('Rendering comment:', comment); 
    return (
      <View style={styles.commentContainer}>
        <Text style={styles.commentText}>{comment.content || 'No content'}</Text>
        <Text style={styles.commentDate}>
          {moment(comment.created_at).format('MMMM Do YYYY, h:mm:ss a')}
        </Text>
      </View>
    );
  });
  
  return (
    <View style={styles.container}>
      {/* Display the post details */}
      <View style={styles.postDetailsContainer}>
        <Text style={styles.postUser}>
          {/* Ensure strings are wrapped inside Text */}
          {`Anonymous • ${moment(post_created_at).format('MMMM Do YYYY, h:mm:ss a')}`}
        </Text>
      </View>

      {/* Display the original post content */}
      <View style={styles.originalPostContainer}>
        <Text style={styles.originalPostText}>
          {/* Wrap the post content inside Text component */}
          {post_content ? post_content : 'No content available'}
        </Text>
      </View>

      {/* Input for the user to write their comment */}
      <TextInput
        style={styles.commentInput}
        placeholder="Write your comment here..."
        value={commentText}
        onChangeText={setCommentText}
        placeholderTextColor="#888"
      />

      {/* Button to post the comment */}
      <TouchableOpacity style={styles.commentButton} onPress={handleCommentSubmission}>
        {posting ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Post Comment</Text>
        )}
      </TouchableOpacity>

      {/* Display the list of comments */}
      {loading ? (
        <ActivityIndicator size="large" color="#fff" />
      ) : (
        <FlatList
          data={comments} 
          renderItem={({ item }) => {
            console.log('Rendering comment:', item); 
            return <CommentItem comment={item} />;
          }}
          keyExtractor={(item) => item.comment_id.toString()} 
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
    paddingTop: 30,
  },
  postDetailsContainer: {
    marginBottom: 15,
    paddingHorizontal: 15,
    marginTop: 20,
  },
  postUser: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  originalPostContainer: {
    backgroundColor: '#4D1616',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    paddingHorizontal: 15,
  },
  originalPostText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  commentInput: {
    backgroundColor: '#FFFFFF',
    color: '#333',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  commentButton: {
    backgroundColor: '#575757',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  commentsList: {
    marginTop: 20,
  },
  commentContainer: {
    backgroundColor: '#333',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  commentText: {
    color: '#FFFFFF', // Make sure text is visible
    fontSize: 16,
  },
  commentDate: {
    color: '#AAA',
    fontSize: 12,
    marginTop: 5,
    textAlign: 'right',
  },
});

export default CommentScreen;
