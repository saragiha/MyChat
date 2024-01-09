import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Image, StyleSheet, Linking, Alert, ActivityIndicator} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import axios from 'axios';
import { io } from 'socket.io-client';

const App = () => {
  const [fileUri, setFileUri] = useState(null);
  const [fileList, setFileList] = useState([]);
  const [message, setMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [username, setUsername] = useState('');
  const [serverIP, setServerIP] = useState('');
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedMessageIndex, setSelectedMessageIndex] = useState(null);
  const [isPopupVisible, setPopupVisibility] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const togglePopup = () => {
    setPopupVisibility(!isPopupVisible);
  };

  useEffect(() => {
    let isSocketConnected = false;
  
    if (serverIP && !socket && isSocketConnected) {
      const newSocket = io(`http://${serverIP}:3000`);
      setSocket(newSocket);
  
      newSocket.on('file_uploaded', (data) => {
        handleFileUploaded(data);
      });
  
      newSocket.on('chat_message', (message) => {
        setChatMessages((prevMessages) => [...prevMessages, message]);
      });
  
      isSocketConnected = true;
  
      alert('Connected to server successfully!');
    }
  
    return () => {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        isSocketConnected = false;
      }
    };
  }, [serverIP, socket]);
  


  const saveChatToServer = async () => {
    togglePopup();
    try {
      const response = await axios.post(`http://${serverIP}:3000/saveChat`, {
        chat: chatMessages,
      });
      console.log(response.data);
      alert('Chat Berhasil Disimpan!');
    } catch (error) {
      console.error(error);
      alert('Failed to save chat to server.');
    }
  };
  
  const getChatFromServer = async () => {
    togglePopup();
    try {
      const response = await axios.get(`http://${serverIP}:3000/getChat`);
      setChatMessages(response.data);
      alert('Chat Berhasil Diambil dari database!');
    } catch (error) {
      console.error(error);
      alert('Failed to get chat from server.');
    }
  };  
  
  const handleLongPress = (index) => {
    setSelectedMessageIndex(index);
  };

  const handleConnect = () => {
    try {
      if (!username.trim() || !serverIP.trim()) {
        Alert.alert('Validation Error', 'Username dan server IP jangan kosong oi.');
        return;
      }
  
      if (serverIP && !socket) {
        const newSocket = io(`http://${serverIP}:3000`);
  
        newSocket.on('file_uploaded', (data) => {
          handleFileUploaded(data);
        });
  
        newSocket.on('chat_message', (message) => {
          setChatMessages((prevMessages) => [...prevMessages, message]);
        });
  
        newSocket.on('connect', () => {
          setSocket(newSocket);
          setIsConnected(true); 
          Alert.alert('Connection Successful', 'You are now connected to the server.');
        });
  
        newSocket.on('disconnect', () => {
          setSocket(null);
          setIsConnected(false);
          Alert.alert('Connection Error', 'Failed to connect to the server. Please check the server IP.');
        });
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Connection Error', 'Failed to connect to the server. Please check the server IP.');
    }
  };
  

  const handleUpload = async () => {
    try {
      setLoading(true);
  
      const result = await DocumentPicker.getDocumentAsync();
  
      if (!result.cancelled) {
        const selectedFile = result.assets[0];
        setFileUri(selectedFile.uri);
  
        const formData = new FormData();
        const uriParts = selectedFile.uri.split('.');
        const fileType = uriParts[uriParts.length - 1];
        const newFileName = `file_${Date.now()}.${fileType}`;
  
        formData.append('file', {
          uri: selectedFile.uri,
          name: newFileName,
          type: `application/${fileType}`,
        });
  
        formData.append('username', username);
  
        const response = await axios.post(`http://${serverIP}:3000/upload`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
  
        console.log(response.data);
        alert('File uploaded successfully!');
      } else {
        console.log('Dokumen tidak dipilih');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan saat memilih atau mengunggah dokumen.');
    } finally {
      setLoading(false);
    }
  };
  
  const downloadFile = async (file) => {
    try {
      if (file && file.filename) {
        const url = `http://${serverIP}:3000/uploads/${file.filename}`;
        const supported = await Linking.canOpenURL(url);
  
        if (supported) {
          await Linking.openURL(url);
        } else {
          Alert.alert('Download Error', 'Cannot open the file.');
        }
      } else {
        Alert.alert('Download Error', 'File information is missing.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Download Error', 'Failed to download the file.');
    }
  };  

  const handleFileUploaded = (data) => {
    const { filename, username, file_type } = data;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
    if (file_type && (file_type.startsWith('.png') || file_type.startsWith('.jpg') || file_type.startsWith('.jpeg') || file_type.startsWith('.webp'))) {
      setChatMessages((prevMessages) => [
        ...prevMessages,
        { username, message: `Sent an image: ${filename}`, isImage: true, imageUri: `http://${serverIP}:3000/uploads/${filename}`, fileInfo: { filename }, timestamp },
      ]);
    } else {
      setChatMessages((prevMessages) => [
        ...prevMessages,
        { username, message: `Sent a file: ${filename}`, isFile: true, fileInfo: { filename }, timestamp },
      ]);
    }
  };
  
  const handleDeleteMessage = () => {
    if (selectedMessageIndex !== null) {
      const updatedMessages = [...chatMessages];
      updatedMessages.splice(selectedMessageIndex, 1);
      setChatMessages(updatedMessages);
      setSelectedMessageIndex(null);
    }
  };  

  const sendMessage = () => {
    if (message.trim() !== '') {
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      socket.emit('chat_message', { message, username, timestamp });
      setMessage('');
    }
  };
  

const getUsernameColor = (username) => {
  const hash = username.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
  const hue = hash % 360;
  return `hsl(${hue}, 50%, 70%)`;
};

  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
      <Text style={styles.titleText}>ChatAppku</Text>
      
    </View>
    <View style={styles.connectionContainer}>
    <TextInput
      style={styles.input}
      placeholder="Enter username"
      value={username}
      onChangeText={(text) => setUsername(text)}
      editable={!socket}
    />
    <TextInput
      style={styles.input}
      placeholder="Enter server IP"
      value={serverIP}
      onChangeText={(text) => setServerIP(text)}
      editable={!socket}
    />

      <TouchableOpacity onPress={handleConnect} style={styles.iconButton}>
        <FontAwesome name="plug" size={20} color="white" />
      </TouchableOpacity>
    </View>

    <ScrollView style={styles.chatContainer}>
      {chatMessages.map((msg, index) => (
       <TouchableOpacity 
       key={index} 
       onLongPress={() => handleLongPress(index)}
       style={msg.isImage ? styles.imageMessageContainer : styles.messageContainer}
     >
         <View style={msg.isImage ? styles.imageMessageContainer : styles.messageContainer}>
          <Text style={[msg.isImage ? styles.imageMessageText : styles.messageText, { color: getUsernameColor(msg.username) }]}>
            {msg.username}
          </Text>
          <Text style={msg.isImage ? styles.imageMessageText : styles.messageText}>
            {msg.message}
          </Text>
          {msg.timestamp && (
            <Text style={styles.timestampText}>{msg.timestamp}</Text>
          )}
          {msg.isImage && (
            <View style={styles.imageContainer}>
              <Image source={{ uri: msg.imageUri }} style={styles.image} />
              <TouchableOpacity onPress={() => downloadFile(msg.fileInfo)} style={styles.downloadButton}>
                <FontAwesome name="download" size={16} color="white" />
              </TouchableOpacity>
            </View>
          )}
          {msg.isFile && (
            <TouchableOpacity onPress={() => downloadFile(msg.fileInfo)} style={styles.downloadButton}>
              <FontAwesome name="download" size={16} color="white" />
            </TouchableOpacity>
          )}
        </View>
        </TouchableOpacity>
      ))}
     
    </ScrollView>
    <TouchableOpacity
      onPress={togglePopup}
      style={styles.popupToggleButton}
      disabled={!isConnected}
    >
      <FontAwesome name="ellipsis-v" size={20} color="white" />
    </TouchableOpacity>
      {isPopupVisible && (
        <View style={styles.popupContainer}>
          <TouchableOpacity onPress={saveChatToServer} style={styles.popupButton}>
            <FontAwesome name="upload" size={20} color="white" />
          </TouchableOpacity>

          <TouchableOpacity onPress={getChatFromServer} style={styles.popupButton}>
            <FontAwesome name="download" size={20} color="white" />
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            value={message}
            onChangeText={(text) => setMessage(text)}
          />
          <TouchableOpacity onPress={sendMessage} style={styles.iconButton}>
            <FontAwesome name="send" size={20} color="white" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={handleUpload} style={styles.iconButton}>
          {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <FontAwesome name="upload" size={20} color="white" />
            )}
        </TouchableOpacity>

        {selectedMessageIndex !== null && (
          <TouchableOpacity onPress={handleDeleteMessage} style={styles.deleteButton}>
            <FontAwesome name="trash" size={20} color="white" />
          </TouchableOpacity>
        )}
      </View>
      
  );
};


const styles = StyleSheet.create({
  chatContainer: {
    flex: 1,
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  imageMessageContainer: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignSelf: 'flex-start',
    marginVertical: 5,
    maxWidth: '80%',
  },
  messageText: {
    fontSize: 16,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    resizeMode: 'cover',
    marginVertical: 10,
  },
  titleContainer: {
    backgroundColor: 'blue',
    padding: 10,
    alignItems: 'center',
  },
  titleText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    paddingTop:20
  },
  connectionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 5,
    marginBottom: 10,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    
  },
  input: {
    flex: 1,
    marginRight: 10,
    padding: 8,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 5,
  },
  connectButton: {
    backgroundColor: 'blue',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  messageContainer: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  sendButton: {
    backgroundColor: 'blue',
    padding: 10,
    borderRadius: 5,
    marginLeft: 10,
  },
  uploadButton: {
    backgroundColor: 'green',
    padding: 10,
    borderRadius: 5,
    margin: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
  },
  image: {
    width: 200,
    height: 200,
    resizeMode: 'cover',
    marginVertical: 10,
  },
  iconButton: {
    backgroundColor: 'blue',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageText: {
    fontSize: 16,
  },
  imageMessageText: {
    fontSize: 16,
    marginBottom: 10,
  },
  imageContainer: {
    position: 'relative',
  },
  downloadButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'purple',
    padding: 8,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timestampText: {
    color: 'gray',
    fontSize: 12,
    marginTop: 5,
  },
  deleteButton: {
    backgroundColor: 'red',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 200,
    right: 8,
  },
  uploadButtonn: {
    backgroundColor: 'green',
    padding: 10,
    borderRadius: 5,
    margin: 10,
    alignItems: 'center',
  },
  downloadButtonn: {
    backgroundColor: 'purple',
    padding: 10,
    borderRadius: 5,
    margin: 10,
    alignItems: 'center',
  },
  popupToggleButton: {
    position: 'absolute',
    top: 400,
    right: 20,
    backgroundColor: 'blue',
    padding: 10,
    borderRadius: 5,
  },
  popupContainer: {
    position: 'absolute',
    top: '50%',
    right: '50%',
    transform: [{ translateX: 50 }, { translateY: -50 }],
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 10,
    borderRadius: 5,
    flexDirection: 'column',
    alignItems: 'center',
  },
  popupButton: {
    backgroundColor: 'green',
    padding: 10,
    borderRadius: 5,
    margin: 5,
  },
});

export default App;
