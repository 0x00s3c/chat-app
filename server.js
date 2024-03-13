const express = require('express');
const path = require('path');
const http = require('http');
const Server  = require('socket.io');
const { MongoClient } = require('mongodb');
const formatMessage = require('./utils/chatMessage');

const dbname = 'chat-app';
const chatCollection = 'chats';
const userCollection = 'onlineUsers';
const port = 5000;
const databaseURI = 'mongodb+srv://epabusiness:GODalmighty888$$$@chat-app.vcmzpba.mongodb.net/';
const app = express();
const server = http.createServer(app);
const io = new Server(server);

io.on('connection', (socket) => {
    console.log('New User Logged In with ID ' + socket.id);

    socket.on('chatMessage', async (data) => {
        try {
            const dataElement = formatMessage(data);
            const client = await MongoClient.connect(databaseURI, { useNewUrlParser: true, useUnifiedTopology: true });
            const db = client.db(dbname);
            const chat = db.collection(chatCollection);
            await chat.insertOne(dataElement);
            socket.emit('message', dataElement);
            const onlineUsers = db.collection(userCollection);
            const recipient = await onlineUsers.findOne({ "name": data.toUser });
            if (recipient) {
                io.to(recipient.ID).emit('message', dataElement);
            }
            client.close();
        } catch (err) {
            console.error(err);
        }
    });

    socket.on('userDetails', async (data) => {
        try {
            const client = await MongoClient.connect(databaseURI, { useNewUrlParser: true, useUnifiedTopology: true });
            const db = client.db(dbname);
            const onlineUser = {
                "ID": socket.id,
                "name": data.fromUser
            };
            const onlineUsers = db.collection(userCollection);
            await onlineUsers.insertOne(onlineUser);
            console.log(onlineUser.name + " is online...");
            const currentCollection = db.collection(chatCollection);
            const chats = await currentCollection.find({
                "from": { "$in": [data.fromUser, data.toUser] },
                "to": { "$in": [data.fromUser, data.toUser] }
            }, { projection: { _id: 0 } }).toArray();
            socket.emit('output', chats);
            client.close();
        } catch (err) {
            console.error(err);
        }
    });

    const userID = socket.id;
    socket.on('disconnect', async () => {
        try {
            const client = await MongoClient.connect(databaseURI, { useNewUrlParser: true, useUnifiedTopology: true });
            const db = client.db(dbname);
            const onlineUsers = db.collection(userCollection);
            const myquery = { "ID": userID };
            await onlineUsers.deleteOne(myquery);
            console.log("User " + userID + " went offline...");
            client.close();
        } catch (err) {
            console.error(err);
        }
    });
});

app.use(express.static(path.join(__dirname, 'front')));

server.listen(port, () => {
    console.log(`Chat Server listening to port ${port}...`);
});
