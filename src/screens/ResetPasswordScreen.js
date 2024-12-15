import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Alert, ActivityIndicator } from 'react-native';
import axios from 'axios';

const ResetPasswordScreen = ({ route, navigation }) => {
  const { email, token } = route.params; 
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    setLoading(true);

    if (!newPassword || !confirmNewPassword || !email || !token) {
      Alert.alert('Error', 'All fields are required.');
      setLoading(false);
      return;
    }

    if (newPassword !== confirmNewPassword) {
      Alert.alert('Password Error', 'Passwords do not match');
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Password Error', 'Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    const payload = {
      email,
      otp: token, 
      newPassword,
      confirmPassword: newPassword, 
    };

    console.log('Sending Payload:', payload);

    try {
      const response = await axios.post('http://192.168.1.3:3003/reset-password', payload);
      
      if (response.data.success) {
        Alert.alert('Success', response.data.message);
        navigation.navigate('Login');
      } else {
        Alert.alert('Error', response.data.message || 'An unexpected error occurred.');
      }
    } catch (error) {
      console.error('Axios Error:', error); 
      console.error('Response Data:', error.response?.data); 

      if (error.response) {
       
        Alert.alert('Error', error.response.data.message || 'Invalid request. Please check your input.');
      } else if (error.request) {
        
        Alert.alert('Error', 'No response from server. Please check your network connection.');
      } else {
      
        Alert.alert('Error', 'Failed to connect to the server. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image source={require('../assets/bmc.png')} style={styles.logoImage} />
        <Text style={styles.logoText}>University of Batangas</Text>
      </View>

      <Text style={styles.title}>Reset Password</Text>

      <TextInput
        style={styles.input}
        placeholder="New Password"
        placeholderTextColor="#aaa"
        secureTextEntry
        value={newPassword}
        onChangeText={setNewPassword}
      />
      <TextInput
        style={styles.input}
        placeholder="Confirm New Password"
        placeholderTextColor="#aaa"
        secureTextEntry
        value={confirmNewPassword}
        onChangeText={setConfirmNewPassword}
      />

      <TouchableOpacity style={styles.button} onPress={handleResetPassword} disabled={loading}>
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.buttonText}>RESET PASSWORD</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.footer}>
          Remember your password? <Text style={styles.link}>Log in</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#757272' },
  logoContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  logoImage: { width: 50, height: 50, marginRight: 10 },
  logoText: { fontSize: 26, fontWeight: 'bold', color: '#fff' },
  title: { fontSize: 18, color: '#fff', marginBottom: 20 },
  input: { width: '80%', backgroundColor: '#4D1616', padding: 15, borderRadius: 10, color: '#fff', marginBottom: 10 },
  button: { backgroundColor: '#e63946', padding: 15, borderRadius: 10, width: '80%', alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  footer: { marginTop: 20, color: '#ccc' },
  link: { color: '#87ceeb', textDecorationLine: 'underline' },
});

export default ResetPasswordScreen;
